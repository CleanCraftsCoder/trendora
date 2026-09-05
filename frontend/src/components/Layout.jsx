import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import SuggestionsPanel from './SuggestionsPanel';
import MobileTopBar from './MobileTopBar';
import MobileBottomNav from './MobileBottomNav';

const Layout = () => {
  return (
    <div className="layout-root">
      {/* Background blobs for premium glassmorphism effect */}
      <div className="blob-container">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      {/* Mobile Top Header (only visible on mobile screens <= 768px) */}
      <MobileTopBar />

      <div className="layout-container">
        {/* Desktop Sidebar (hidden on mobile screens <= 768px) */}
        <div className="desktop-sidebar-container">
          <Sidebar />
        </div>

        {/* Main Content Area */}
        <main className="main-content-layout">
          <Outlet />
        </main>

        {/* Suggestions Panel (hidden on screens <= 1100px) */}
        <div className="desktop-suggestions-container">
          <SuggestionsPanel />
        </div>
      </div>

      {/* Mobile Bottom Navigation (only visible on mobile screens <= 768px) */}
      <MobileBottomNav />
    </div>
  );
};

export default Layout;
