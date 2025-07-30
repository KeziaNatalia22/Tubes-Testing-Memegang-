import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  Chip, 
  Stack, 
  Container,
  CircularProgress,
  Divider,
  Paper,
  Avatar
} from '@mui/material';
import { styled } from '@mui/material/styles';
import PostCard from "./Components/PostCard";
import { fetchEndpoint } from "./FetchEndpoint";
import { useAuth } from './contexts/AuthContext';
import FAIcon from './Components/FAIcon';

// Styled components
const StyledCard = styled(Card)(({ theme }) => ({
  backgroundColor: '#1e1e1e',
  border: '2px solid #f44336',
  borderRadius: theme.spacing(2),
  marginBottom: theme.spacing(3),
  overflow: 'visible',
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    background: 'linear-gradient(45deg, #f44336, #ff7043)',
    borderRadius: theme.spacing(2),
    zIndex: -1,
  }
}));

const ReportChip = styled(Chip)(() => ({
  backgroundColor: '#ffebee',
  color: '#d32f2f',
  fontWeight: 600,
  '& .MuiChip-icon': {
    color: '#d32f2f'
  }
}));

const ApproveButton = styled(Button)(() => ({
  backgroundColor: '#f44336',
  color: 'white',
  fontWeight: 600,
  '&:hover': {
    backgroundColor: '#d32f2f',
    boxShadow: '0 4px 12px rgba(244, 67, 54, 0.3)'
  },
  '&:active': {
    transform: 'scale(0.98)'
  }
}));

const RejectButton = styled(Button)(() => ({
  backgroundColor: '#4caf50',
  color: 'white',
  fontWeight: 600,
  '&:hover': {
    backgroundColor: '#388e3c',
    boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)'
  },
  '&:active': {
    transform: 'scale(0.98)'
  }
}));

interface ReportedPost {
  id: string;
  post_id: string;
  user_id: string;
  reason: string;
  comment: string;
  status: string;
  created_at: string;
  post: {
    id: string;
    title: string;
    image_url: string;
    user_id: string;
    name: string;
    profilePicture: string;
    createdAt: string;
    commentsCount: number;
    upvotes: number;
    downvotes: number;
    tags: string[];
  } | null;
  reporter: {
    id: string;
    name: string;
    email: string;
  } | null;
}

