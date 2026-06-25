import React, { useState, useEffect } from 'react';
import { Compass, AlertCircle } from 'lucide-react';
import api from '../utils/api';
import PostCard from '../components/PostCard';
import InfiniteScroll from '../components/InfiniteScroll';

const Explore = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');

  const fetchExplore = async (nextCursor = null) => {
    if (!nextCursor) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError('');
    try {
      const url = nextCursor ? `/feed/explore?cursor=${encodeURIComponent(nextCursor)}&limit=10` : '/feed/explore?limit=10';
      const res = await api.get(url);
      const { data, pagination } = res.data;
      if (!nextCursor) {
        setPosts(data);
      } else {
        setPosts((prev) => [...prev, ...data]);
      }
      setCursor(pagination.nextCursor);
      setHasMore(pagination.hasMore);
    } catch (err) {
      console.error('Error fetching explore posts:', err);
      setError(err.response?.data?.error?.message || 'Failed to load explore posts.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchExplore(null);
  }, []);

  const loadMore = () => {
    if (hasMore && !loadingMore) {
      fetchExplore(cursor);
    }
  };

  const handleDeleteSuccess = (deletedId) => {
    setPosts((prev) => prev.filter((post) => post._id !== deletedId));
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.titleRow}>
          <Compass size={28} style={styles.icon} />
          <h2 style={styles.title}>Explore</h2>
        </div>
        <p style={styles.subtitle}>Discover new and interesting content from creators across the platform.</p>
      </header>

      {/* Posts List */}
      <div style={styles.feedContainer}>
        {loading && !cursor ? (
          <div style={styles.loadingContainer}>
            <div className="spinner"></div>
            <span>Loading public posts...</span>
          </div>
        ) : error ? (
          <div style={styles.errorContainer}>
            <AlertCircle size={20} style={{ color: 'var(--error)', flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        ) : posts.length === 0 ? (
          <div style={styles.emptyState} className="glass-panel">
            <span>No public posts found. Start sharing!</span>
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
  icon: {
    color: 'var(--primary)',
    filter: 'drop-shadow(var(--glow-primary))',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: 'var(--text-secondary)',
  },
  feedContainer: {
    display: 'flex',
    flexDirection: 'column',
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
    padding: '4rem 0',
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
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
  },
  loadMoreBtn: {
    alignSelf: 'center',
    padding: '0.75rem 2rem',
    marginTop: '1rem',
  },
};

export default Explore;
