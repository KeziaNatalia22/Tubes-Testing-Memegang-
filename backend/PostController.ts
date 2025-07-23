import { Request, Response, Router } from 'express';
import { Post } from '../models/Post';
import { Comment } from '../models/Comment';
import { Tag } from '../models/Tag';
import { Votes } from '../models/Votes';
import { PostTag } from '../models/PostTags';
import multer from 'multer';
import authMiddleware from '../middleware/Auth';
import { controllerWrapper } from '../utils/controllerWrapper';
import { v4 } from 'uuid';
import { Op } from 'sequelize';
import { countVotes, countComments, fetchTagName, fetchUserData, buildPostWithAllData} from './FetchPostData';
import jwt from 'jsonwebtoken';
import { appConfig } from '../config/app';
import { SavedPost } from '../models/Saved_Post';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/posts/'); // Directory to store uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({ storage });

const router = Router();

router.post(
    '/submit',
    authMiddleware,
    upload.single('image'),
    controllerWrapper(async (req: Request, res: Response) => {
        const { title } = req.body;
        const userId = req.user;
        const tags: string[] = Array.isArray(req.body.tag) ? req.body.tag : [req.body.tag];

        if (!title) {
            res.locals.errorCode = 400;
            throw new Error('Title is required');
        }

        if (!userId) {
            res.locals.errorCode = 401;
            throw new Error('Unauthorized');
        }

        if (!req.file) {
            res.locals.errorCode = 400;
            throw new Error('Image file is required');
        }

        // Create the post first to get its ID
        const imageUrl = `/uploads/posts/${req.file.filename}`; // Public URL path
        const date = new Date();
        const post = await Post.create({
            id: v4(),
            user_id: userId.id,
            title: title,
            image_url: imageUrl,
            createdAt: date,
            updatedAt: date,
        });

        // Execute if user added tags to the post
        if (tags.length > 0) {
            //Fetch existing tags from the database
            const existingTags = await Tag.findAll({
                where: {
                    tag_name: {
                        [Op.in]: tags,
                    },
                },
            });

            // Get the tag names that exist
            const existingTagNames = existingTags.map(tag => tag.tag_name);
    
            // Find tags that do not exist yet
            const newTags = tags.filter(tag => !existingTagNames.includes(tag));
    
            // Insert new tags into the Tags table
            const createdTags = await Promise.all(
                newTags.map(async (tagName) => {
                    return await Tag.create({
                        id: v4(),
                        tag_name: tagName,
                    });
                })
            );
    
            // Combine existing and newly created tags
            const allTagInstances = [
                ...existingTags,
                ...createdTags
            ];
    
            // Add entries to PostTags table using the PostTags model
            await Promise.all(
                allTagInstances.map(async (tag) => {
                    await PostTag.create({
                        post_id: post.id,
                        tag_id: tag.id,
                    });
                })
            );
        }

        const result = {
            ...post.toJSON(),
            upvotes: 0,
            downvotes: 0,
            commentsCount: 0,
            tags: tags || [],
        };

        return result;
    })
);

router.get(
    '/', 
    controllerWrapper(async (req: Request, res: Response) => {
        const token = req.headers.authorization?.split(' ')[1];
        
        let userId = null;

        if (token) {
            const decoded = jwt.verify(token, appConfig.jwtSecret);
            if (typeof decoded === 'object' && 'id' in decoded) {
                userId = (decoded as jwt.JwtPayload).id;
            }
        }
        
        const type = req.query.type as string;
        let posts;

        // Fetch all posts
        if (type === 'trending') {
            // TRENDING: posts from last 24h, most upvotes+downvotes
            const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
            posts = await Post.findAll({
                where: { createdAt: { [Op.gte]: since } }
            });
        } else {
            // FRESH and POPULAR: fetch all
            posts = await Post.findAll({ order: [['createdAt', 'DESC']] });
        }

        let postsWithVotes = await buildPostWithAllData(posts, userId)

        if (type === 'trending' || type === 'popular') {
            postsWithVotes = postsWithVotes.sort((a, b) =>
                (b.upvotes + b.downvotes) - (a.upvotes + a.downvotes)
            );
        }
        return postsWithVotes;
    })
);

router.get(
    '/upvoted',
    authMiddleware,
    controllerWrapper(async (req: Request, res: Response) => {
        const userId = req.user?.id;
        if (!userId) {
            res.locals.errorCode = 401;
            throw new Error('Unauthorized');
        }
        const upvotes = await Votes.findAll({
            where: { user_id: userId, is_upvote: true },
            attributes: ['post_id'],
            raw: true,
        });
        const postIds = upvotes.map(v => v.post_id);
        if (postIds.length === 0) return [];
        const posts = await Post.findAll({ where: { id: postIds } });
        return await buildPostWithAllData(posts, userId);
    })
);

router.get(
    '/downvoted',
    authMiddleware,
    controllerWrapper(async (req: Request, res: Response) => {
        const userId = req.user?.id;
        if (!userId) {
            res.locals.errorCode = 401;
            throw new Error('Unauthorized');
        }
        const downvotes = await Votes.findAll({
            where: { user_id: userId, is_upvote: false },
            attributes: ['post_id'],
            raw: true,
        });
        const postIds = downvotes.map(v => v.post_id);
        if (postIds.length === 0) return [];
        const posts = await Post.findAll({ where: { id: postIds } });
        return await buildPostWithAllData(posts, userId);
    })
);

