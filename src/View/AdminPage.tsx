import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PostCard from "./Components/PostCard";
import { fetchEndpoint } from "./FetchEndpoint";
import { useAuth } from './contexts/AuthContext';

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
      <div style={{ textAlign: 'center', marginTop: '20%' }}>
        <p>Loading reported posts...</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Reported Posts</h1>
      {reportedPosts.length === 0 ? (
        <p>No reported posts found.</p>
      ) : (
        reportedPosts.map((report) => {
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
            <div key={id} style={{ marginBottom: '20px', border: '2px solid red', padding: '10px', borderRadius: '8px' }}>
              <div style={{ backgroundColor: '#ffebee', padding: '10px', marginBottom: '10px', borderRadius: '4px' }}>
                <strong style={{ color: 'red' }}>⚠️ REPORTED POST</strong>
                <div style={{ marginTop: '8px' }}>
                  <strong>Reporter:</strong> {reporter.name} ({reporter.email})<br />
                  <strong>Reason:</strong> {reason.replace('_', ' ')}<br />
                  {comment && <><strong>Comment:</strong> "{comment}"<br /></>}
                  <strong>Report Date:</strong> {new Date(created_at).toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
                <div style={{ marginTop: '10px' }}>
                  <button
                    onClick={() => handleReportAction(id, 'approve')}
                    style={{
                      marginRight: '10px',
                      backgroundColor: '#f44336',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Approve Report (Remove Post)
                  </button>
                  <button
                    onClick={() => handleReportAction(id, 'reject')}
                    style={{
                      backgroundColor: '#4caf50',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Reject Report (Keep Post)
                  </button>
                </div>
              </div>
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
            </div>
          );
        })
      )}
    </div>
  );
};

export default AdminPage;
