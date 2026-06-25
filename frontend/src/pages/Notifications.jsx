import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { AnimatePresence, motion } from 'framer-motion';
import { getImageUrl } from '../utils/imageUrl';
import {
  Heart,
  MessageSquare,
  UserPlus,
  AtSign,
  Trash2,
  CheckCheck,
  Bell,
  AlertCircle,
  Eye,
} from 'lucide-react';
import InfiniteScroll from '../components/InfiniteScroll';

const Notifications = () => {
  const navigate = useNavigate();
  const {
    notifications: contextNotifications,
    loading: contextLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [notificationsList, setNotificationsList] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all' or 'unread'
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // Fetch initial notifications on mount or filter change
  const loadInitialNotifications = async (currentFilter = filter) => {
    setError('');
    setPage(1);
    try {
      const res = await fetchNotifications(1, 15, currentFilter === 'unread');
      setNotificationsList(res.data);
      setHasMore(res.pagination.page < res.pagination.pages);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError('Failed to load notifications. Please try again.');
    }
  };

  useEffect(() => {
    loadInitialNotifications(filter);
  }, [filter, fetchNotifications]);

  // Synchronize with context updates (e.g., when a live socket notification arrives)
  useEffect(() => {
    if (page === 1) {
      // If we are on the first page, just sync with context to show live events
      const isUnreadFilter = filter === 'unread';
      const filteredContext = contextNotifications.filter(
        (n) => !isUnreadFilter || !n.isRead
      );
      setNotificationsList(filteredContext.slice(0, 15));
    }
  }, [contextNotifications, filter, page]);

  // Load more pages
  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setError('');
    try {
      const nextPage = page + 1;
      const isUnreadFilter = filter === 'unread';
      const res = await fetchNotifications(nextPage, 15, isUnreadFilter);
      
      setNotificationsList((prev) => [...prev, ...res.data]);
      setPage(nextPage);
      setHasMore(res.pagination.page < res.pagination.pages);
    } catch (err) {
      console.error('Failed to load more notifications:', err);
      setError('Failed to load more notifications.');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      await markAsRead(notif._id);
    }
    navigate(notif.actionUrl);
  };

  const handleDeleteClick = async (e, id) => {
    e.stopPropagation();
    await deleteNotification(id);
    setNotificationsList((prev) => prev.filter((n) => n._id !== id));
  };

  const handleMarkAllReadClick = async () => {
    await markAllAsRead();
    setNotificationsList((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  // Helper to render type-specific icons
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like':
        return <Heart size={18} style={{ color: 'var(--accent)' }} />;
      case 'comment':
        return <MessageSquare size={18} style={{ color: 'var(--secondary)' }} />;
      case 'follow':
        return <UserPlus size={18} style={{ color: 'var(--primary)' }} />;
      case 'mention':
        return <AtSign size={18} style={{ color: 'var(--warning)' }} />;
      default:
        return <Bell size={18} style={{ color: 'var(--text-muted)' }} />;
    }
  };

  const getActorAvatar = (notif) => {
    const actor = notif.actor;
    if (actor && actor.profilePicture) {
      return getImageUrl(actor.profilePicture);
    }
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${actor?.username || 'user'}`;
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.titleRow}>
          <Bell size={28} style={styles.titleIcon} />
          <h2 style={styles.title}>Notifications</h2>
        </div>
        <p style={styles.subtitle}>Stay updated with interactions, follows, and mentions across the platform.</p>
      </header>

      {/* Action Bar */}
      <div style={styles.actionBar}>
        {/* Filter Tabs */}
        <div style={styles.tabContainer} className="glass-panel">
          <button
            onClick={() => setFilter('all')}
            style={{ ...styles.tab, ...(filter === 'all' ? styles.tabActive : {}) }}
          >
            All Notifications
          </button>
          <button
            onClick={() => setFilter('unread')}
            style={{ ...styles.tab, ...(filter === 'unread' ? styles.tabActive : {}) }}
          >
            Unread
          </button>
        </div>

        {/* Global Mark Read Button */}
        {notificationsList.some((n) => !n.isRead) && (
          <button onClick={handleMarkAllReadClick} className="btn-secondary" style={styles.markAllBtn}>
            <CheckCheck size={16} style={{ marginRight: '0.5rem' }} />
            Mark all read
          </button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div style={styles.errorContainer}>
          <AlertCircle size={20} style={{ color: 'var(--error)', flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Notifications List */}
      <div style={styles.listContainer}>
        {contextLoading && page === 1 ? (
          <div style={styles.loadingContainer}>
            <div className="spinner"></div>
            <span>Fetching notifications...</span>
          </div>
        ) : notificationsList.length === 0 ? (
          <div style={styles.emptyState} className="glass-panel">
            <Bell size={44} style={styles.emptyIcon} />
            <h3 style={styles.emptyTitle}>All caught up!</h3>
            <p style={styles.emptyText}>
              {filter === 'unread'
                ? "You don't have any unread notifications."
                : "You don't have any notifications yet. When users interact with you, they'll show up here."}
            </p>
          </div>
        ) : (
          <InfiniteScroll
            hasMore={hasMore}
            loading={loadingMore}
            onLoadMore={loadMore}
          >
            <div style={styles.list}>
              <AnimatePresence initial={false}>
                {notificationsList.map((notif) => (
                  <motion.div
                    key={notif._id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, x: -30 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => handleNotificationClick(notif)}
                    style={{
                      ...styles.card,
                      ...(notif.isRead ? styles.cardRead : styles.cardUnread),
                    }}
                    className="glass-card"
                  >
                    {/* Unread Glowing indicator dot */}
                    {!notif.isRead && <div style={styles.unreadDot} />}

                    {/* Actor Avatar */}
                    <img
                      src={getActorAvatar(notif)}
                      alt={notif.actor?.username || 'user'}
                      style={styles.avatar}
                      onError={(e) => {
                        e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${notif.actor?.username || 'user'}`;
                      }}
                    />

                    {/* Icon Bubble */}
                    <div style={styles.iconBubble}>
                      {getNotificationIcon(notif.type)}
                    </div>

                    {/* Content Section */}
                    <div style={styles.cardContent}>
                      <div style={styles.cardHeader}>
                        <span style={styles.cardTitle}>{notif.title}</span>
                        <span style={styles.time}>
                          {new Date(notif.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p style={styles.cardMessage}>{notif.message}</p>
                    </div>

                    {/* Action buttons */}
                    <div style={styles.actions}>
                      {!notif.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notif._id);
                          }}
                          style={styles.actionBtn}
                          title="Mark as read"
                        >
                          <Eye size={16} />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDeleteClick(e, notif._id)}
                        style={{ ...styles.actionBtn, ...styles.deleteBtn }}
                        title="Delete notification"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </InfiniteScroll>
        )}
      </div>
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
    gap: '0.25rem',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
  },
  titleIcon: {
    color: 'var(--primary)',
    filter: 'drop-shadow(var(--glow-primary))',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: 'var(--text-secondary)',
  },
  actionBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  tabContainer: {
    display: 'flex',
    padding: '0.35rem',
    gap: '0.25rem',
    borderRadius: 'var(--radius-md)',
  },
  tab: {
    padding: '0.55rem 1.25rem',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    fontWeight: '600',
    fontSize: '0.85rem',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  tabActive: {
    background: 'var(--bg-secondary)',
    color: 'var(--primary)',
    border: '1px solid var(--border-glass)',
  },
  markAllBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.6rem 1.2rem',
    fontSize: '0.85rem',
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
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '5rem 0',
    gap: '1rem',
    color: 'var(--text-secondary)',
  },
  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
  },
  emptyIcon: {
    color: 'var(--text-muted)',
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
  },
  emptyText: {
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
    maxWidth: '400px',
    lineHeight: '1.5',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    padding: '1rem 1.25rem',
    borderRadius: 'var(--radius-md)',
    gap: '1.25rem',
    cursor: 'pointer',
    position: 'relative',
    transition: 'transform var(--transition-fast)',
  },
  cardRead: {
    opacity: 0.85,
  },
  cardUnread: {
    borderLeft: '4px solid var(--primary)',
    background: 'hsla(265, 85%, 60%, 0.03)',
  },
  unreadDot: {
    position: 'absolute',
    left: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary)',
    boxShadow: '0 0 8px var(--primary)',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: 'var(--radius-full)',
    objectFit: 'cover',
    border: '1.5px solid var(--border-glass)',
    backgroundColor: 'var(--bg-secondary)',
  },
  iconBubble: {
    position: 'absolute',
    left: '42px',
    bottom: '8px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-glass)',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
  },
  cardContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
    flex: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  time: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  cardMessage: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    opacity: 0.6,
    transition: 'opacity var(--transition-fast)',
    ':hover': {
      opacity: 1,
    },
  },
  actionBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '0.4rem',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'var(--transition-fast)',
    ':hover': {
      background: 'hsla(0, 0%, 100%, 0.05)',
      color: 'var(--text-primary)',
    },
  },
  deleteBtn: {
    ':hover': {
      background: 'hsla(355, 75%, 50%, 0.1)',
      color: 'var(--error)',
    },
  },
};

export default Notifications;
