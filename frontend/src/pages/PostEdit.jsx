import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Globe, Users, Lock, AlertCircle, ArrowLeft } from 'lucide-react';

const PostEdit = () => {
  const { postId } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [post, setPost] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchPost = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/posts/${postId}`);
      const postData = res.data.data;
      
      // Authorization Check
      const authorId = postData.author?.id || postData.author?._id;
      if (currentUser?.id !== authorId) {
        setError('You are not authorized to edit this post.');
        setLoading(false);
        return;
      }

      setPost(postData);
      setCaption(postData.caption || '');
      setVisibility(postData.visibility || 'public');
    } catch (err) {
      console.error('Error fetching post:', err);
      setError(err.response?.data?.error?.message || 'Failed to load post details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPost();
  }, [postId, currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await api.put(`/posts/${postId}`, {
        caption,
        visibility,
      });

      navigate(`/posts/${postId}`);
    } catch (err) {
      console.error('Error updating post:', err);
      setError(err.response?.data?.error?.message || 'Failed to update post.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div className="spinner"></div>
        <span>Loading post details...</span>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div style={styles.errorContainer} className="glass-panel">
        <AlertCircle size={48} style={{ color: 'var(--error)' }} />
        <h3>Editing Error</h3>
        <p>{error || 'Post not found.'}</p>
        <button className="btn-primary" onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          <ArrowLeft size={18} />
          Back
        </button>
        <h2 style={styles.title}>Edit Post</h2>
        <p style={styles.subtitle}>Update your post caption or visibility settings.</p>
      </header>

      <form onSubmit={handleSubmit} style={styles.form} className="glass-panel">
        {/* Caption Form Input */}
        <div className="input-group">
          <label className="input-label">Caption</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Change your caption..."
            className="input-field"
            style={styles.textarea}
            rows={5}
            maxLength={2000}
            required
          />
          <span style={styles.charCount}>{caption.length}/2000</span>
        </div>

        {/* Visibility Form Input */}
        <div className="input-group">
          <label className="input-label">Post Visibility</label>
          <div style={styles.visibilityGrid}>
            <button
              type="button"
              onClick={() => setVisibility('public')}
              style={{
                ...styles.visibilityBtn,
                ...(visibility === 'public' ? styles.visibilityActive : {}),
              }}
            >
              <Globe size={16} />
              <span>Public</span>
            </button>
            <button
              type="button"
              onClick={() => setVisibility('friends')}
              style={{
                ...styles.visibilityBtn,
                ...(visibility === 'friends' ? styles.visibilityActive : {}),
              }}
            >
              <Users size={16} />
              <span>Followers</span>
            </button>
            <button
              type="button"
              onClick={() => setVisibility('private')}
              style={{
                ...styles.visibilityBtn,
                ...(visibility === 'private' ? styles.visibilityActive : {}),
              }}
            >
              <Lock size={16} />
              <span>Only Me</span>
            </button>
          </div>
        </div>

        {/* Submit Actions */}
        <div style={styles.actions}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
            style={styles.actionBtn}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
            style={styles.actionBtn}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    alignItems: 'flex-start',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: 0,
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'var(--transition-fast)',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
    marginTop: '0.5rem',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: 'var(--text-secondary)',
  },
  form: {
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  textarea: {
    width: '100%',
    resize: 'none',
    lineHeight: '1.5',
  },
  charCount: {
    alignSelf: 'flex-end',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '-0.25rem',
  },
  visibilityGrid: {
    display: 'flex',
    gap: '1rem',
    width: '100%',
  },
  visibilityBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-glass)',
    background: 'hsla(240, 15%, 5%, 0.3)',
    color: 'var(--text-secondary)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  visibilityActive: {
    background: 'var(--bg-secondary)',
    color: 'var(--secondary)',
    borderColor: 'var(--secondary)',
    boxShadow: 'var(--glow-secondary)',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    marginTop: '1rem',
  },
  actionBtn: {
    minWidth: '130px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    gap: '1rem',
    color: 'var(--text-secondary)',
  },
  errorContainer: {
    padding: '3rem 2rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.25rem',
  },
};

export default PostEdit;
