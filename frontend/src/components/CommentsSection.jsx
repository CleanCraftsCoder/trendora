import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import CommentItem from './CommentItem';
import CommentForm from './CommentForm';

const CommentsSection = ({ postId, initialCommentsCount }) => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [commentsCount, setCommentsCount] = useState(initialCommentsCount || 0);

  const fetchComments = async (pageNum = 1) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const res = await api.get(`/posts/${postId}/comments?page=${pageNum}&limit=10`);
      const { data, pagination } = res.data;
      if (pageNum === 1) {
        setComments(data);
      } else {
        setComments((prev) => [...prev, ...data]);
      }
      setPage(pagination.page);
      setTotalPages(pagination.pages);
      setCommentsCount(pagination.total);
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchComments(1);
  }, [postId]);

  const handleCreateComment = async (text) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    try {
      const res = await api.post(`/posts/${postId}/comments`, { text });
      // Add the new comment at the top of the list
      setComments((prev) => [res.data.data, ...prev]);
      setCommentsCount((prev) => prev + 1);
    } catch (err) {
      console.error('Failed to post comment:', err);
      alert('Failed to post comment.');
    }
  };

  const handleDeleteSuccess = (deletedCommentId) => {
    setComments((prev) => prev.filter((c) => c._id !== deletedCommentId));
    setCommentsCount((prev) => Math.max(0, prev - 1));
  };

  const handleUpdateSuccess = (updatedCommentId, newText) => {
    setComments((prev) =>
      prev.map((c) => (c._id === updatedCommentId ? { ...c, text: newText, isEdited: true } : c))
    );
  };

  const loadMore = () => {
    if (page < totalPages && !loadingMore) {
      fetchComments(page + 1);
    }
  };

  return (
    <div style={styles.container} className="glass-panel">
      <div style={styles.header}>
        <h4 style={styles.title}>Comments ({commentsCount})</h4>
      </div>

      {/* New Root Comment Form */}
      {currentUser ? (
        <div style={styles.formContainer}>
          <CommentForm
            placeholder="Share your feedback or thoughts..."
            onSubmit={handleCreateComment}
            submitLabel="Post"
          />
        </div>
      ) : (
        <div style={styles.loginPrompt}>
          <span>Please </span>
          <button onClick={() => navigate('/login')} style={styles.loginLink}>log in</button>
          <span> to join the conversation.</span>
        </div>
      )}

      {/* Comments List */}
      <div style={styles.list}>
        {loading && page === 1 ? (
          <div style={styles.loader}>
            <div className="spinner"></div>
            <span>Loading comments...</span>
          </div>
        ) : comments.length === 0 ? (
          <div style={styles.emptyState}>
            <span>No comments yet. Be the first to share your thoughts!</span>
          </div>
        ) : (
          <>
            {comments.map((commentItem) => (
              <CommentItem
                key={commentItem._id}
                comment={commentItem}
                postId={postId}
                onDeleteSuccess={handleDeleteSuccess}
                onUpdateSuccess={handleUpdateSuccess}
              />
            ))}

            {page < totalPages && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="btn-secondary"
                style={styles.loadMoreBtn}
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    marginTop: '1.5rem',
    width: '100%',
  },
  header: {
    borderBottom: '1px solid var(--border-glass)',
    paddingBottom: '0.75rem',
  },
  title: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  formContainer: {
    width: '100%',
  },
  loginPrompt: {
    padding: '1rem',
    background: 'rgba(0,0,0,0.15)',
    borderRadius: 'var(--radius-md)',
    textAlign: 'center',
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-glass)',
  },
  loginLink: {
    background: 'transparent',
    border: 'none',
    color: 'var(--secondary)',
    fontWeight: '600',
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
    fontSize: '0.9rem',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
  },
  loader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    padding: '2rem 0',
    color: 'var(--text-secondary)',
  },
  emptyState: {
    textAlign: 'center',
    padding: '2.5rem 0',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
  },
  loadMoreBtn: {
    alignSelf: 'center',
    marginTop: '1.25rem',
    padding: '0.5rem 1.5rem',
    fontSize: '0.85rem',
  },
};

export default CommentsSection;
