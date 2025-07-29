// Script untuk mengubah role user menjadi admin untuk testing
// Jalankan di console database atau gunakan endpoint khusus

/*
UPDATE Users SET role = 'admin' WHERE email = 'email_user@example.com';
*/

// Atau buat endpoint sementara di backend untuk testing:
import express from 'express';
import { User } from '../models/User';
import { controllerWrapper } from '../utils/controllerWrapper';

const testRouter = express.Router();

// HANYA UNTUK TESTING - HAPUS SETELAH DEVELOPMENT
testRouter.post('/make-admin', controllerWrapper(async (req) => {
  const { email } = req.body;
  
  if (!email) {
    throw new Error('Email is required');
  }
  
  const user = await User.findOne({ where: { email } });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  user.role = 'admin';
  await user.save();
  
  return {
    message: `User ${email} is now an admin`,
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    }
  };
}));

export default testRouter;

// Tambahkan di app.ts:
// app.use('/test', testRouter);
