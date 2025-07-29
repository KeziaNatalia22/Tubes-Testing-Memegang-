import express, { Request, Response } from 'express';
import { User } from '../models/User';
import { Post } from '../models/Post';
import { Report } from '../models/Report';
import { controllerWrapper } from '../utils/controllerWrapper';
import authMiddleware from '../middleware/Auth';
import adminMiddleware from '../middleware/AdminAuth';

const router = express.Router({ mergeParams: true });

// GET /admin/reports - Fetch all reported posts with status 'pending'
router.get('/report', authMiddleware, adminMiddleware, controllerWrapper(async (req: Request, res: Response) => {
  try {
    const reports = await Report.findAll({
      where: { status: 'pending' },
      include: [
        {
          model: Post,
          as: 'post',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email', 'profilePicture']
            }
          ]
        },
        {
          model: User,
          as: 'user', // reporter
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const transformedReports = reports.map(report => ({
      id: report.id,
      post_id: report.post_id,
      user_id: report.user_id,
      reason: report.reason,
      comment: report.comment,
      status: report.status,
      created_at: report.createdAt,
      post: {
        id: report.post.id,
        title: report.post.title,
        image_url: report.post.image_url,
        user_id: report.post.user_id,
        name: report.post.user?.name || 'Unknown User',
        profilePicture: report.post.user?.profilePicture || '',
        createdAt: report.post.createdAt,
        commentsCount: 0,
        upvotes: 0,
        downvotes: 0,
        tags: report.post.tags || []
      },
      reporter: {
        id: report.user.id,
        name: report.user.name,
        email: report.user.email
      }
    }));

    res.json(transformedReports);
  } catch (error) {
    console.error('Error fetching reported posts:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}));

// PUT /admin/reports/:reportId - Update report status: approve (delete post) or reject
router.put('/report/:reportId', authMiddleware, adminMiddleware, controllerWrapper(async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const { action } = req.body; // 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Use "approve" or "reject".' });
    }

    const report = await Report.findByPk(reportId, {
      include: [{ model: Post, as: 'post' }]
    });

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    if (report.status !== 'pending') {
      return res.status(400).json({ message: 'Report is not pending.' });
    }

    const sequelize = Report.sequelize;
    const transaction = await sequelize!.transaction();

    try {
      if (action === 'approve') {
        // Mark report as resolved
        await report.update({ status: 'resolved', updatedAt: new Date() }, { transaction });

        // Delete the reported post
        if (report.post) {
          await report.post.destroy({ transaction });
        }

        await transaction.commit();
        res.json({
          message: 'Report approved. Post has been removed.',
          action: 'approved',
          reportId: report.id,
          postId: report.post_id
        });
      } else {
        // Reject the report
        await report.update({ status: 'dismissed', updatedAt: new Date() }, { transaction });

        await transaction.commit();
        res.json({
          message: 'Report rejected. Post remains active.',
          action: 'rejected',
          reportId: report.id
        });
      }
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error processing report:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}));

export default router;