const AdminPage: React.FC = () => {
  const [reportedPosts, setReportedPosts] = useState<ReportedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { token } = useAuth();

  const fetchReportedPosts = async () => {
    try {
      setLoading(true);
      const data = await fetchEndpoint('/admin/reports', 'GET', token);
      setReportedPosts(data);
    } catch (error) {
      console.error('❌ Failed to fetch reported posts:', error);
      setReportedPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReportAction = async (reportId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetchEndpoint(`/admin/reports/${reportId}`, 'PUT', token, { action });
      if (res) {
        setReportedPosts(prev => prev.filter(report => report.id !== reportId));
        alert(`✅ Report ${action === 'approve' ? 'approved (post removed)' : 'rejected (post kept)'}`);
      } else {
        alert(`⚠️ Failed to ${action} report`);
      }
    } catch (error) {
      console.error(`❌ Error during ${action} report:`, error);
      alert(`❌ Error during ${action} report`);
    }
  };

  useEffect(() => {
    fetchReportedPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            minHeight: '60vh',
            gap: 2
          }}
        >
          <CircularProgress size={60} sx={{ color: '#1976d2' }} />
          <Typography variant="h6" sx={{ color: '#aaa', fontFamily: '"Poppins", sans-serif' }}>
            Loading reported posts...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <FAIcon icon="fas fa-shield-halved" style={{ fontSize: '2rem', color: '#1976d2' }} />
          <Typography 
            variant="h3" 
            sx={{ 
              color: '#fff', 
              fontWeight: 700,
              fontFamily: '"Poppins", sans-serif'
            }}
          >
            Admin Panel
          </Typography>
        </Box>
        <Typography 
          variant="h6" 
          sx={{ 
            color: '#aaa', 
            fontFamily: '"Poppins", sans-serif',
            ml: 5
          }}
        >
          Manage reported posts and content moderation
        </Typography>
      </Box>

      {/* Content */}
      {reportedPosts.length === 0 ? (
        <Paper 
          sx={{ 
            p: 6, 
            textAlign: 'center',
            backgroundColor: '#1e1e1e',
            border: '1px solid #333'
          }}
        >
          <FAIcon icon="fas fa-check-circle" style={{ fontSize: '4rem', color: '#4caf50', marginBottom: '16px' }} />
          <Typography variant="h5" sx={{ color: '#fff', mb: 2, fontFamily: '"Poppins", sans-serif' }}>
            All Clear!
          </Typography>
          <Typography variant="body1" sx={{ color: '#aaa', fontFamily: '"Poppins", sans-serif' }}>
            No reported posts found. The community is behaving well.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={3}>
          {reportedPosts.map((report) => {
            if (!report.post || !report.reporter) return null;

            const {
              id,
              reporter,
              reason,
              comment,
              created_at,
              post,
            } = report;

            return (
              <StyledCard key={id}>
                <CardContent sx={{ p: 0 }}>
                  {/* Report Header */}
                  <Box sx={{ 
                    backgroundColor: '#ffebee', 
                    p: 3, 
                    borderRadius: '16px 16px 0 0',
                    borderBottom: '1px solid #ffcdd2'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <ReportChip 
                        icon={<FAIcon icon="fas fa-exclamation-triangle" />}
                        label="REPORTED CONTENT"
                        size="medium"
                      />
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: '#666',
                          fontFamily: '"Poppins", sans-serif'
                        }}
                      >
                        {new Date(created_at).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Typography>
                    </Box>

                    {/* Reporter Info */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar sx={{ bgcolor: '#d32f2f', width: 32, height: 32 }}>
                        <FAIcon icon="fas fa-user" style={{ fontSize: '14px' }} />
                      </Avatar>
                      <Box>
                        <Typography 
                          variant="subtitle2" 
                          sx={{ 
                            color: '#333', 
                            fontWeight: 600,
                            fontFamily: '"Poppins", sans-serif'
                          }}
                        >
                          Reported by: {reporter.name}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: '#666',
                            fontFamily: '"Poppins", sans-serif'
                          }}
                        >
                          {reporter.email}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Report Details */}
                    <Box sx={{ mb: 3 }}>
                      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 600, 
                            color: '#333',
                            fontFamily: '"Poppins", sans-serif'
                          }}
                        >
                          Reason:
                        </Typography>
                        <Chip 
                          label={reason.replace('_', ' ').toUpperCase()} 
                          size="small"
                          sx={{ 
                            backgroundColor: '#f44336',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '0.75rem'
                          }}
                        />
                      </Stack>
                      {comment && (
                        <Box sx={{ mt: 1 }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 600, 
                              color: '#333',
                              fontFamily: '"Poppins", sans-serif',
                              mb: 0.5
                            }}
                          >
                            Additional Comment:
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: '#666',
                              fontStyle: 'italic',
                              fontFamily: '"Poppins", sans-serif',
                              backgroundColor: '#fff',
                              p: 1.5,
                              borderRadius: 1,
                              border: '1px solid #ffcdd2'
                            }}
                          >
                            "{comment}"
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Action Buttons */}
                    <Stack direction="row" spacing={2}>
                      <ApproveButton
                        variant="contained"
                        startIcon={<FAIcon icon="fas fa-trash" />}
                        onClick={() => handleReportAction(id, 'approve')}
                        fullWidth
                      >
                        Approve Report (Remove Post)
                      </ApproveButton>
                      <RejectButton
                        variant="contained"
                        startIcon={<FAIcon icon="fas fa-shield-check" />}
                        onClick={() => handleReportAction(id, 'reject')}
                        fullWidth
                      >
                        Reject Report (Keep Post)
                      </RejectButton>
                    </Stack>
                  </Box>

                  <Divider sx={{ backgroundColor: '#333' }} />

                  {/* Post Content */}
                  <Box sx={{ p: 3, backgroundColor: '#121212' }}>
                    <Typography 
                      variant="subtitle1" 
                      sx={{ 
                        color: '#aaa', 
                        mb: 2,
                        fontFamily: '"Poppins", sans-serif'
                      }}
                    >
                      Reported Post:
                    </Typography>
                    <PostCard
                      postId={post.id}
                      imageUrl={post.image_url}
                      title={post.title}
                      username={post.name}
                      timeAgo={post.createdAt}
                      upvotes={post.upvotes}
                      downvotes={post.downvotes}
                      comments={post.commentsCount}
                      onCommentClick={() => navigate(`/post/${post.id}`)}
                      onSaveClick={() => { }}
                      isSaved={false}
                      tags={post.tags}
                      userIdOwnerPost={post.user_id}
                      loggedInUserId="admin"
                      onEdit={() => { }}
                      onDelete={() => { }}
                    />
                  </Box>
                </CardContent>
              </StyledCard>
            );
          })}
        </Stack>
      )}
    </Container>
  );
};

export default AdminPage;
