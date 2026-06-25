import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageSquare, MoreHorizontal, Trash2, Edit2, CornerDownRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import CommentForm from './CommentForm';
import { getImageUrl } from '../utils/imageUrl';

const CommentItem = ({ comment, postId, onDeleteSuccess, onUpdateSuccess }) => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [isLiked, setIsLiked] = useState(comment.isLiked || false);
  const [likesCount, setLikesCount] = useState(comment.likesCount || 0);
  const [isLiking, setIsLiking] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);

  // Replies states
  const [replies, setReplies] = useState([]);
  const [showReplies, setShowReplies] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [repliesPage, setRepliesPage] = useState(1);
  const [repliesTotalPages, setRepliesTotalPages] = useState(1);
  const [repliesCountState, setRepliesCountState] = useState(comment.repliesCount || 0);

  const isOwner = currentUser?.id === comment.author?.id || currentUser?.id === comment.author?._id;
  const isRoot = !comment.parentComment;
  const cdnBase = (import.meta.env.VITE_CDN_URL || 'https://trendora-9k7e.onrender.com/uploads')
    .replace('/uploads', '');

  const handleLikeToggle = async (e) => {
    e.stopPropagation();
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (isLiking) return;

    const previousIsLiked = isLiked;
    const previousLikesCount = likesCount;

    setIsLiked(!previousIsLiked);
    setLikesCount(previousIsLiked ? Math.max(0, previousLikesCount - 1) : previousLikesCount + 1);
    setIsLiking(true);

    try {
      if (previousIsLiked) {
        await api.delete(`/comments/${comment._id}/like`);
      } else {
        await api.post(`/comments/${comment._id}/like`);
      }
    } catch (err) {
      console.error('Failed to toggle comment like:', err);
      setIsLiked(previousIsLiked);
      setLikesCount(previousLikesCount);
    } finally {
      setIsLiking(false);
    }
  };

  const handleEditSubmit = async (newText) => {
    try {
      const res = await api.put(`/comments/${comment._id}`, { text: newText });
      setIsEditing(false);
      if (onUpdateSuccess) {
        onUpdateSuccess(comment._id, res.data.data.text);
      }
    } catch (err) {
      console.error('Failed to edit comment:', err);
      alert('Failed to edit comment. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      await api.delete(`/comments/${comment._id}`);
      if (onDeleteSuccess) {
        onDeleteSuccess(comment._id);
      }
    } catch (err) {
      console.error('Failed to delete comment:', err);
      alert('Failed to delete comment. Please try again.');
    }
  };

  const handleReplySubmit = async (replyText) => {
    try {
      const res = await api.post(`/comments/${comment._id}/replies`, {
        text: replyText,
        postId,
      });
      setShowReplyForm(false);
      setRepliesCountState((prev) => prev + 1);
      
      // If replies are already expanded/loaded, append the reply. Otherwise, load them
      if (showReplies) {
        setReplies((prev) => [...prev, res.data.data]);
      } else {
        fetchReplies(1);
      }
    } catch (err) {
      console.error('Failed to submit reply:', err);
      alert('Failed to post reply.');
    }
  };

  const fetchReplies = async (pageNum = 1) => {
    setLoadingReplies(true);
    try {
      const res = await api.get(`/comments/${comment._id}/replies?page=${pageNum}&limit=10`);
      const { data, pagination } = res.data;
      if (pageNum === 1) {
        setReplies(data);
      } else {
        setReplies((prev) => [...prev, ...data]);
      }
      setRepliesPage(pagination.page);
      setRepliesTotalPages(pagination.pages);
      setShowReplies(true);
    } catch (err) {
      console.error('Failed to load replies:', err);
    } finally {
      setLoadingReplies(false);
    }
  };

  const handleToggleReplies = () => {
    if (showReplies) {
      setShowReplies(false);
    } else {
      fetchReplies(1);
    }
  };

  const loadMoreReplies = () => {
    if (repliesPage < repliesTotalPages && !loadingReplies) {
      fetchReplies(repliesPage + 1);
    }
  };

  const handleReplyDeleteSuccess = (deletedReplyId) => {
    setReplies((prev) => prev.filter((r) => r._id !== deletedReplyId));
    setRepliesCountState((prev) => Math.max(0, prev - 1));
  };

  const handleReplyUpdateSuccess = (updatedReplyId, newText) => {
    setReplies((prev) =>
      prev.map((r) => (r._id === updatedReplyId ? { ...r, text: newText, isEdited: true } : r))
    );
  };

  const formattedDate = new Date(comment.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div style={styles.commentContainer}>
      <div style={styles.commentBody}>
        {/* Author Avatar */}
        <img
          src={comment.author?.profilePicture ? getImageUrl(comment.author.profilePicture) : `https://api.dicebear.com/7.x/bottts/svg?seed=${comment.author?.username}`}
          alt={comment.author?.username}
          style={styles.avatar}
          onClick={() => navigate(`/profile/${comment.author?.username}`)}
          onError={(e) => {
            e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${comment.author?.username}`;
          }}
        />

        {/* Comment Text & details */}
        <div style={styles.contentCol}>
          <div style={styles.header}>
            <div style={styles.authorNames} onClick={() => navigate(`/profile/${comment.author?.username}`)}>
              <span style={styles.fullName}>{comment.author?.firstName} {comment.author?.lastName}</span>
              <span style={styles.username}>@{comment.author?.username}</span>
            </div>
            <span style={styles.date}>{formattedDate} {comment.isEdited && '(edited)'}</span>
          </div>

          {isEditing ? (
            <div style={styles.formWrapper}>
              <CommentForm
                initialText={comment.text}
                submitLabel="Save"
                onSubmit={handleEditSubmit}
                onCancel={() => setIsEditing(false)}
              />
            </div>
          ) : (
            <p style={styles.text}>{comment.text}</p>
          )}

          {/* Action buttons footer */}
          {!isEditing && (
            <div style={styles.actionsFooter}>
              <button 
                onClick={handleLikeToggle} 
                style={{ ...styles.actionBtn, ...(isLiked ? styles.likedBtn : {}) }}
                disabled={isLiking}
              >
                <Heart size={14} fill={isLiked ? 'var(--error)' : 'transparent'} />
                <span>{likesCount}</span>
              </button>

              {isRoot && (
                <button onClick={() => setShowReplyForm(!showReplyForm)} style={styles.actionBtn}>
                  <MessageSquare size={14} />
                  <span>Reply</span>
                </button>
              )}

              {isOwner && (
                <div style={styles.menuWrapper}>
                  <button onClick={() => setShowMenu(!showMenu)} style={styles.menuBtn}>
                    <MoreHorizontal size={14} />
                  </button>
                  {showMenu && (
                    <div style={styles.dropdown} className="glass-panel">
                      <button onClick={() => { setIsEditing(true); setShowMenu(false); }} style={styles.dropdownItem}>
                        <Edit2 size={12} style={{ marginRight: '0.4rem' }} />
                        Edit
                      </button>
                      <button onClick={() => { handleDelete(); setShowMenu(false); }} style={{ ...styles.dropdownItem, ...styles.deleteItem }}>
                        <Trash2 size={12} style={{ marginRight: '0.4rem' }} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Inline Reply input */}
          {showReplyForm && (
            <div style={styles.replyFormContainer}>
              <CommentForm
                placeholder={`Reply to @${comment.author?.username}...`}
                submitLabel="Reply"
                onSubmit={handleReplySubmit}
                onCancel={() => setShowReplyForm(false)}
              />
            </div>
          )}

          {/* Replies Drawer Accordion Toggle */}
          {isRoot && repliesCountState > 0 && (
            <button onClick={handleToggleReplies} style={styles.repliesToggleBtn}>
              <CornerDownRight size={14} style={{ marginRight: '0.4rem' }} />
              {showReplies ? 'Hide replies' : `View ${repliesCountState} ${repliesCountState === 1 ? 'reply' : 'replies'}`}
            </button>
          )}

          {/* Replies Listing Container */}
          {isRoot && showReplies && (
            <div style={styles.repliesList}>
              {replies.map((replyItem) => (
                <CommentItem
                  key={replyItem._id}
                  comment={replyItem}
                  postId={postId}
                  onDeleteSuccess={handleReplyDeleteSuccess}
                  onUpdateSuccess={handleReplyUpdateSuccess}
                />
              ))}

              {loadingReplies && (
                <div style={styles.loadingReplies}>
                  <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                  <span>Loading replies...</span>
                </div>
              )}

              {repliesPage < repliesTotalPages && !loadingReplies && (
                <button onClick={loadMoreReplies} style={styles.loadMoreRepliesBtn}>
                  Load More Replies
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  commentContainer: {
    padding: '0.75rem 0',
    borderBottom: '1px solid var(--border-glass)',
    width: '100%',
  },
  commentBody: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-start',
    width: '100%',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: 'var(--radius-full)',
    objectFit: 'cover',
    border: '1px solid var(--border-glass)',
    cursor: 'pointer',
    background: 'var(--bg-secondary)',
    flexShrink: 0,
  },
  contentCol: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.25rem',
  },
  authorNames: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    cursor: 'pointer',
  },
  fullName: {
    fontWeight: '600',
    fontSize: '0.875rem',
    color: 'var(--text-primary)',
  },
  username: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    fontWeight: '500',
  },
  date: {
    fontSize: '0.725rem',
    color: 'var(--text-muted)',
  },
  text: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.45',
    wordBreak: 'break-word',
    margin: '0.25rem 0 0.5rem 0',
  },
  formWrapper: {
    marginTop: '0.5rem',
    width: '100%',
  },
  actionsFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    marginTop: '0.25rem',
  },
  actionBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    cursor: 'pointer',
    fontSize: '0.775rem',
    fontWeight: '600',
    transition: 'var(--transition-fast)',
    padding: '0.25rem 0',
  },
  likedBtn: {
    color: 'var(--error)',
  },
  menuWrapper: {
    position: 'relative',
  },
  menuBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: '0.25rem',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    width: '100px',
    zIndex: 10,
    padding: '0.2rem',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 'var(--radius-sm)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  },
  dropdownItem: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    padding: '0.4rem 0.6rem',
    fontSize: '0.75rem',
    fontWeight: '500',
    textAlign: 'left',
    cursor: 'pointer',
    borderRadius: '3px',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  },
  deleteItem: {
    color: 'var(--error)',
  },
  replyFormContainer: {
    marginTop: '0.75rem',
    padding: '0.75rem',
    background: 'rgba(0,0,0,0.15)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-glass)',
  },
  repliesToggleBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--secondary)',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '600',
    marginTop: '0.5rem',
    padding: 0,
  },
  repliesList: {
    marginTop: '0.5rem',
    paddingLeft: '1.25rem',
    borderLeft: '1px dashed var(--border-glass)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  loadingReplies: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    padding: '0.5rem 0',
  },
  loadMoreRepliesBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--secondary)',
    fontSize: '0.775rem',
    fontWeight: '600',
    cursor: 'pointer',
    alignSelf: 'flex-start',
    marginTop: '0.25rem',
    padding: 0,
  },
};

export default CommentItem;
