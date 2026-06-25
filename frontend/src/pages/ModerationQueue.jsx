import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Shield, ShieldAlert, Check, Trash2, ShieldOff, AlertCircle, FileText, MessageSquare } from 'lucide-react';
import { getImageUrl } from '../utils/imageUrl';

const ModerationQueue = () => {
  const { user, setUser } = useAuth();
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'comments'
  const [actionInProgress, setActionInProgress] = useState(null); // stores id of target item being resolved

  const fetchQueue = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/moderation/queue');
      const { posts: reviewPosts, comments: reviewComments } = res.data.data;
      setPosts(reviewPosts || []);
      setComments(reviewComments || []);
    } catch (err) {
      console.error('Failed to fetch moderation queue:', err);
      setError(err.response?.data?.error?.message || 'Failed to load moderation review queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchQueue();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleToggleRole = async () => {
    try {
      const res = await api.post('/moderation/toggle-role');
      const { role } = res.data.data;
      setUser((prev) => ({ ...prev, role }));
    } catch (err) {
      console.error('Failed to toggle role:', err);
    }
  };

  const handleResolve = async (targetType, targetId, action) => {
    setActionInProgress(targetId);
    try {
      await api.post('/moderation/resolve', { targetType, targetId, action });
      
      // Update local state by removing resolved item
      if (targetType === 'post') {
        setPosts((prev) => prev.filter((p) => p._id !== targetId));
      } else {
        setComments((prev) => prev.filter((c) => c._id !== targetId));
      }
    } catch (err) {
      console.error('Resolution failed:', err);
      alert('Failed to resolve content moderation action. Please try again.');
    } finally {
      setActionInProgress(null);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <h2 style={styles.title}>Content Moderation Center</h2>
          <p style={styles.subtitle}>Manage flagged posts and comment review queues.</p>
        </header>

        <div style={styles.deniedCard} className="glass-panel">
          <ShieldOff size={50} style={{ color: 'var(--error)', filter: 'drop-shadow(var(--glow-error, 0 0 10px rgba(255, 0, 0, 0.2)))' }} />
          <h3 style={styles.cardTitle}>Access Denied</h3>
          <p style={styles.cardText}>
            You must have administrator privileges to view the Moderation Review Queue.
            Use the developer helper below to simulate toggling your role to <strong>admin</strong>.
          </p>
          <button className="btn-primary" onClick={handleToggleRole} style={styles.toggleBtn}>
            <Shield size={16} style={{ marginRight: '0.5rem' }} />
            Simulate Admin Role
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <div style={styles.headerTitles}>
            <h2 style={styles.title}>Content Moderation Center 🛡️</h2>
            <p style={styles.subtitle}>Review items flagged by the Trendora Vision/Text Moderation AI.</p>
          </div>
          <button className="btn-secondary" onClick={handleToggleRole} style={styles.toggleBtn}>
            <ShieldOff size={16} style={{ marginRight: '0.5rem' }} />
            Revoke Admin Role
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div style={styles.tabsContainer} className="glass-panel">
        <button
          onClick={() => setActiveTab('posts')}
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'posts' ? styles.activeTabBtn : {}),
          }}
        >
          <FileText size={16} />
          <span>Flagged Posts ({posts.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('comments')}
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'comments' ? styles.activeTabBtn : {}),
          }}
        >
          <MessageSquare size={16} />
          <span>Flagged Comments ({comments.length})</span>
        </button>
      </div>

      {loading ? (
        <div style={styles.loadingContainer}>
          <div className="spinner"></div>
          <span>Loading queue items...</span>
        </div>
      ) : error ? (
        <div style={styles.errorContainer}>
          <AlertCircle size={20} style={{ color: 'var(--error)', flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      ) : (
        <div style={styles.queueList}>
          {activeTab === 'posts' ? (
            posts.length === 0 ? (
              <div style={styles.emptyCard} className="glass-panel">
                <Shield size={40} style={{ color: 'var(--secondary)' }} />
                <h3>All Clear!</h3>
                <p>There are no flagged or pending review posts at this time.</p>
              </div>
            ) : (
              posts.map((postItem) => (
                <div key={postItem._id} style={styles.itemCard} className="glass-panel">
                  <div style={styles.cardMeta}>
                    <div style={styles.userInfo}>
                      <img
                        src={postItem.author?.profilePicture ? getImageUrl(postItem.author.profilePicture) : `https://api.dicebear.com/7.x/bottts/svg?seed=${postItem.author?.username}`}
                        alt={postItem.author?.username}
                        style={styles.avatar}
                      />
                      <div>
                        <span style={styles.fullName}>{postItem.author?.firstName} {postItem.author?.lastName}</span>
                        <span style={styles.metaText}>@{postItem.author?.username} • Created: {new Date(postItem.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <div style={styles.badgeContainer}>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: postItem.moderationStatus === 'flagged' ? 'rgba(255, 0, 0, 0.15)' : 'rgba(255, 170, 0, 0.15)',
                        color: postItem.moderationStatus === 'flagged' ? 'var(--error)' : '#ffaa00',
                      }}>
                        {postItem.moderationStatus.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div style={styles.reasonBlock}>
                    <ShieldAlert size={16} style={{ color: 'var(--error)', flexShrink: 0 }} />
                    <span style={styles.reasonText}><strong>AI Reason:</strong> {postItem.moderationReason || 'Flagged for content review'}</span>
                  </div>

                  <div style={styles.contentPreview}>
                    <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>Post Caption:</h5>
                    <p style={styles.previewText}>{postItem.caption}</p>
                    
                    {postItem.images && postItem.images.length > 0 && (
                      <div style={styles.imageGrid}>
                        {postItem.images.map((img, index) => (
                          <img
                            key={index}
                            src={getImageUrl(img)}
                            alt="Flagged upload preview"
                            style={styles.previewImg}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={styles.cardActions}>
                    <button
                      className="btn-secondary"
                      style={styles.approveBtn}
                      onClick={() => handleResolve('post', postItem._id, 'approve')}
                      disabled={actionInProgress === postItem._id}
                    >
                      <Check size={16} style={{ marginRight: '0.5rem' }} />
                      Approve & Restore
                    </button>
                    <button
                      className="btn-primary"
                      style={styles.deleteBtn}
                      onClick={() => handleResolve('post', postItem._id, 'delete')}
                      disabled={actionInProgress === postItem._id}
                    >
                      <Trash2 size={16} style={{ marginRight: '0.5rem' }} />
                      Delete Content
                    </button>
                  </div>
                </div>
              ))
            )
          ) : comments.length === 0 ? (
            <div style={styles.emptyCard} className="glass-panel">
              <Shield size={40} style={{ color: 'var(--secondary)' }} />
              <h3>All Clear!</h3>
              <p>There are no flagged or pending review comments at this time.</p>
            </div>
          ) : (
            comments.map((commentItem) => (
              <div key={commentItem._id} style={styles.itemCard} className="glass-panel">
                <div style={styles.cardMeta}>
                  <div style={styles.userInfo}>
                    <img
                      src={commentItem.author?.profilePicture ? getImageUrl(commentItem.author.profilePicture) : `https://api.dicebear.com/7.x/bottts/svg?seed=${commentItem.author?.username}`}
                      alt={commentItem.author?.username}
                      style={styles.avatar}
                    />
                    <div>
                      <span style={styles.fullName}>{commentItem.author?.firstName} {commentItem.author?.lastName}</span>
                      <span style={styles.metaText}>@{commentItem.author?.username} • Commented: {new Date(commentItem.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <div style={styles.badgeContainer}>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: commentItem.moderationStatus === 'flagged' ? 'rgba(255, 0, 0, 0.15)' : 'rgba(255, 170, 0, 0.15)',
                      color: commentItem.moderationStatus === 'flagged' ? 'var(--error)' : '#ffaa00',
                    }}>
                      {commentItem.moderationStatus.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div style={styles.reasonBlock}>
                  <ShieldAlert size={16} style={{ color: 'var(--error)', flexShrink: 0 }} />
                  <span style={styles.reasonText}><strong>AI Reason:</strong> {commentItem.moderationReason || 'Flagged for text content review'}</span>
                </div>

                <div style={styles.contentPreview}>
                  <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>Comment Text:</h5>
                  <p style={styles.previewText}>{commentItem.text}</p>
                </div>

                <div style={styles.cardActions}>
                  <button
                    className="btn-secondary"
                    style={styles.approveBtn}
                    onClick={() => handleResolve('comment', commentItem._id, 'approve')}
                    disabled={actionInProgress === commentItem._id}
                  >
                    <Check size={16} style={{ marginRight: '0.5rem' }} />
                    Approve & Restore
                  </button>
                  <button
                    className="btn-primary"
                    style={styles.deleteBtn}
                    onClick={() => handleResolve('comment', commentItem._id, 'delete')}
                    disabled={actionInProgress === commentItem._id}
                  >
                    <Trash2 size={16} style={{ marginRight: '0.5rem' }} />
                    Delete Content
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    width: '100%',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    width: '100%',
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  headerTitles: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: 'var(--text-secondary)',
  },
  toggleBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.6rem 1.25rem',
    fontSize: '0.9rem',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
  },
  deniedCard: {
    padding: '4rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '1.5rem',
    maxWidth: '600px',
    alignSelf: 'center',
    marginTop: '2rem',
  },
  cardTitle: {
    fontSize: '1.75rem',
    fontWeight: '800',
    margin: 0,
    color: 'var(--text-primary)',
  },
  cardText: {
    color: 'var(--text-secondary)',
    fontSize: '0.98rem',
    lineHeight: '1.6',
    margin: 0,
  },
  tabsContainer: {
    display: 'flex',
    padding: '0.4rem',
    gap: '0.5rem',
    borderRadius: 'var(--radius-md)',
  },
  tabBtn: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    padding: '0.75rem',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.92rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    transition: 'var(--transition-fast)',
  },
  activeTabBtn: {
    background: 'var(--bg-secondary)',
    color: 'var(--secondary)',
    boxShadow: 'var(--glow-secondary, 0 0 10px rgba(0, 242, 254, 0.15))',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem',
    gap: '1rem',
    color: 'var(--text-secondary)',
  },
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    backgroundColor: 'hsla(355, 75%, 50%, 0.1)',
    border: '1px solid hsla(355, 75%, 50%, 0.25)',
    padding: '1rem',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
  },
  emptyCard: {
    padding: '4rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: '1rem',
  },
  queueList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  itemCard: {
    padding: '1.5rem',
    borderRadius: 'var(--radius-lg)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    textAlign: 'left',
  },
  cardMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  avatar: {
    width: '42px',
    height: '42px',
    borderRadius: 'var(--radius-full)',
    objectFit: 'cover',
    border: '1.5px solid var(--border-glass)',
    background: 'var(--bg-secondary)',
  },
  fullName: {
    fontWeight: '700',
    fontSize: '0.98rem',
    color: 'var(--text-primary)',
    display: 'block',
  },
  metaText: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    fontWeight: '500',
  },
  badgeContainer: {
    display: 'flex',
    alignItems: 'center',
  },
  statusBadge: {
    fontSize: '0.72rem',
    padding: '0.2rem 0.6rem',
    borderRadius: 'var(--radius-sm)',
    fontWeight: '800',
    letterSpacing: '0.05em',
  },
  reasonBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: 'rgba(255, 0, 0, 0.05)',
    border: '1px solid rgba(255, 0, 0, 0.15)',
    padding: '0.6rem 1rem',
    borderRadius: 'var(--radius-sm)',
  },
  reasonText: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
  },
  contentPreview: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    border: '1px solid var(--border-glass)',
    padding: '1rem',
    borderRadius: 'var(--radius-md)',
  },
  previewText: {
    fontSize: '0.92rem',
    color: 'var(--text-secondary)',
    margin: 0,
    lineHeight: '1.5',
  },
  imageGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    marginTop: '0.75rem',
  },
  previewImg: {
    width: '100px',
    height: '100px',
    objectFit: 'cover',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-glass)',
  },
  cardActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    borderTop: '1px solid var(--border-glass)',
    paddingTop: '1rem',
    marginTop: '0.5rem',
  },
  approveBtn: {
    minWidth: '160px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  deleteBtn: {
    minWidth: '160px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backgroundColor: 'var(--error)',
  },
};

export default ModerationQueue;
