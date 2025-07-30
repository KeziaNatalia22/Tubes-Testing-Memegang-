import express, { Request, Response } from 'express';
import { Report } from '../models/Report';
import { Post } from '../models/Post';
import { User } from '../models/User';
import { countVotes, countComments, fetchTagName, fetchUserData, buildPostWithAllData} from './FetchPostData';
import { Votes } from '../models/Votes';


const router = express.Router();

// GET /admin/reports

// GET /admin/reports
router.get('/reports', async (req: Request, res: Response) => {
  try {
    const reports = await Report.findAll({
      where: { status: 'pending' },
      include: [
        {
          model: User,
          as: 'reporter',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const formattedReports = await Promise.all(
      reports.map(async (report: any) => {
        const post = await Post.findByPk(report.post_id);
        if (!post) return null;

        const votesCount = await countVotes(post.id);
        const commentCount = await countComments(post.id);
        const tagsName = await fetchTagName(post.id);
        const postOwner = await fetchUserData(post.user_id);

        const voteState = await Votes.findOne({
          where: { post_id: post.id, user_id: report.user_id }, // user yang report
        });

        return {
          id: report.id,
          post_id: report.post_id,
          user_id: report.user_id,
          reason: report.reason,
          comment: report.comment,
          status: report.status,
          created_at: report.createdAt,
          reporter: report.reporter,
          post: {
            ...post.toJSON(),
            ...votesCount,
            commentsCount: commentCount,
            tags: tagsName,
            is_upvoted: voteState?.is_upvote ?? null,
            userIdOwnerPost: postOwner?.id ?? null,
            name: postOwner?.username ?? null,
            profilePicture: postOwner?.profilePicture ?? null,
          },
        };
      })
    );

    const filteredReports = formattedReports.filter(r => r !== null); // buang yg null kalau postnya ga ada
    res.json(filteredReports);
  } catch (error) {
    console.error('Failed to fetch reports:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /admin/reports/:id
router.put('/reports/:id', async (req: Request, res: Response) => {
  const reportId = req.params.id;
  const { action } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Use "approve" or "reject".' });
  }

  try {
    const report = await Report.findByPk(reportId, {
      include: [{ model: Post, as: 'post' }]
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Set status
    report.status = action === 'approve' ? 'resolved' : 'dismissed';
    await report.save();

    // Jika disetujui dan post masih ada, hapus post-nya
    if (action === 'approve') {
      if (report.post) {
        // Delete semua report yang terkait post ini (atau yang statusnya pending)
        await Report.destroy({ where: { post_id: report.post.id } });
        await report.post.destroy();
      } else {
        console.warn(`Post for report ${reportId} not found when trying to delete`);
      }
    }

    res.json({ message: `Report has been ${action === 'approve' ? 'resolved and post deleted' : 'dismissed'}` });
  } catch (error) {
    console.error('Failed to update report:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;