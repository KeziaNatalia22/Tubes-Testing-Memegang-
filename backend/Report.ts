import express, { Request, Response } from 'express';
import authMiddleware from '../middleware/Auth';
import { controllerWrapper } from '../utils/controllerWrapper';
import { Report } from '../models/Report';
import { Post } from '../models/Post';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

router.post(
  '/:postId',
  authMiddleware,
  controllerWrapper(async (req: Request, res: Response) => {
    const { postId } = req.params;
    const { reason, comment } = req.body;
    const user_id = req.user!.id;

    // Validate reason
    const validReasons = [
      'spam',
      'harassment',
      'hate_speech',
      'nudity',
      'misinformation',
      'other',
    ];
    if (!validReasons.includes(reason)) {
      res.locals.errorCode = 400;
      throw new Error('Invalid report reason');
    }

    const post = await Post.findByPk(postId);
    if (!post) {
      res.locals.errorCode = 404;
      throw new Error('Post not found');
    }

    // Check if user already reported this post
    const existingReport = await Report.findOne({
      where: {
        post_id: postId,
        user_id,
      },
    });

    if (existingReport) {
      res.locals.errorCode = 409; // Conflict
      throw new Error('You have already reported this post');
    }

    const report = await Report.create({
      id: uuidv4(),
      post_id: postId,
      user_id,
      reason,
      comment,
      status: 'pending',
    });

    return res.status(201).json({ message: 'Report submitted', report });
  })
);

router.get(
  '/check/:postId',
  authMiddleware,
  controllerWrapper(async (req: Request, res: Response) => {
    const { postId } = req.params;
    const user_id = req.user!.id;

    const existingReport = await Report.findOne({
      where: {
        post_id: postId,
        user_id,
      },
    });

    return res.status(200).json({ hasReported: !!existingReport });
  })
);


export default router;
