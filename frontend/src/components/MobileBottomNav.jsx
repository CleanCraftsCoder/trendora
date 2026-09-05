import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, Compass, Plus, Flame, User } from 'lucide-react';

const MobileBottomNav = () => {
  const { user } = useAuth();

  return (
    <nav style={styles.bottomNav} className="glass-panel mobile-only">
      <NavLink
        to="/"
        style={({ isActive }) => ({
          ...styles.navItem,
          ...(isActive ? styles.navItemActive : {}),
        })}
      >
        <Home size={22} />
        <span style={styles.navLabel}>Home</span>
      </NavLink>

      <NavLink
        to="/explore"
        style={({ isActive }) => ({
          ...styles.navItem,
          ...(isActive ? styles.navItemActive : {}),
        })}
      >
        <Compass size={22} />
        <span style={styles.navLabel}>Explore</span>
      </NavLink>

      <NavLink
        to="/posts/create"
        style={styles.createBtn}
        aria-label="Create Post"
      >
        <div style={styles.createIconWrapper}>
          <Plus size={24} color="#fff" strokeWidth={2.5} />
        </div>
      </NavLink>

      <NavLink
        to="/trending"
        style={({ isActive }) => ({
          ...styles.navItem,
          ...(isActive ? styles.navItemActive : {}),
        })}
      >
        <Flame size={22} />
        <span style={styles.navLabel}>Trending</span>
      </NavLink>

      <NavLink
        to={user ? `/profile/${user.username}` : '/login'}
        style={({ isActive }) => ({
          ...styles.navItem,
          ...(isActive ? styles.navItemActive : {}),
        })}
      >
        <User size={22} />
        <span style={styles.navLabel}>{user ? 'Profile' : 'Log In'}</span>
      </NavLink>
    </nav>
  );
};

const styles = {
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: '0 0.5rem',
    zIndex: 100,
    borderRadius: 0,
    borderBottom: 'none',
    borderLeft: 'none',
    borderRight: 'none',
    borderTop: '1px solid var(--border-glass)',
    backgroundColor: 'var(--bg-glass)',
    backdropFilter: 'var(--backdrop-blur)',
    WebkitBackdropFilter: 'var(--backdrop-blur)',
    boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.4)',
  },
  navItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    color: 'var(--text-muted)',
    textDecoration: 'none',
    flex: 1,
    padding: '0.35rem 0',
    transition: 'var(--transition-fast)',
  },
  navItemActive: {
    color: 'var(--secondary)',
    textShadow: '0 0 10px hsla(180, 85%, 45%, 0.5)',
  },
  navLabel: {
    fontSize: '0.65rem',
    fontWeight: '500',
    letterSpacing: '0.02em',
  },
  createBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    padding: '0 0.5rem',
    marginTop: '-8px',
  },
  createIconWrapper: {
    width: '42px',
    height: '42px',
    borderRadius: 'var(--radius-full)',
    background: 'var(--primary-gradient)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'var(--glow-primary)',
    transition: 'transform var(--transition-fast)',
  },
};

export default MobileBottomNav;
