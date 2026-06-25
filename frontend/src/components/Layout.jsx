import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import SuggestionsPanel from './SuggestionsPanel';

const Layout = () => {
  return (
    <div style={styles.layoutContainer}>
      {/* Background blobs for premium glassmorphism effect */}
      <div className="blob-container">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <main style={styles.mainContent}>
        <Outlet />
      </main>

      {/* Suggestions Panel */}
      <SuggestionsPanel />
    </div>
  );
};

const styles = {
  layoutContainer: {
    display: 'flex',
    minHeight: '100vh',
    width: '100%',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    position: 'relative',
    gap: '1rem',
  },
  mainContent: {
    flex: 1,
    padding: '2rem',
    minHeight: '100vh',
    maxWidth: '750px',
    margin: '0 auto',
    width: '100%',
    overflowY: 'auto',
  },
};

export default Layout;
