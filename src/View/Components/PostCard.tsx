import React, { useState } from 'react';
import { useModal } from '../contexts/ModalContext';
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Stack,
  Avatar,
  Chip,
  Collapse,
} from '@mui/material';
import ArrowDownwardOutlined from '@mui/icons-material/ArrowDownwardOutlined';
import ArrowUpwardOutlined from '@mui/icons-material/ArrowUpwardOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import BookmarkIcon from '@mui/icons-material/Bookmark'; // For filled bookmark
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder'; // For outline bookmark
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import ReportOutlinedIcon from '@mui/icons-material/ReportOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { fetchEndpoint } from '../FetchEndpoint';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from "react-router-dom";
import ReportDialog from './ReportDialog';

interface PostCardProps {
  postId: string;
  imageUrl: string;
  title: string;
  username: string;
  timeAgo: string;
  upvotes: number;
  downvotes: number;
  comments: number;
  isSaved: boolean;
  onCommentClick?: () => void;
  onSaveClick?: () => void;
  tags: string[];
  is_upvoted?: boolean;
  userIdOwnerPost?: string;
  loggedInUserId?: string;
  onEdit?: (updatedPost: any) => void;
  onDelete?: (postId: string) => void;
  profileUrl?: string;
}

const PostCard: React.FC<PostCardProps> = ({
  postId,
  imageUrl,
  title,
  username,
  timeAgo,
  upvotes,
  downvotes,
  comments,
  onCommentClick,
  onSaveClick,
  isSaved = false,  
  is_upvoted,
  tags,
  userIdOwnerPost,
  loggedInUserId,
  onEdit,
  onDelete,
  profileUrl,
}) => {
  const [showComments, setShowComments] = useState(false);
  const [upvote, setUpvote] = useState(is_upvoted);
  const [downvote, setDownvote] = useState(is_upvoted === false ? true : undefined);
  const [upvotesCount, setUpvotesCount] = useState(upvotes);
  const [downvotesCount, setDownvotesCount] = useState(downvotes);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [saved, setSaved] = useState(isSaved);
  const menuOpen = Boolean(anchorEl);
  const { openEditPostModal } = useModal();
  const { token, isAuthenticated } = useAuth();

  const handleCommentClick = () => {
    if (onCommentClick) {
      onCommentClick();
    } else {
      setShowComments((prev) => !prev);
      setTimeout(() => {
        const el = document.getElementById(`comments-${postId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    }
  };

  const handleSaveClick = async () => {
    const token = localStorage.getItem('token');
    
    try {
      // Optimistically update the UI
      const newSavedState = !saved;
      setSaved(newSavedState);
      
      // Send postId as part of the URL path, not as the body
      const method = newSavedState ? 'POST' : 'DELETE';
      const endpoint = `/save/save-post/${postId}`;
      
      const response = await fetchEndpoint(endpoint, method, token);
      
      if (!response) {
        // If the request fails, revert the UI change
        setSaved(!newSavedState);
        console.error(`Failed to ${newSavedState ? 'save' : 'unsave'} post`);
      } else {
        console.log(`Post ${newSavedState ? 'saved' : 'unsaved'} successfully`);
        onSaveClick && onSaveClick();
      }
    } catch (error) {
      // Revert the UI change if there's an error
      setSaved(!saved);
      console.error('Error saving post:', error);
    }
  };

  const handleVotesClick = async (type: 'upvote' | 'downvote') => {
    const token = localStorage.getItem('token');
    const endpoint = `/vote/${type}/${postId}`;
    try {
      if (type === 'upvote') {
        if (!upvote && !downvote) {
          setUpvote(true);
          setUpvotesCount(upvotesCount + 1);
          await fetchEndpoint(endpoint, 'POST', token);
        } else if (upvote) {
          setUpvote(false);
          setUpvotesCount(upvotesCount - 1);
          await fetchEndpoint(endpoint, 'DELETE', token);
        } else {
          setUpvote(true);
          setDownvote(false);
          setUpvotesCount(upvotesCount + 1);
          setDownvotesCount(downvotesCount > 0 ? downvotesCount - 1 : 0);
          await fetchEndpoint(endpoint, 'PUT', token);
        }
      } else {
        if (!upvote && !downvote) {
          setDownvote(true);
          setDownvotesCount(downvotesCount + 1);
          await fetchEndpoint(endpoint, 'POST', token);
        } else if (downvote) {
          setDownvote(false);
          setDownvotesCount(downvotesCount - 1);
          await fetchEndpoint(endpoint, 'DELETE', token);
        } else {
          setDownvote(true);
          setUpvote(false);
          setDownvotesCount(downvotesCount + 1);
          setUpvotesCount(upvotesCount > 0 ? upvotesCount - 1 : 0);
          await fetchEndpoint(endpoint, 'PUT', token);
        }
      }
    }
    catch (error) {
      console.error('Error handling vote:', error);
      // Handle error appropriately, e.g., show a notification
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = async () => {
    handleMenuClose();
    openEditPostModal({
      postId,
      imageUrlEdit: imageUrl,
      titleEdit: title,
      tagsEdit: tags,
    });
  };

  const handleDelete = async () => {
    handleMenuClose();
    const endpoint = `/post/${postId}`;
    const data = await fetchEndpoint(endpoint, 'DELETE', token);
    if (data && typeof onDelete === 'function') {
      onDelete(postId);
    }
  };

  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  const openReportDialog = () => {
    setReportDialogOpen(true);
  };

  const closeReportDialog = () => {
    setReportDialogOpen(false);
  };

  const [hasReported, setHasReported] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    const checkReportStatus = async () => {
      try {
        const response = await fetchEndpoint(`/report/check/${postId}`, 'GET', token);
        if (response && typeof response.hasReported === 'boolean') {
          setHasReported(response.hasReported);
        }
      } catch (error) {
        console.error('Failed to check report status', error);
      }
    };

    checkReportStatus();
  }, [postId, isAuthenticated, token]);

  const handleReportSubmit = async (reason: string, comment: string) => {
    if (!isAuthenticated) {
      alert('You need to be logged in to report.');
      return;
    }

    setIsReporting(true);
    try {
      const response = await fetchEndpoint(`/report/${postId}`, 'POST', token, {
        reason,
        comment,
      });
      if (response) {
        alert('Post reported successfully.');
        setHasReported(true);
        closeReportDialog();
      } else {
        alert('Failed to report post.');
      }
    } catch (error) {
      alert('Error reporting post.');
    } finally {
      setIsReporting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 5) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getAvatarUrl = (avatarPath: string | undefined) => {
    if (!avatarPath) return undefined;
    if (avatarPath.startsWith('http')) {
      return avatarPath;
    }
    const filename = avatarPath.includes('/')
      ? avatarPath.split('/').pop()
      : avatarPath;
    if (!filename) return undefined;
    const cacheBuster = avatarPath.includes('?t=') ? '' : `?t=${new Date().getTime()}`;
    return `/uploads/avatars/${filename}${cacheBuster}`;
  };

  useEffect(() => {
    if (menuOpen) {
      const handleScroll = () => {
        setTimeout(() => handleMenuClose(), 10);
      };
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [menuOpen]);

  return (
    <Card
      sx={{
        width: '100%',
        maxWidth: 640,
        mx: 'auto',
        my: 3,
        bgcolor: '#1a1a1a',
        color: '#fff',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <Link 
              to={`/profile/${username}`}
              style={{
                color: "#4fa3ff",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <Avatar 
                alt={username}
                src={getAvatarUrl(profileUrl)} 
                sx={{ width: 32, height: 32 }} 
              />
            </Link>
            <Box>
              <Typography fontSize={14} fontWeight={500}>
                {username}
              </Typography>
              <Typography fontSize={12} color="gray">
                {formatDate(timeAgo)}
              </Typography>
            </Box>
          </Stack>
          {loggedInUserId && userIdOwnerPost && loggedInUserId === userIdOwnerPost && (
            <>
              <IconButton sx={{ color: 'gray' }} onClick={handleMenuOpen}>
                <MoreVertIcon />
              </IconButton>
              {anchorEl && (
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  disableScrollLock={true}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                >
                  <MenuItem onClick={handleEdit}>Edit</MenuItem>
                  <MenuItem onClick={handleDelete}>Delete</MenuItem>
                </Menu>
              )}
            </>
          )}
        </Stack>

        {/* Title */}
        <Typography mt={2} fontWeight={600} fontSize={16}>
          {title}
        </Typography>

        {/* Image */}
        <Box
          component="img"
          src={imageUrl}
          alt="Post"
          sx={{
            width: '100%',
            borderRadius: 1,
            mt: 1,
            maxHeight: 640,
            objectFit: 'contain',
          }}
        />

        {/* Tags (optional example) */}
        <Stack direction="row" spacing={1} mt={1}>
          {tags && tags.length > 0 ? (
            tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                sx={{ bgcolor: '#2c2c2c', color: '#fff' }}
              />
            ))
          ) : null}
        </Stack>

        {/* Interaction Row */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          mt={2}
        >
          <Stack direction="row" spacing={3} alignItems="center">
            <IconButton
              sx={{
                color: upvote ? '#4caf50' : '#fff',
                transition: 'color 0.2s',
              }}
              onClick={isAuthenticated ? handleVotesClick.bind(null, 'upvote') : undefined}
              disabled={!isAuthenticated}
            >
              <Stack direction="row" spacing={0.5} alignItems="center">
                <ArrowUpwardOutlined fontSize="small" />
                <Typography variant="body2">{upvotesCount}</Typography>
              </Stack>
            </IconButton>

            <IconButton
              sx={{
                color: downvote ? '#f44336' : '#fff',
                transition: 'color 0.2s',
              }}
              onClick={isAuthenticated ? handleVotesClick.bind(null, 'downvote') : undefined}
              disabled={!isAuthenticated}
            >
              <Stack direction="row" spacing={0.5} alignItems="center">
                <ArrowDownwardOutlined fontSize="small" />
                <Typography variant="body2">{downvotesCount}</Typography>
              </Stack>
            </IconButton>

            {/* Comment Button */}
            <Chip
              icon={<ChatBubbleOutlineIcon />}
              label={`${comments} Comments`}
              onClick={handleCommentClick}
              sx={{
                backgroundColor: '#2c2c2c',
                color: '#fff',
                borderRadius: 2,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            />
          </Stack>

          <Stack direction="row" spacing={2}>
            <IconButton
              sx={{
                color: saved ? '#1976d2' : '#aaa'
              }}
              onClick={isAuthenticated ? handleSaveClick : undefined}
              disabled={!isAuthenticated}
            >
              {saved ? <BookmarkIcon /> : <BookmarkBorderIcon />}
            </IconButton>
            <IconButton sx={{ color: '#aaa' }}>
              <ShareOutlinedIcon />
            </IconButton>
            {/* Debug: Log values to console */}
            {console.log('Debug Report Button:', {
              loggedInUserId,
              userIdOwnerPost,
              showReport: loggedInUserId !== userIdOwnerPost,
              isAuthenticated,
              hasReported
            })}
            {loggedInUserId !== userIdOwnerPost && (
              <>
                <IconButton
                  sx={{ color: '#aaa' }}
                  onClick={openReportDialog}
                  disabled={!isAuthenticated || hasReported}
                  title={hasReported ? 'You have already reported this post' : 'Report post'}
                >
                  <ReportOutlinedIcon />
                </IconButton>

                <ReportDialog
                  open={reportDialogOpen}
                  onClose={closeReportDialog}
                  onSubmit={handleReportSubmit}
                  disabled={isReporting}
                />
              </>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default PostCard;