import express from 'express';
import { Sequelize } from 'sequelize-typescript';
import { Comment } from '../models/Comment';
import { Post } from '../models/Post';
import { User } from '../models/User';
import { SavedPost } from '../models/Saved_Post';
import { Tag } from '../models/Tag';
import { Votes } from '../models/Votes';
import { ResetToken } from '../models/ResetToken';
import { PostTag } from '../models/PostTags';
import { Report } from '../models/Report';
import profileRoutes from './Profile';
import registerLoginRoutes from './Auth';
import uploadRoutes from './Uploads';
import commentsRoutes from './Comments';
import commentReplyRoutes from './CommentsReply';
import saveRoutes from './Save';
import config from '../config/config.json';
import cors from 'cors';
import error from '../middleware/errorHandler';
import postRouter from './PostController';
import voteRouter from './voteController';
import searchRoutes from './Search';
import adminRoutes from './Admin';
import reportRoutes from './Report';

const app = express();

// Enable CORS with credentials
app.use(cors({
    origin: 'http://localhost:5173', 
    credentials: true,
}));

app.use(express.json());

import { Dialect } from 'sequelize'; // Add this import if not already present

const sequelize = new Sequelize({
    ...config.development,
    dialect: config.development.dialect as Dialect, // Cast dialect to Dialect type
    models: [Comment, Post, User, SavedPost, Tag, Votes, ResetToken, PostTag, Report],
});


// Later using the same path for API routes
app.use('/uploads', uploadRoutes);
app.use('/uploads/posts', express.static('uploads/post'));


app.use('/auth', registerLoginRoutes);
app.use('/profile', profileRoutes);

app.use('/post', postRouter);
app.use('/post/:id/comments', commentsRoutes); 
app.use('/comments/:id/replies', commentReplyRoutes); 
app.use('/save', saveRoutes)
app.use('/vote', voteRouter);
app.use('/comments/:id', commentReplyRoutes); 
app.use('/save', saveRoutes);
app.use('/search', searchRoutes);
app.use('/admin', adminRoutes);
app.use('/report', reportRoutes);
app.use(error)

app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

app.listen(3000, async () => {
    await sequelize.sync();
    console.log('Server is running on port 3000');
});