import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Home, Search, User, LogOut, Compass, PlusSquare, Flame, Bell, ShieldAlert } from 'lucide-react';
import { getImageUrl } from '../utils/imageUrl';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const navItems = [
    { name: 'Home', path: '/', icon: <Home size={22} /> },
    { name: 'Explore', path: '/explore', icon: <Compass size={22} /> },
    { name: 'Trending', path: '/trending', icon: <Flame size={22} /> },
    { name: 'Search', path: '/search', icon: <Search size={22} /> },
    { name: 'Create', path: '/posts/create', icon: <PlusSquare size={22} /> },
  ];

  if (user) {
    // Insert Notifications right before Create (index 4)
    navItems.splice(4, 0, { name: 'Notifications', path: '/notifications', icon: <Bell size={22} /> });
    navItems.push({ name: 'Profile', path: `/profile/${user.username}`, icon: <User size={22} /> });
    
    // Add Moderation Queue tab if user has administrator privileges
    if (user.role === 'admin') {
      navItems.push({ name: 'Moderation', path: '/moderation', icon: <ShieldAlert size={22} /> });
    }
  }

  return (
    <aside style={styles.sidebar} className="glass-panel">
      <div>
        {/* Logo Section */}
        <div style={styles.logoContainer} onClick={() => navigate('/')}>
          <h1 style={styles.logo}>Trendora</h1>
        </div>

        {/* Navigation Links */}
        <nav style={styles.nav}>
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              style={({ isActive }) => ({
                ...styles.navLink,
                ...(isActive ? styles.navLinkActive : {}),
              })}
            >
              <span style={styles.icon}>
                {item.icon}
                {item.name === 'Notifications' && unreadCount > 0 && (
                  <span style={styles.badge}>{unreadCount}</span>
                )}
              </span>
              <span style={styles.navText}>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User Profile Info Footer */}
      {user ? (
        <div style={styles.footer}>
          <div style={styles.userCard} onClick={() => navigate(`/profile/${user.username}`)}>
            <img
              src={user.profilePicture ? getImageUrl(user.profilePicture) : `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
              alt={user.username}
              style={styles.avatar}
              onError={(e) => {
                e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`;
              }}
            />
            <div style={styles.userInfo}>
              <span style={styles.userName}>{user.firstName} {user.lastName}</span>
              <span style={styles.userTag}>@{user.username}</span>
            </div>
          </div>

          <button onClick={handleLogout} style={styles.logoutBtn} title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      ) : (
        <div style={styles.footerGuest}>
          <button onClick={() => navigate('/login')} className="btn-primary" style={styles.loginBtn}>
            Log In
          </button>
          <button onClick={() => navigate('/signup')} className="btn-secondary" style={styles.signupBtn}>
            Sign Up
          </button>
        </div>
      )}
    </aside>
  );
};

const styles = {
  sidebar: {
    width: '280px',
    height: 'calc(100vh - 2rem)',
    position: 'sticky',
    top: '1rem',
    left: '1rem',
    padding: '2rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    zIndex: 100,
    margin: '1rem',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--glass-shadow)',
  },
  logoContainer: {
    cursor: 'pointer',
    marginBottom: '3rem',
  },
  logo: {
    fontSize: '2.2rem',
    fontWeight: '800',
    background: 'var(--primary-gradient)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.03em',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    padding: '1rem 1.25rem',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-secondary)',
    fontSize: '1.05rem',
    fontWeight: '500',
    transition: 'var(--transition-fast)',
    border: '1px solid transparent',
  },
  navLinkActive: {
    background: 'hsla(265, 85%, 60%, 0.15)',
    color: 'var(--text-primary)',
    borderColor: 'hsla(265, 85%, 60%, 0.25)',
    boxShadow: 'var(--glow-primary)',
  },
  icon: {
    marginRight: '1rem',
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: '-6px',
    right: '-6px',
    backgroundColor: 'var(--error)',
    color: '#fff',
    fontSize: '0.65rem',
    fontWeight: '800',
    borderRadius: '50%',
    minWidth: '15px',
    height: '15px',
    padding: '0 2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 8px var(--error)',
    lineHeight: 1,
  },
  navText: {
    fontFamily: 'var(--font-sans)',
  },
  footer: {
    borderTop: '1px solid var(--border-glass)',
    paddingTop: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.5rem',
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    cursor: 'pointer',
    flex: 1,
    overflow: 'hidden',
  },
  avatar: {
    width: '44px',
    height: '44px',
    borderRadius: 'var(--radius-full)',
    objectFit: 'cover',
    border: '2px solid var(--border-glass)',
    background: 'var(--bg-secondary)',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  userName: {
    color: 'var(--text-primary)',
    fontWeight: '600',
    fontSize: '0.95rem',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
  },
  userTag: {
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
  },
  logoutBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '0.5rem',
    borderRadius: 'var(--radius-sm)',
    transition: 'var(--transition-fast)',
    display: 'flex',
    alignItems: 'center',
  },
  footerGuest: {
    borderTop: '1px solid var(--border-glass)',
    paddingTop: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    width: '100%',
  },
  loginBtn: {
    width: '100%',
    padding: '0.65rem 1.25rem',
    fontSize: '0.95rem',
    fontWeight: '600',
    borderRadius: 'var(--radius-md)',
  },
  signupBtn: {
    width: '100%',
    padding: '0.65rem 1.25rem',
    fontSize: '0.95rem',
    fontWeight: '600',
    borderRadius: 'var(--radius-md)',
  },
};
styles.logoutBtn[':hover'] = {
  color: 'var(--error)',
  background: 'rgba(255, 0, 0, 0.1)',
};

export default Sidebar;
