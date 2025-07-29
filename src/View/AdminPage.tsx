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
    };
    reporter: {
        id: string;
        name: string;
        email: string;
    };
}

const AdminPage: React.FC = () => {
    const [reportedPosts, setReportedPosts] = useState<ReportedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { token } = useAuth();

    // Fetch reported posts
    async function fetchReportedPosts() {
        try {
            setLoading(true);
            const endpoint = `/admin/report`;
            const data = await fetchEndpoint(endpoint, 'GET', token);
            setReportedPosts(data);
        } catch (error) {
            console.error('Failed to fetch reported posts', error);
            setReportedPosts([]);
        } finally {
            setLoading(false);
        }
    }

    // Handle approve report action
    const handleApproveReport = async (reportId: string) => {
        try {
            const endpoint = `/admin/report/${reportId}`;
            const response = await fetchEndpoint(endpoint, 'PUT', token, {
                action: 'approve'
            });
            
            if (response) {
                // Remove the approved report from the list
                setReportedPosts(prev => prev.filter(report => report.id !== reportId));
                alert('Report approved successfully. Post has been removed.');
            } else {
                alert('Failed to approve report.');
            }
        } catch (error) {
            console.error('Error approving report:', error);
            alert('Error approving report.');
        }
    };

    // Handle reject report action
    const handleRejectReport = async (reportId: string) => {
        try {
            const endpoint = `/admin/report/${reportId}`;
            const response = await fetchEndpoint(endpoint, 'PUT', token, {
                action: 'reject'
            });
            
            if (response) {
                // Remove the rejected report from the list
                setReportedPosts(prev => prev.filter(report => report.id !== reportId));
                alert('Report rejected successfully. Post remains active.');
            } else {
                alert('Failed to reject report.');
            }
        } catch (error) {
            console.error('Error rejecting report:', error);
            alert('Error rejecting report.');
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
                reportedPosts.map((report) => (
                    <div key={report.id} style={{ marginBottom: '20px', border: '2px solid red', padding: '10px', borderRadius: '8px' }}>
                        <div style={{ backgroundColor: '#ffebee', padding: '10px', marginBottom: '10px', borderRadius: '4px' }}>
                            <strong style={{ color: 'red' }}>⚠️ REPORTED POST</strong>
                            <div style={{ marginTop: '8px' }}>
                                <strong>Reporter:</strong> {report.reporter.name} ({report.reporter.email})<br/>
                                <strong>Reason:</strong> {report.reason.replace('_', ' ')}<br/>
                                {report.comment && (
                                    <>
                                        <strong>Comment:</strong> "{report.comment}"<br/>
                                    </>
                                )}
                                <strong>Report Date:</strong> {new Date(report.created_at).toLocaleDateString()}
                            </div>
                            <div style={{ marginTop: '10px' }}>
                                <button 
                                    onClick={() => handleApproveReport(report.id)}
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
                                    onClick={() => handleRejectReport(report.id)}
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
                            postId={report.post.id}
                            imageUrl={report.post.image_url}
                            title={report.post.title}
                            username={report.post.name}
                            timeAgo={report.post.createdAt}
                            upvotes={report.post.upvotes}
                            downvotes={report.post.downvotes}
                            comments={report.post.commentsCount}
                            onCommentClick={() => navigate(`/post/${report.post.id}`)}
                            onSaveClick={() => {}}
                            isSaved={false}
                            tags={report.post.tags}
                            userIdOwnerPost={report.post.user_id}
                            loggedInUserId="admin"
                            onEdit={() => {}}
                            onDelete={() => {}}
                        />
                    </div>
                ))
            )}
        </div>
    );
};

export default AdminPage;