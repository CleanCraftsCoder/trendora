import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Heart, MessageSquare, UserPlus, AtSign, X } from 'lucide-react';
import api from '../utils/api';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]); // Array of { id, notification }

  const socketRef = useRef(null);

  // Helper: Get backend URL from Vite environment and convert to WebSocket origin
  const getSocketUrl = () => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    return apiBaseUrl.replace('/api', '');
  };

  // Action: Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!localStorage.getItem('accessToken')) return;
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.data.unreadCount);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  }, []);

  // Action: Fetch notifications list
  const fetchNotifications = useCallback(async (page = 1, limit = 20, unreadOnly = false) => {
    setLoading(true);
    try {
      const res = await api.get(`/notifications?page=${page}&limit=${limit}&unreadOnly=${unreadOnly}`);
      setNotifications(res.data.data);
      // Re-fetch unread count to keep it aligned
      fetchUnreadCount();
      return res.data;
    } catch (err) {
      console.error('Error fetching notifications list:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchUnreadCount]);

  // Action: Mark single notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}`);
      // Update local states
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  // Action: Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }, []);

  // Action: Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      const targetNotif = notifications.find((n) => n._id === notificationId);
      await api.delete(`/notifications/${notificationId}`);
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      if (targetNotif && !targetNotif.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  }, [notifications]);

  // Toast queue helpers
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((notification) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, notification }]);
    
    // Auto-dismiss after 4.5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  // Establish socket connection on user status change
  useEffect(() => {
    if (user) {
      // Connect to WebSocket Server
      const socketUrl = getSocketUrl();
      const socket = io(socketUrl, {
        auth: {
          token: localStorage.getItem('accessToken'),
        },
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('🔌 Connected to Trendora Live Sockets');
        fetchUnreadCount();
      });

      // Listen for incoming notifications
      socket.on('newNotification', (notification) => {
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
        addToast(notification);
      });

      socket.on('connect_error', (err) => {
        console.error('Socket connection authentication error:', err.message);
      });

      return () => {
        socket.off('newNotification');
        socket.disconnect();
        socketRef.current = null;
      };
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, fetchUnreadCount, addToast]);

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

  const getNotificationGlow = (type) => {
    switch (type) {
      case 'like':
        return '0 0 15px hsla(330, 85%, 55%, 0.3)';
      case 'comment':
        return '0 0 15px hsla(180, 85%, 45%, 0.3)';
      case 'follow':
        return '0 0 15px hsla(265, 85%, 60%, 0.3)';
      case 'mention':
        return '0 0 15px hsla(38, 85%, 50%, 0.3)';
      default:
        return 'none';
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        fetchUnreadCount,
      }}
    >
      {children}

      {/* Global Real-Time Toast Notifications Overlay Container */}
      <div style={styles.toastContainer}>
        <AnimatePresence>
          {toasts.map(({ id, notification }) => (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: -20, scale: 0.9, x: 50 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.85, x: 100, transition: { duration: 0.2 } }}
              whileHover={{ scale: 1.02 }}
              onClick={() => {
                navigate(notification.actionUrl);
                removeToast(id);
              }}
              style={{
                ...styles.toastCard,
                boxShadow: `var(--glass-shadow), ${getNotificationGlow(notification.type)}`,
              }}
            >
              {/* Type Icon */}
              <div style={styles.iconContainer}>
                {getNotificationIcon(notification.type)}
              </div>

              {/* Title & Message */}
              <div style={styles.content}>
                <h4 style={styles.toastTitle}>{notification.title}</h4>
                <p style={styles.toastMessage}>{notification.message}</p>
              </div>

              {/* Close Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeToast(id);
                }}
                style={styles.closeBtn}
              >
                <X size={14} />
              </button>

              {/* Timer Progress Indicator */}
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 4.5, ease: 'linear' }}
                style={styles.progressBar}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

const styles = {
  toastContainer: {
    position: 'fixed',
    top: '1.5rem',
    right: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    zIndex: 9999,
    pointerEvents: 'none',
  },
  toastCard: {
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    width: '360px',
    padding: '1.1rem 1.25rem',
    background: 'hsla(240, 15%, 10%, 0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid var(--border-glass)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    userSelect: 'none',
  },
  iconContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    background: 'hsla(0, 0%, 100%, 0.05)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-glass)',
    flexShrink: 0,
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
    flexGrow: 1,
    paddingRight: '1rem',
  },
  toastTitle: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  toastMessage: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.3',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.2rem',
    borderRadius: '50%',
    transition: 'var(--transition-fast)',
    flexShrink: 0,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: '3px',
    background: 'var(--primary-gradient)',
  },
};
