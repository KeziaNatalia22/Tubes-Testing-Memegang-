import { Router, Request, Response } from 'express';
import { Op } from 'sequelize';
import { User } from '../models/User';
import bcrypt from 'bcrypt';
import multer from 'multer';
import fs from 'fs';
import bodyParser from 'body-parser';
import authMiddleware from '../middleware/Auth';
import { controllerWrapper } from '../utils/controllerWrapper';
import { Post } from '../models/Post';
import { Comment } from '../models/Comment';
import { appConfig } from '../config/app';
import jwt from 'jsonwebtoken';
import { buildPostWithAllData} from './FetchPostData';

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string,
                username: string,
                email: string,
            };
            uploadedFile?: { filename: string };
        }
    }
}

const router = Router();
router.use(bodyParser.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/ProfilePictures';
        console.log('Destination directory:', uploadDir);
        if (!fs.existsSync(uploadDir)) {
            console.log('Directory does not exist. Creating:', uploadDir);
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir); // Directory to store uploaded files
    },
    filename: (req, file, cb) => {
        const filename = `${Date.now()}-${file.originalname}`;
        console.log('Generated filename:', filename);
        cb(null, filename);
    },
});
const upload = multer({ storage });

// Endpoint to retrieve a user by ID
router.get('/me', authMiddleware, controllerWrapper(async (req: Request, res: Response) => {
    const { id } = req.user ?? {};
    if (!id) {
        res.locals.errorCode = 401;
        throw new Error('Unauthorized: User not authenticated');
    }
    const user = await User.findByPk(id);

    if (!user) {
        res.locals.errorCode = 404;
        throw new Error('User not found');
    }

    const baseUrl = '../../';
    const profilePictureUrl = user.profilePicture
        ? `${baseUrl}${user.profilePicture}`
        : null;

    return {
        id: user.id,
        name: user.name,
        bio: user.bio,
        profilePicture: profilePictureUrl,
        username: user.username,
        email: user.email,
        role: user.role,
    };
}));

// Endpoint to update profile
router.put('/edit-profile', authMiddleware, controllerWrapper(async (req: Request, res: Response) => {
    const { id } = req.user ?? {};
    if (!id) {
        res.locals.errorCode = 401;
        throw new Error('Unauthorized: User not authenticated');
    }

    const { name, bio } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
        res.locals.errorCode = 404;
        throw new Error('User not found');
    }

    user.name = name || user.username;
    user.bio = bio || user.bio;

    await user.save();
    
    return {
        message: 'Profile updated successfully',
        user: {
            id: user.id,
            name: user.name,
            bio: user.bio
        }
    };
}));

// Endpoint to update account details
router.put('/edit-account', authMiddleware, controllerWrapper(async (req: Request, res: Response) => {
    const { id } = req.user ?? {};
    if (!id) {
        res.locals.errorCode = 401;
        throw new Error('Unauthorized: User not authenticated');
    }

    const { email, username } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
        res.locals.errorCode = 404;
        throw new Error('User not found');
    }

    if (email) {
        const emailExists = await User.findOne({ where: { email, id: { [Op.ne]: id } } });
        if (emailExists) {
            res.locals.errorCode = 400;
            throw new Error('Email is already in use by another account');
        }
        user.email = email;
    }

    if (username) {
        const usernameExists = await User.findOne({ where: { username, id: { [Op.ne]: id } } });
        if (usernameExists) {
            res.locals.errorCode = 400;
            throw new Error('Username is already in use by another account');
        }
        user.username = username;
    }

    await user.save();
    
    return {
        message: 'Account updated successfully',
        user: {
            id: user.id,
            username: user.username,
            email: user.email
        }
    };
}));

// Endpoint to change password
router.post('/change-password', authMiddleware, controllerWrapper(async (req: Request, res: Response) => {
    const { id } = req.user ?? {};
    if (!id) {
        res.locals.errorCode = 401;
        throw new Error('Unauthorized: User not authenticated');
    }

    const user = await User.findByPk(id);
    if (!user) {
        res.locals.errorCode = 404;
        throw new Error('User not found');
    }

    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
        res.locals.errorCode = 400;
        throw new Error('Old password and new password are required');
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
        res.locals.errorCode = 400;
        throw new Error('Old password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return {
        message: 'Password changed successfully'
    };
}));

router.get('/:username/post', controllerWrapper(async (req, res) => {
    const { username } = req.params;

    const token = req.headers.authorization?.split(' ')[1];

    let userId = null;
    
    if (token) {
        const decoded = jwt.verify(token, appConfig.jwtSecret);
        userId = decoded.id;
    }

    const user = await User.findOne({ where: { username } });
    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    const posts = await Post.findAll({
        where: { user_id: user.id },
        order: [['createdAt', 'DESC']],
    });

    return await buildPostWithAllData(posts, userId);
}));

router.get('/:username/comment', controllerWrapper(async (req, res) => {
    const { username } = req.params;
    const user = await User.findOne({ where: { username } });
    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return
    }
    const comments = await Comment.findAll({
        where: { user_id: user.id },
        order: [['createdAt', 'DESC']],
    });
    return comments;
}));

router.get('/:username', controllerWrapper(async (req, res) => {
    const { username } = req.params;
    const user = await
    User.findOne({
            where: { username },
            attributes: ['id', 'username', 'name', 'bio', 'profilePicture'],
        });
    if (!user) {
        res.locals.errorCode = 404;
        throw new Error('User not found');
    }
    const baseUrl = '../../';
    const profilePictureUrl = user.profilePicture
        ? `${baseUrl}${user.profilePicture}`
        : null;
    return {
        id: user.id,
        username: user.username,
        name: user.name,
        bio: user.bio,
        profilePicture: profilePictureUrl,
    };
}
));

export default router;