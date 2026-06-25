import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { UserPlus, Check, UserMinus } from 'lucide-react';
import { getImageUrl } from '../utils/imageUrl';

const SuggestionsPanel = () => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionUserId, setActionUserId] = useState(null);
  const navigate = useNavigate();

  const fetchSuggestions = async () => {
    try {
      const res = await api.get('/users/suggestions?limit=5');
      setSuggestions(res.data.data);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSuggestions();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleFollow = async (userId) => {
    setActionUserId(userId);
    try {
      await api.post(`/users/${userId}/follow`);
      // Update follow status locally
      setSuggestions((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isFollowing: true } : u))
      );
      // Remove followed users from suggestions after 1.5 seconds for a clean experience
      setTimeout(() => {
        setSuggestions((prev) => prev.filter((u) => u.id !== userId));
      }, 1500);
    } catch (err) {
      console.error('Error following user:', err);
    } finally {
      setActionUserId(null);
    }
  };

  if (!user) {
    return (
      <div style={styles.panel} className="glass-panel">
        <h3 style={styles.title}>New to Trendora?</h3>
        <p style={styles.ctaText}>
          Sign up now to follow creators, like posts, and build your own feed.
        </p>
        <div style={styles.ctaButtons}>
          <button onClick={() => navigate('/signup')} className="btn-primary" style={styles.ctaBtn}>
            Create Account
          </button>
          <button onClick={() => navigate('/login')} className="btn-secondary" style={styles.ctaBtn}>
            Log In
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.panel} className="glass-panel">
        <h3 style={styles.title}>Who to follow</h3>
        <div style={styles.loadingContainer}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null; // Don't show panel if no suggestions
  }

  return (
    <div style={styles.panel} className="glass-panel">
      <h3 style={styles.title}>Who to follow</h3>
      <div style={styles.list}>
        {suggestions.map((suggestedUser) => (
          <div key={suggestedUser.id} style={styles.item}>
            <div
              style={styles.profileInfo}
              onClick={() => navigate(`/profile/${suggestedUser.username}`)}
            >
              <img
                src={suggestedUser.profilePicture ? getImageUrl(suggestedUser.profilePicture) : `https://api.dicebear.com/7.x/bottts/svg?seed=${suggestedUser.username}`}
                alt={suggestedUser.username}
                style={styles.avatar}
                onError={(e) => {
                  e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${suggestedUser.username}`;
                }}
              />
              <div style={styles.textContainer}>
                <span style={styles.name}>{suggestedUser.firstName} {suggestedUser.lastName}</span>
                <span style={styles.tag}>@{suggestedUser.username}</span>
              </div>
            </div>

            <button
              onClick={() => handleFollow(suggestedUser.id)}
              disabled={actionUserId === suggestedUser.id || suggestedUser.isFollowing}
              style={{
                ...styles.followBtn,
                ...(suggestedUser.isFollowing ? styles.followingBtn : {}),
              }}
            >
              {suggestedUser.isFollowing ? (
                <Check size={14} />
              ) : (
                <UserPlus size={14} />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  panel: {
    width: '320px',
    height: 'fit-content',
    position: 'sticky',
    top: '1rem',
    right: '1rem',
    padding: '1.5rem',
    margin: '1rem',
    zIndex: 90,
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '1.25rem',
    fontFamily: 'var(--font-sans)',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: '2rem 0',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
  },
  profileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    cursor: 'pointer',
    flex: 1,
    overflow: 'hidden',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: 'var(--radius-full)',
    objectFit: 'cover',
    border: '1.5px solid var(--border-glass)',
    background: 'var(--bg-secondary)',
  },
  textContainer: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  name: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
  },
  tag: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
  },
  followBtn: {
    background: 'var(--primary-gradient)',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    width: '32px',
    height: '32px',
    borderRadius: 'var(--radius-full)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'var(--transition-fast)',
    flexShrink: 0,
    boxShadow: 'var(--glow-primary)',
  },
  followingBtn: {
    background: 'hsla(145, 75%, 45%, 0.2)',
    color: 'var(--success)',
    boxShadow: 'none',
    border: '1px solid hsla(145, 75%, 45%, 0.3)',
    cursor: 'default',
  },
  ctaText: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
    marginBottom: '1.25rem',
  },
  ctaButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  ctaBtn: {
    width: '100%',
    padding: '0.65rem 1rem',
    fontSize: '0.9rem',
    fontWeight: '600',
    borderRadius: 'var(--radius-md)',
  },
};

export default SuggestionsPanel;
