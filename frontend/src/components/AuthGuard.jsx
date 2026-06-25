import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Loading Spinner Component
export const LoadingScreen = () => {
  return (
    <div style={styles.container}>
      <div className="blob-container">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>
      <div className="glass-panel" style={styles.spinnerCard}>
        <div className="spinner" style={styles.spinner}></div>
        <h2 style={styles.text}>Trendora</h2>
        <p style={styles.subtext}>Loading experience...</p>
      </div>
    </div>
  );
};

// Route only allowed for authenticated users
export const AuthGuard = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

// Route only allowed for guests (unauthenticated users)
export const GuestGuard = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return !isAuthenticated ? <Outlet /> : <Navigate to="/" replace />;
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: 'var(--bg-primary)',
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 9999,
  },
  spinnerCard: {
    padding: '3rem 4rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.25rem',
    borderWidth: '1px',
    textAlign: 'center',
  },
  spinner: {
    width: '50px',
    height: '50px',
    borderWidth: '4px',
  },
  text: {
    fontSize: '2rem',
    fontWeight: '800',
    background: 'var(--primary-gradient)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  },
  subtext: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    margin: 0,
  },
};
