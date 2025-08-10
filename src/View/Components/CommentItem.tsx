import React from 'react';
import {
  Avatar,
  Box,
  Button,
  Collapse,
  Paper,
  Stack,
  Typography,
  CircularProgress,
  TextField,
  IconButton,
  Menu,
  MenuItem,
  Fade,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ReplyIcon from "@mui/icons-material/Reply";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { Link } from "react-router-dom";
import { fetchEndpoint } from "../FetchEndpoint";
import { UpdatedAt } from "sequelize-typescript";

interface User {
  username: string;
  avatar: string | null;
  profilePicture?: string | null;
}

export type Comment = {
  id: string;
  user?: User;
  content: string;
  parentId?: string | null;
  reply_to?: string | null;
  createdAt: string;
  updatedAt?: string;
  profilePicture?: string;
  post_id?: string;
  replies?: Comment[]; // for nested replies
};

interface CommentItemProps {
  comment: Comment;
  onDelete?: (commentId: string) => void;
  onEdit?: (commentId: string, newContent: string) => void;
  scrollToTargetUsername?: string;
  onDeleted?: (commentId: string) => void; // New prop to handle deletion
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 5) return "Baru saja";
  if (diffMins < 60) return `${diffMins} menit yang lalu`;
  if (diffHours < 24) return `${diffHours} jam yang lalu`;
  if (diffDays < 7) return `${diffDays} hari yang lalu`;

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function renderContentWithMention(content: string) {
  const parts = content.split(/(@\w+)/g); // Misah berdasarkan mention

  return parts.map((part, idx) => {
    const match = part.match(/^@(\w+)/); // Tangkap username tanpa '@'

    if (match) {
      const username = match[1]; // Ambil 'username' doang

      return (
        <Link
          key={idx}
          to={`/profile/${username}`}
          style={{
            color: "#4fa3ff",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          @{username}
        </Link>
      );
    }

    return <span key={idx}>{part}</span>;
  });
}

function renderRepliesFlat(
  replyNodes: Comment[],
  onDelete: (id: string) => void,
  onDeleted: (id: string) => void
) {
  const sortedReplies = [...replyNodes].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return sortedReplies.map((reply) => (
    <Box key={reply.id} sx={{ mt: 1 }}>
      <CommentItem
        comment={reply}
        onDelete={onDelete}
        onDeleted={onDeleted}
      />
      {reply.replies && reply.replies.length > 0 && (
        renderRepliesFlat(reply.replies, onDelete, onDeleted)
      )}
    </Box>
  ));
}

const CommentItem = ({
  comment,
  onDelete,
  scrollToTargetUsername,
  onDeleted,
}: CommentItemProps) => {
  const [replies, setReplies] = useState<Comment[]>([]);
  const [showReplies, setShowReplies] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [savingEdit, setSavingEdit] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false); // New state to track deletion

  const [currentContent, setCurrentContent] = useState(comment.content);
  const [currentUpdatedAt, setCurrentUpdatedAt] = useState<string | undefined>(
    comment.updatedAt
  );

  const openMenu = Boolean(anchorEl);
  const commentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      scrollToTargetUsername &&
      scrollToTargetUsername === comment.user?.username &&
      commentRef.current
    ) {
      commentRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      commentRef.current.style.outline = "2px solid #4fa3ff";
      commentRef.current.style.borderRadius = "12px";
      setTimeout(() => {
        if (commentRef.current) {
          commentRef.current.style.outline = "none";
        }
      }, 3000);
    }
  }, [scrollToTargetUsername, comment.user?.username]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) =>
    setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  function parseReplies(data: any[]): Comment[] {
    return data.map((reply) => ({
      id: reply.id,
      user: {
        username: reply.user?.username || reply.user?.name || "",
        avatar: reply.user?.avatar || reply.user?.profilePicture || "",
        profilePicture: reply.user?.profilePicture || "",
      },
      content: reply.content || reply.text || "",
      parentId: reply.parentId ?? reply.reply_to,
      reply_to: reply.reply_to,
      createdAt: reply.createdAt,
      updatedAt: reply.updatedAt,
      profilePicture: reply.user?.avatar || reply.user?.profilePicture || "",
      post_id: reply.post_id,
      replies: reply.replies ? parseReplies(reply.replies) : [],
    }));
  }

  const handleShowReplies = async () => {
    if (showReplies) {
      setShowReplies(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchEndpoint(`/comments/${comment.id}`, 'GET', localStorage.getItem("token"));
      let repliesArray: Comment[] = [];
      if (Array.isArray(data)) {
        repliesArray = parseReplies(data);
      } else if (Array.isArray(data.replies)) {
        repliesArray = parseReplies(data.replies);
      }
      
      repliesArray.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setReplies(repliesArray);
      setShowReplies(true);
    } catch (err) {
      console.error("Failed to fetch replies", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = () => {
    setShowReplyInput((prev) => {
      if (prev) setReplyContent("");
      return !prev;
    });
  };

  const handleSendReply = async () => {
    if (!replyContent.trim()) return;
    setSendingReply(true);
    try {
      const token = localStorage.getItem("token");
      const formattedReply = `@${comment.user?.username ?? "user"} ${replyContent}`;
      console.log("Sending reply:", formattedReply);
      
      const endpoint = `/comments/${comment.id}`;
      
      const data = await fetchEndpoint(endpoint, 'POST', token, {content: formattedReply,
          reply_to: comment.id,});
      console.log("Reply data:", data);
      if (!data) throw new Error("Failed to send reply");
      const newReplyRaw = data;
      const newReply: Comment = {
        id: newReplyRaw.id,
        user: {
          username: newReplyRaw.user?.username || "",
          avatar: newReplyRaw.user?.profilePicture || "",
          profilePicture: newReplyRaw.user?.profilePicture || "",
        },
        content: newReplyRaw.content,
        parentId: newReplyRaw.reply_to || newReplyRaw.parentId || comment.id,
        reply_to: newReplyRaw.reply_to,
        createdAt: newReplyRaw.createdAt,
        profilePicture: newReplyRaw.user?.avatar || newReplyRaw.user?.profilePicture || "",
        post_id: newReplyRaw.post_id,
        replies: [],
      };

      console.log("New reply added:", newReply);
            setReplies((prev) => [...prev, newReply]);
      setReplyContent("");
      setShowReplyInput(false);
    } catch (err) {
      console.error("Failed to send reply", err);
      alert("Gagal mengirim reply");
    } finally {
      setSendingReply(false);
    }
  };

  const handleDeleteClick = async () => {
    handleMenuClose();
    try {
      const token = localStorage.getItem("token");

      const endpoint = `/comments/${comment.id}`;
      
      const data = await fetchEndpoint(endpoint, 'DELETE', token);
      if (!data) throw new Error("Failed to delete comment");
      
      setIsDeleted(true);
      
      setTimeout(() => {
        if (onDelete) onDelete(comment.id);
        if (onDeleted) onDeleted(comment.id);
      }, 300);
    } catch (err) {
      console.error("Gagal menghapus komentar", err);
      alert("Gagal menghapus komentar");
    }
  };

  const handleDeleteReply = (commentId: string) => {
    setReplies((prev) => prev.filter((c) => c.id !== commentId));
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    setSavingEdit(true);
    try {
      const token = localStorage.getItem("token");
      const now = new Date().toISOString();  
      const endpoint = `/comments/${comment.id}`;
      
      const data = await fetchEndpoint(endpoint, 'PUT', token, {
        content: editContent,
        updatedAt: now,
      }
      );
      if (!data) throw new Error("Failed to edit comment");
      setCurrentContent(editContent);
      setCurrentUpdatedAt(now);
      setIsEditing(false);
    } catch (err) {
      console.error("Gagal mengedit komentar", err);
      alert("Gagal mengedit komentar");
    } finally {
      setSavingEdit(false);
    }
  };

    const renderTimestamp = () => {
      const updated = currentUpdatedAt || comment.updatedAt;
      if (updated && updated !== comment.createdAt) {
        return (
          <Typography variant="caption" sx={{ color: "#b0b0b0" }}>
            {formatDate(updated)} (edited)
          </Typography>
        );
      }
      return (
        <Typography variant="caption" sx={{ color: "#b0b0b0" }}>
          {formatDate(comment.createdAt)}
        </Typography>
      );
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

  if (isDeleted) {
    return null; 
    
  }

  return (
    <Fade in={!isDeleted} timeout={300}>
      <Paper
        ref={commentRef}
        elevation={comment.parentId || comment.reply_to ? 0 : 2}
        sx={{
          bgcolor: "#1a1a1a",
          color: "#fff",
          borderRadius: 3,
          p: 2,
          mb: comment.parentId || comment.reply_to ? 1 : 2,
          ml: 0, 
          boxShadow: comment.parentId || comment.reply_to ? "none" : "0 2px 8px rgba(0,0,0,0.18)",
          position: "relative",
          transition: "opacity 0.3s ease, transform 0.3s ease",
          opacity: isDeleted ? 0 : 1,
          transform: isDeleted ? "translateX(-100%)" : "translateX(0)",
        }}
      >
        <IconButton
          size="small"
          sx={{ position: "absolute", top: 8, right: 8, color: "#b0b0b0" }}
          onClick={handleMenuOpen}
        >
          <MoreVertIcon />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={openMenu}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <MenuItem
            onClick={() => {
              setIsEditing(true);
              setEditContent(currentContent);
              handleMenuClose();
            }}
          >
            <EditIcon fontSize="small" sx={{ mr: 1 }} />
            Edit
          </MenuItem>
          <MenuItem onClick={handleDeleteClick} sx={{ color: "#ff5252" }}>
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        </Menu>

        <Stack direction="row" spacing={2}>
          <Link to={`/profile/${comment.user?.username}`} style={{ display: 'inline-block' }}>
          <Avatar
            src={getAvatarUrl(comment.profilePicture || comment.user?.avatar || comment.user?.profilePicture || undefined)} 

            // src={comment.profilePicture || comment.user?.avatar || comment.user?.profilePicture || undefined}
            alt={comment.user?.username || ""}
            sx={{ width: 36, height: 36, bgcolor: "#23272f", mt: 0.5 }}
          />
          </Link>
          <Box flex={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#4fa3ff" }}>
                {comment.user?.username}
              </Typography>
              {renderTimestamp()}
            </Stack>

            {/* Edit Mode */}
            {isEditing ? (
              <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1 }}>
                <TextField
                  size="small"
                  variant="outlined"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  sx={{
                    bgcolor: "#23272f",
                    input: { color: "#f1f1f1" },
                  }}
                  multiline
                  minRows={1}
                  maxRows={4}
                  autoFocus
                />
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSaveEdit}
                    disabled={savingEdit || !editContent.trim()}
                    sx={{ borderRadius: 2, minWidth: 0, px: 2 }}
                  >
                    {savingEdit ? <CircularProgress size={18} /> : "Simpan"}
                  </Button>
                  <Button
                    variant="outlined"
                    color="inherit"
                    onClick={() => {
                      setIsEditing(false);
                      setEditContent(currentContent);
                    }}
                    sx={{ borderRadius: 2, minWidth: 0, px: 2, color: "#b0b0b0" }}
                  >
                    Batal
                  </Button>
                </Box>
              </Box>
            ) : (
              <Typography variant="body1" sx={{ mt: 0.5, wordBreak: "break-word" }}>
                {renderContentWithMention(currentContent)}
              </Typography>
            )}

            <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
              <Button
                size="small"
                startIcon={<ReplyIcon sx={{ color: "#4fa3ff" }} />}
                onClick={handleReply}
                sx={{
                  color: "#4fa3ff",
                  textTransform: "none",
                  fontWeight: 500,
                  borderRadius: 2,
                  px: 1.5,
                  minWidth: 0,
                  "&:hover": { bgcolor: "#23272f" },
                }}
              >
                Reply
              </Button>

              {!comment.parentId && !comment.reply_to && (
                <Button
                  size="small"
                  startIcon={showReplies ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  onClick={handleShowReplies}
                  sx={{
                    color: "#b0b0b0",
                    textTransform: "none",
                    fontWeight: 500,
                    borderRadius: 2,
                    px: 1.5,
                    minWidth: 0,
                    "&:hover": { bgcolor: "#23272f" },
                  }}
                >
                  {showReplies ? "Hide Replies" : "Replies"}
                </Button>
              )}
            </Box>

            {showReplyInput && (
              <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
                <TextField
                  size="small"
                  variant="outlined"
                  placeholder={`Reply ke ${comment.user?.username ?? "user"}...`}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  sx={{
                    bgcolor: "#23272f",
                    input: { color: "#f1f1f1" },
                    flex: 1,
                  }}
                  multiline
                  minRows={1}
                  maxRows={4}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSendReply}
                  disabled={sendingReply || !replyContent.trim()}
                  sx={{ borderRadius: 2, minWidth: 0, px: 2 }}
                >
                  {sendingReply ? <CircularProgress size={18} /> : "Kirim"}
                </Button>
              </Box>
            )}

            {loading && (
              <Box sx={{ mt: 1 }}>
                <CircularProgress size={20} sx={{ color: "#4fa3ff" }} />
              </Box>
            )}

            <Collapse in={showReplies} timeout="auto" unmountOnExit>
              <Box sx={{ mt: 1 }}>
                {replies.length === 0 && !loading ? (
                  <Typography variant="body2" sx={{ color: "#b0b0b0", fontStyle: "italic", ml: 2 }}>
                    Tidak ada reply untuk komentar ini
                  </Typography>
                ) : (
                  renderRepliesFlat(replies, handleDeleteReply, handleDeleteReply)
                )}
              </Box>
            </Collapse>
          </Box>
        </Stack>
      </Paper>
    </Fade>
  );
};

export default CommentItem;