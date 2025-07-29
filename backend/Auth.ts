import { Router, Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { v4 } from 'uuid';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import bodyParser from 'body-parser';
import { controllerWrapper } from '../utils/controllerWrapper';
import { appConfig } from '../config/app';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { ResetToken } from '../models/ResetToken';
import { Op } from 'sequelize';
import { middlewareWrapper } from '../utils/middlewareWrapper';
import verifySession, { addToBlacklist } from '../middleware/Verify';

const router = Router();

router.use(bodyParser.json());

let transporter: nodemailer.Transporter;

async function setupTransporter() {
  if (process.env.NODE_ENV !== 'production') {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  } else {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
      }
    });
  }
}

router.post('/forgot-password', controllerWrapper(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new Error('Email is required');
  }

  const user = await User.findOne({ where: { email } });

  if (!user) {
    return {
      message: 'If an account with that email exists, we have sent a password reset code'
    };
  }

  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

  await ResetToken.destroy({ where: { userId: user.id } });

  await ResetToken.create({
    id: uuidv4(),
    userId: user.id,
    token: resetCode,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000)
  });

  await sendResetEmail(user.email, resetCode);

  if (process.env.NODE_ENV !== 'production') {
    console.log('Check email at: https://ethereal.email/messages');
  }

  return {
    message: 'If an account with that email exists, we have sent a password reset code'
  };
}));

router.post('/reset-password', controllerWrapper(async (req, res) => {
  const { email, resetCode, newPassword } = req.body;

  if (!email || !resetCode || !newPassword) {
    throw new Error('Email, reset code, and new password are required');
  }

  // Find user by email
  const user = await User.findOne({ where: { email } });

  if (!user) {
    res.locals.errorCode = 400;
    throw new Error('Invalid reset information');
  }

  const token = await ResetToken.findOne({
    where: {
      userId: user.id,
      token: resetCode,
      expiresAt: { [Op.gt]: new Date() }
    }
  });

  if (!token) {
    res.locals.errorCode = 400;
    throw new Error('Invalid or expired reset code');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  user.password = hashedPassword;
  await user.save();

  await token.destroy();

  return {
    message: 'Password has been reset successfully'
  };
}
));

router.post('/register', controllerWrapper(async (req, res, next) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    throw new Error('Username, password, and email are required');
  }

  const existingUser = await User.findOne({ where: { username } });
  const existingEmail = await User.findOne({ where: { email } });

  if (existingUser) {
    throw new Error('Username already exists');
  }

  if (existingEmail) {
    throw new Error('Email already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await User.create({
    id: v4(),
    username,
    password: hashedPassword,
    email,
  });

  return {
    message: 'User registered successfully',
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
    }
  };
}));

router.post('/login', controllerWrapper(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new Error('Invalid credentials');
  }

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name
    },
    appConfig.jwtSecret,
    { expiresIn: '1h' }
  );
  
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name || user.username
    },
    expiresAt: expiresAt.toISOString()
  };
}));

router.get('/session', verifySession, controllerWrapper(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    throw new Error('No token provided');
  }

  // Verify the JWT token - this checks both signature and expiration
  const decoded = jwt.verify(token, appConfig.jwtSecret) as {
    id: string;
    email: string;
    name?: string;
  };

  const user = await User.findByPk(decoded.id, {
    attributes: ['id', 'email', 'name', 'profilePicture', 'username', 'role']
  });

  if (!user) {
    throw new Error('User not found');
  }

  return {
    message: 'Session is valid',
    user
  };

}));

router.post('/logout', controllerWrapper(async (req, res) => {
  // Get the authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (token) {
    await addToBlacklist(token, '1h');
  }

  return {
    message: 'Logged out successfully'
  };
}));

if (process.env.NODE_ENV !== 'production') {
  router.get('/dev/reset-code', controllerWrapper(async (req, res) => {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      throw new Error('Email parameter is required');
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return { code: null };
    }

    const token = await ResetToken.findOne({
      where: { userId: user.id },
      order: [['createdAt', 'DESC']]
    });

    return {
      code: token?.token || null
    };
  }));
}

// Helper function to send reset email
async function sendResetEmail(email: string, resetCode: string) {
  if (!transporter) {
    await setupTransporter();
  }

  const mailOptions = {
    from: '"Meme Gang" <reset@memegang.com>',
    to: email,
    subject: 'Reset Your Password - Meme Gang',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #1a1a1a; padding: 20px; text-align: center; color: white;">
          <h1 style="margin: 0;">Meme Gang</h1>
        </div>
        <div style="padding: 20px; background-color: white; border-radius: 4px; margin-top: 20px;">
          <h2>Reset Your Password</h2>
          <p>You requested a password reset for your Meme Gang account.</p>
          <p>Your verification code is:</p>
          <div style="background-color: #f0f0f0; padding: 10px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; margin: 20px 0; border-radius: 4px;">
            ${resetCode}
          </div>
          <p>This code will expire in 1 hour.</p>
          <p>If you didn't request this reset, please ignore this email.</p>
        </div>
      </div>
    `
  };

  const info = await transporter.sendMail(mailOptions);

  // For development - log email URL
  if (process.env.NODE_ENV !== 'production') {
    console.log('Email preview URL:', nodemailer.getTestMessageUrl(info));
  }

  return info;
}

export default router;