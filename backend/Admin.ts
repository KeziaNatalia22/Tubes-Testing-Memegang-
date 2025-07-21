import express, { Request, Response } from 'express';
import { User } from '../models/User';
import authMiddleware from '../middleware/Auth';
import { controllerWrapper } from '../utils/controllerWrapper';

const router = express.Router({ mergeParams: true });

export default router;