router.get(
    '/saved',
    authMiddleware,
    controllerWrapper(async (req: Request, res: Response) => {
        const userId = req.user?.id;
        if (!userId) {
            res.locals.errorCode = 401;
            throw new Error('Unauthorized');
        }
        const saved = await SavedPost.findAll({
            where: { user_id: userId },
            attributes: ['post_id'],
            raw: true,
        });
        const postIds = saved.map(v => v.post_id);
        if (postIds.length === 0) return [];
        const posts = await Post.findAll({ where: { id: postIds } });
        return await buildPostWithAllData(posts, userId);
    })
);

router.get(
    '/:id',
    controllerWrapper(async (req: Request, res: Response) => {
        const user = req.user
        const postId = req.params.id;
        const post = await Post.findByPk(postId);
        if (!post) {
            res.locals.errorCode = 401;
            throw new Error('Post not found');
        }
        const votesCount = await countVotes(postId);
        const commentCount = await countComments(postId);
        const tagsName = await fetchTagName(postId)
        const postOwner = await fetchUserData(post.user_id);
        const userData = postOwner ? {
            userIdOwnerPost: postOwner.id,
            name: postOwner.username,
            profilePicture: postOwner.profilePicture,
        } : {
            userIdOwnerPost: null,
            name: null,
            profilePicture: null,
        };

        if (user) {
            const voteState = await Votes.findOne({
                where: { post_id: postId, user_id: user.id },
            });
            return {
                ...post.toJSON(),
                ...votesCount,
                commentsCount: commentCount,
                tags: tagsName,
                is_upvoted: voteState?.is_upvote,
                ...userData,
            };
        }
        return {
            ...post.toJSON(),
            ...votesCount,
            commentsCount: commentCount,
            tags: tagsName,
            ...userData,
        };
    })
);

router.put(
    '/:id',
    authMiddleware,
    upload.single('image'),
    controllerWrapper(async (req: Request, res: Response) => {
        const postId = req.params.id;
        const userId = req.user?.id;
        if (!userId) {
            res.locals.errorCode = 401;
            throw new Error('Unauthorized');
        }
        const post = await Post.findByPk(postId);
        if (!post) {
            res.locals.errorCode = 404;
            throw new Error('Post not found');
        }
        if (post.user_id !== userId) {
            res.locals.errorCode = 403;
            throw new Error('Forbidden: You can only edit your own posts');
        }

        const { title } = req.body;
        const tags: string[] = Array.isArray(req.body.tag) ? req.body.tag : [req.body.tag];

        if (!title || !tags) {
            res.locals.errorCode = 400;
            throw new Error('Title and tags are required');
        }

        let imageUrl = post.image_url;

        if (req.file) {
            imageUrl = `/uploads/posts/${req.file.filename}`;
        }

        post.title = title;
        post.image_url = imageUrl;
        await post.save();

        // Update tags
        await PostTag.destroy({ where: { post_id: postId } });

        // Check if the tag already exists in database
        const existingTags = await Tag.findAll({
            where: {
                tag_name: {
                    [Op.in]: tags,
                },
            },
        });

        // Get the tag names that exist
        const existingTagNames = existingTags.map(tag => tag.tag_name);

        // Find tags that do not exist yet
        const newTags = tags.filter(tag => !existingTagNames.includes(tag));

        // Insert new tags into the Tags table
        const createdTags = await Promise.all(
            newTags.map(async (tagName) => {
                return await Tag.create({
                    id: v4(),
                    tag_name: tagName,
                });
            })
        );

        // Combine existing and newly created tags
        const allTagInstances = [
            ...existingTags,
            ...createdTags
        ];

        // Add entries to PostTags table using the PostTags model
        await Promise.all(
            allTagInstances.map(async (tag) => {
                await PostTag.create({
                    post_id: post.id,
                    tag_id: tag.id,
                });
            })
        );
        const result = {
            ...post.toJSON(),
            upvotes: 0,
            downvotes: 0,
            commentsCount: 0,
            tags: tags,
        };
        return result;
    }
));

router.delete(
    '/:id',
    authMiddleware,
    controllerWrapper(async (req: Request, res: Response) => {
        const postId = req.params.id;
        const userId = req.user?.id;
        if (!userId) {
            res.locals.errorCode = 401;
            throw new Error('Unauthorized');
        }
        const post = await Post.findByPk(postId);
        if (!post) {
            res.locals.errorCode = 404;
            throw new Error('Post not found');
        }
        if (post.user_id !== userId) {
            res.locals.errorCode = 403;
            throw new Error('Forbidden: You can only delete your own posts');
        }
        await Post.destroy({ where: { id: postId } });
        await Votes.destroy({ where: { post_id: postId } });
        await Comment.destroy({ where: { post_id: postId } });
        return { message: 'Post deleted successfully' };
    })
);

export default router;