import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AuthGuard, GuestGuard } from './components/AuthGuard';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import Search from './pages/Search';
import CreatePost from './pages/CreatePost';
import PostDetails from './pages/PostDetails';
import PostEdit from './pages/PostEdit';
import Explore from './pages/Explore';
import Trending from './pages/Trending';
import Notifications from './pages/Notifications';
import ModerationQueue from './pages/ModerationQueue';
import { NotificationProvider } from './context/NotificationContext';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            {/* Guest Routes (Unauthenticated only) */}
            <Route element={<GuestGuard />}>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
            </Route>

            {/* Layout wrapping pages with sidebar navigation */}
            <Route element={<Layout />}>
              {/* Public Layout Routes */}
              <Route path="/explore" element={<Explore />} />
              <Route path="/trending" element={<Trending />} />

              {/* Protected Layout Routes */}
              <Route element={<AuthGuard />}>
                <Route path="/" element={<Home />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/search" element={<Search />} />
                <Route path="/profile/:username" element={<Profile />} />
                <Route path="/profile/:username/edit" element={<EditProfile />} />
                <Route path="/posts/create" element={<CreatePost />} />
                <Route path="/posts/:postId" element={<PostDetails />} />
                <Route path="/posts/:postId/edit" element={<PostEdit />} />
                <Route path="/moderation" element={<ModerationQueue />} />
              </Route>
            </Route>

            {/* Wildcard Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
