import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Bell, Search } from 'lucide-react';
import { getImageUrl } from '../utils/imageUrl';

const MobileTopBar = () => {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  return (
    <header style={styles.header} className="glass-panel mobile-only">
      <div style={styles.logoContainer} onClick={() => navigate('/')}>
        <h1 style={styles.logo}>Trendora</h1>
      </div>

      <div style={styles.actions}>
        <button
          type="button"
          onClick={() => navigate('/search')}
          style={styles.iconBtn}
          title="Search"
          aria-label="Search"
        >
          <Search size={20} />
        </button>

        {user && (
          <button
            type="button"
            onClick={() => navigate('/notifications')}
            style={styles.iconBtn}
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span style={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>
        )}

        {user ? (
          <div 
            style={styles.avatarBtn} 
            onClick={() => navigate(`/profile/${user.username}`)}
            title="My Profile"
          >
            <img
              src={user.profilePicture ? getImageUrl(user.profilePicture) : `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
              alt={user.username}
              style={styles.avatar}
              onError={(e) => {
                e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`;
              }}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="btn-primary"
            style={styles.loginBtn}
          >
            Log In
          </button>
        )}
      </div>
    </header>
  );
};

const styles = {
  header: {
    position: 'sticky',
    top: 0,
    left: 0,
    right: 0,
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 1rem',
    zIndex: 99,
    borderRadius: 0,
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: 'none',
    borderBottom: '1px solid var(--border-glass)',
    backgroundColor: 'var(--bg-glass)',
    backdropFilter: 'var(--backdrop-blur)',
    WebkitBackdropFilter: 'var(--backdrop-blur)',
  },
  logoContainer: {
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  logo: {
    fontSize: '1.6rem',
    fontWeight: '800',
    background: 'var(--primary-gradient)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.03em',
    margin: 0,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  iconBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.4rem',
    borderRadius: 'var(--radius-full)',
  },
  badge: {
    position: 'absolute',
    top: '0px',
    right: '0px',
    backgroundColor: 'var(--error)',
    color: '#fff',
    fontSize: '0.6rem',
    fontWeight: '800',
    borderRadius: 'var(--radius-full)',
    minWidth: '16px',
    height: '16px',
    padding: '0 3px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 6px var(--error)',
  },
  avatarBtn: {
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: 'var(--radius-full)',
    objectFit: 'cover',
    border: '1.5px solid var(--secondary)',
  },
  loginBtn: {
    padding: '0.35rem 0.85rem',
    fontSize: '0.8rem',
    borderRadius: 'var(--radius-sm)',
  },
};

export default MobileTopBar;
