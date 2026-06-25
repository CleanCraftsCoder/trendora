import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Search, Compass, AlertCircle } from 'lucide-react';
import api from '../utils/api';
import PostCard from '../components/PostCard';
import InfiniteScroll from '../components/InfiniteScroll';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const [abConfig, setAbConfig] = useState({ abGroup: '', algorithm: '' });
  const [togglingGroup, setTogglingGroup] = useState(false);

  const fetchFeed = async (nextCursor = null) => {
    if (!nextCursor) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError('');
    try {
      const url = nextCursor ? `/feed?cursor=${encodeURIComponent(nextCursor)}&limit=10` : '/feed?limit=10';
      const res = await api.get(url);
      const { data, pagination, meta } = res.data;
      
      if (!nextCursor) {
        setPosts(data);
      } else {
        setPosts((prev) => [...prev, ...data]);
      }
      setCursor(pagination.nextCursor);
      setHasMore(pagination.hasMore);
      if (meta) {
        setAbConfig(meta);
      }
    } catch (err) {
      console.error('Error fetching feed posts:', err);
      setError(err.response?.data?.error?.message || 'Failed to load posts.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleToggleABGroup = async () => {
    setTogglingGroup(true);
    try {
      const res = await api.post('/feed/toggle-group');
      const { data } = res.data;
      setAbConfig(data);
      // Clear posts and reload feed with the new group settings
      setCursor(null);
      setPosts([]);
      setLoading(true);
      
      // We directly fetch the new feed after toggling
      const url = '/feed?limit=10';
      const feedRes = await api.get(url);
      const { data: feedData, pagination: feedPagination, meta: feedMeta } = feedRes.data;
      setPosts(feedData);
      setCursor(feedPagination.nextCursor);
      setHasMore(feedPagination.hasMore);
      if (feedMeta) {
        setAbConfig(feedMeta);
      }
    } catch (err) {
      console.error('Failed to toggle A/B group:', err);
    } finally {
      setTogglingGroup(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed(null);
  }, []);

  const loadMore = () => {
    if (hasMore && !loadingMore) {
      fetchFeed(cursor);
    }
  };

  const handleDeleteSuccess = (deletedId) => {
    setPosts((prev) => prev.filter((post) => post._id !== deletedId));
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <div style={styles.headerTitles}>
            <h2 style={styles.title}>Welcome back, {user?.firstName}!</h2>
            <p style={styles.subtitle}>Here is what is happening with your Trendora network today.</p>
          </div>
          {abConfig.abGroup && (
            <div style={styles.abBadgeContainer} className="glass-panel">
              <span style={styles.abGroupText}>
                Group {abConfig.abGroup}: <strong style={{ color: abConfig.abGroup === 'A' ? 'var(--secondary)' : 'var(--text-primary)' }}>{abConfig.abGroup === 'A' ? 'AI Recommendation 🤖' : 'Chronological ⏳'}</strong>
              </span>
              <button 
                onClick={handleToggleABGroup} 
                disabled={togglingGroup} 
                className="btn-primary" 
                style={styles.toggleBtn}
              >
                {togglingGroup ? 'Switching...' : 'Switch Model'}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Stats Summary Card */}
      <div style={styles.statsCard} className="glass-panel">
        <div style={styles.stat} onClick={() => navigate(`/profile/${user?.username}`)}>
          <span style={styles.statVal}>{user?.postsCount || 0}</span>
          <span style={styles.statLabel}>Posts</span>
        </div>
        <div style={styles.divider}></div>
        <div style={styles.stat} onClick={() => navigate(`/profile/${user?.username}`)} className="clickable-stat">
          <span style={styles.statVal}>{user?.followersCount || 0}</span>
          <span style={styles.statLabel}>Followers</span>
        </div>
        <div style={styles.divider}></div>
        <div style={styles.stat} onClick={() => navigate(`/profile/${user?.username}`)} className="clickable-stat">
          <span style={styles.statVal}>{user?.followingCount || 0}</span>
          <span style={styles.statLabel}>Following</span>
        </div>
      </div>

      {/* Post Feed or Discovery Fallback */}
      <div style={styles.feedContainer}>
        <h3 style={styles.feedTitle}>Your Feed</h3>

        {loading && !cursor ? (
          <div style={styles.loadingContainer}>
            <div className="spinner"></div>
            <span>Loading your feed...</span>
          </div>
        ) : error ? (
          <div style={styles.errorContainer}>
            <AlertCircle size={20} style={{ color: 'var(--error)', flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        ) : posts.length === 0 ? (
          /* Discover / Prompt Card Fallback */
          <div style={styles.discoverCard} className="glass-panel">
            <Compass size={40} style={styles.icon} />
            <h3 style={styles.cardTitle}>Build Your Social Network</h3>
            <p style={styles.cardText}>
              There are no posts in your feed yet.
              Start exploring today by searching for other creators or following people recommended in the sidebar!
            </p>
            <button className="btn-primary" onClick={() => navigate('/search')} style={styles.searchBtn}>
              <Search size={16} style={{ marginRight: '0.5rem' }} />
              Search Creators
            </button>
          </div>
        ) : (
          <InfiniteScroll
            hasMore={hasMore}
            loading={loadingMore}
            onLoadMore={loadMore}
          >
            <div style={styles.postsList}>
              {posts.map((postItem) => (
                <PostCard
                  key={postItem._id}
                  post={postItem}
                  onDeleteSuccess={handleDeleteSuccess}
                />
              ))}
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
    gap: '2rem',
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
    width: '100%',
  },
  headerTitles: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  abBadgeContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.6rem 1rem',
    borderRadius: 'var(--radius-md)',
  },
  abGroupText: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
  },
  toggleBtn: {
    padding: '0.4rem 0.8rem',
    fontSize: '0.8rem',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
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
  statsCard: {
    display: 'flex',
    justifyContent: 'space-around',
    padding: '1.5rem',
    alignItems: 'center',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer',
    flex: 1,
  },
  statVal: {
    fontSize: '2rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
  },
  statLabel: {
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-muted)',
    fontWeight: '600',
    marginTop: '0.25rem',
  },
  divider: {
    width: '1px',
    height: '40px',
    backgroundColor: 'var(--border-glass)',
  },
  feedContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  feedTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  postsList: {
    display: 'flex',
    flexDirection: 'column',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
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
  loadMoreBtn: {
    alignSelf: 'center',
    padding: '0.75rem 2rem',
    marginTop: '1rem',
  },
  discoverCard: {
    padding: '3rem 2.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '1rem',
  },
  icon: {
    color: 'var(--secondary)',
    filter: 'drop-shadow(var(--glow-secondary))',
  },
  cardTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
  },
  cardText: {
    color: 'var(--text-secondary)',
    fontSize: '0.95rem',
    lineHeight: '1.6',
    maxWidth: '500px',
    marginBottom: '0.5rem',
  },
  searchBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default Home;
