import React, { useState, useEffect } from 'react';
import { Flame, AlertCircle, TrendingUp, Sparkles, Clock, ArrowLeft, Hash, Activity } from 'lucide-react';
import api from '../utils/api';
import PostCard from '../components/PostCard';
import InfiniteScroll from '../components/InfiniteScroll';

const Trending = () => {
  // General trending posts state
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');

  // Hashtag trends state
  const [trends, setTrends] = useState([]);
  const [loadingTrends, setLoadingTrends] = useState(true);
  const [selectedTag, setSelectedTag] = useState(null);
  const [tagDetails, setTagDetails] = useState(null);
  const [loadingTag, setLoadingTag] = useState(false);

  // Fetch general trending posts
  const fetchTrending = async (nextCursor = null, range = timeRange) => {
    if (!nextCursor) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError('');
    try {
      const url = nextCursor 
        ? `/feed/trending?timeRange=${range}&cursor=${encodeURIComponent(nextCursor)}&limit=10` 
        : `/feed/trending?timeRange=${range}&limit=10`;
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
      console.error('Error fetching trending posts:', err);
      setError(err.response?.data?.error?.message || 'Failed to load trending posts.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Fetch active trending hashtags list
  const fetchTrendsList = async () => {
    setLoadingTrends(true);
    try {
      const res = await api.get('/trends');
      setTrends(res.data.data || []);
    } catch (err) {
      console.error('Error fetching trends list:', err);
    } finally {
      setLoadingTrends(false);
    }
  };

  // Fetch statistics and posts matching a specific hashtag
  const fetchTagDetails = async (tag) => {
    setLoadingTag(true);
    try {
      const res = await api.get(`/trends/${encodeURIComponent(tag)}`);
      setTagDetails(res.data.data);
    } catch (err) {
      console.error('Error fetching tag details:', err);
    } finally {
      setLoadingTag(false);
    }
  };

  // Load trends on mount
  useEffect(() => {
    fetchTrendsList();
  }, []);

  // Sync general trending posts when timeRange changes
  useEffect(() => {
    if (!selectedTag) {
      fetchTrending(null, timeRange);
    }
  }, [timeRange, selectedTag]);

  // Sync detailed tag statistics and posts when selectedTag changes
  useEffect(() => {
    if (selectedTag) {
      fetchTagDetails(selectedTag);
    } else {
      setTagDetails(null);
    }
  }, [selectedTag]);

  const handleTimeRangeChange = (newRange) => {
    setTimeRange(newRange);
  };

  const loadMore = () => {
    if (hasMore && !loadingMore && !selectedTag) {
      fetchTrending(cursor, timeRange);
    }
  };

  const handleDeleteSuccess = (deletedId) => {
    setPosts((prev) => prev.filter((post) => post._id !== deletedId));
    if (tagDetails && tagDetails.posts) {
      setTagDetails((prev) => ({
        ...prev,
        posts: prev.posts.filter((post) => post._id !== deletedId),
      }));
    }
  };

  const renderChart = (history) => {
    if (!history || history.length === 0) return null;
    const maxCount = Math.max(...history.map((h) => h.count), 1);
    
    // Take the last 8 items for a clean dashboard view
    const displayHistory = history.slice(-8);

    return (
      <div style={styles.chartContainer} className="glass-panel">
        <h4 style={styles.chartTitle}>
          <Activity size={14} style={{ marginRight: '0.3rem' }} /> 
          Usage Velocity Over Time
        </h4>
        <div style={styles.chartBars}>
          {displayHistory.map((pt, i) => {
            const heightPct = (pt.count / maxCount) * 80; // Scale max height to 80%
            const timeStr = new Date(pt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
              <div key={i} style={styles.chartBarCol}>
                <div style={styles.chartBarWrapper}>
                  <div 
                    style={{ 
                      ...styles.chartBar, 
                      height: `${Math.max(heightPct, 8)}%`,
                    }} 
                    title={`${pt.count} posts at ${timeStr}`}
                  />
                </div>
                <span style={styles.chartBarLabel}>{timeStr}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.titleRow}>
          <Flame size={28} style={styles.icon} />
          <h2 style={styles.title}>Trending Dashboard</h2>
        </div>
        <p style={styles.subtitle}>Explore real-time topics and engagement metrics across the network.</p>
      </header>

      <div style={styles.dashboardLayout}>
        {/* Main Column: general feed or hashtag details feed */}
        <div style={styles.mainColumn}>
          {selectedTag ? (
            /* HASHTAG DETAILS MODE */
            <div style={styles.tagDetailContainer}>
              <button onClick={() => setSelectedTag(null)} style={styles.backButton}>
                <ArrowLeft size={16} />
                <span>Back to Trending Feed</span>
              </button>

              {loadingTag ? (
                <div style={styles.loadingContainer}>
                  <div className="spinner"></div>
                  <span>Loading analytics...</span>
                </div>
              ) : tagDetails ? (
                <div style={styles.detailsContent}>
                  {/* Stats Card */}
                  <div style={styles.statsCard} className="glass-panel">
                    <div style={styles.statsCardHeader}>
                      <div style={styles.hashTitle}>
                        <Hash size={24} style={{ color: 'var(--secondary)' }} />
                        <h3 style={styles.hashtagText}>{tagDetails.hashtag}</h3>
                      </div>
                      {tagDetails.isEmerging && (
                        <span style={styles.sparkBadgeLarge}>
                          <Sparkles size={14} />
                          Emerging Topic
                        </span>
                      )}
                    </div>

                    <div style={styles.metricsGrid}>
                      <div style={styles.metricItem}>
                        <span style={styles.metricValue}>{tagDetails.currentCount}</span>
                        <span style={styles.metricLabel}>Posts (Last 24h)</span>
                      </div>
                      <div style={styles.metricItem}>
                        <span style={styles.metricValue}>
                          {tagDetails.previousCount > 0 
                            ? `+${((tagDetails.currentCount - tagDetails.previousCount) / tagDetails.previousCount * 100).toFixed(0)}%`
                            : 'New'}
                        </span>
                        <span style={styles.metricLabel}>Growth Velocity</span>
                      </div>
                      <div style={styles.metricItem}>
                        <span style={styles.metricValue}>{tagDetails.score.toFixed(1)}</span>
                        <span style={styles.metricLabel}>Emergence Score</span>
                      </div>
                    </div>

                    {renderChart(tagDetails.countHistory)}
                  </div>

                  {/* Tag Specific Feed */}
                  <div style={styles.tagFeedHeader}>
                    <TrendingUp size={18} style={{ color: 'var(--text-muted)' }} />
                    <h4 style={styles.tagFeedTitle}>Trending Posts with #{tagDetails.hashtag}</h4>
                  </div>

                  <div style={styles.postsList}>
                    {tagDetails.posts && tagDetails.posts.length > 0 ? (
                      tagDetails.posts.map((postItem) => (
                        <PostCard
                          key={postItem._id}
                          post={postItem}
                          onDeleteSuccess={handleDeleteSuccess}
                        />
                      ))
                    ) : (
                      <div style={styles.emptyState} className="glass-panel">
                        <span>No public posts found containing this hashtag.</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={styles.errorContainer}>
                  <AlertCircle size={20} style={{ color: 'var(--error)' }} />
                  <span>Failed to load details for #{selectedTag}.</span>
                </div>
              )}
            </div>
          ) : (
            /* GENERAL TRENDING FEED MODE */
            <div>
              {/* Filter Tabs */}
              <div style={styles.filterBar} className="glass-panel">
                <button
                  onClick={() => handleTimeRangeChange('24h')}
                  style={{ ...styles.filterTab, ...(timeRange === '24h' ? styles.filterTabActive : {}) }}
                >
                  Past 24 Hours
                </button>
                <button
                  onClick={() => handleTimeRangeChange('7d')}
                  style={{ ...styles.filterTab, ...(timeRange === '7d' ? styles.filterTabActive : {}) }}
                >
                  Past 7 Days
                </button>
                <button
                  onClick={() => handleTimeRangeChange('30d')}
                  style={{ ...styles.filterTab, ...(timeRange === '30d' ? styles.filterTabActive : {}) }}
                >
                  Past 30 Days
                </button>
              </div>

              {/* General Posts List */}
              <div style={styles.feedContainer}>
                {loading && !cursor ? (
                  <div style={styles.loadingContainer}>
                    <div className="spinner"></div>
                    <span>Loading trending posts...</span>
                  </div>
                ) : error ? (
                  <div style={styles.errorContainer}>
                    <AlertCircle size={20} style={{ color: 'var(--error)', flexShrink: 0 }} />
                    <span>{error}</span>
                  </div>
                ) : posts.length === 0 ? (
                  <div style={styles.emptyState} className="glass-panel">
                    <span>No trending posts found in this timeframe.</span>
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
          )}
        </div>

        {/* Side Column: Trending Hashtags List */}
        <div style={styles.sideColumn}>
          <div style={styles.sidePanel} className="glass-panel">
            <div style={styles.sidePanelHeader}>
              <TrendingUp size={18} style={{ color: 'var(--secondary)' }} />
              <h3 style={styles.sidePanelTitle}>Trending Topics</h3>
            </div>

            {loadingTrends ? (
              <div style={styles.sideLoading}>
                <div className="spinner" style={{ width: '20px', height: '20px' }}></div>
                <span>Checking trends...</span>
              </div>
            ) : trends.length === 0 ? (
              <div style={styles.sideEmpty}>
                <span>No active trends detected.</span>
              </div>
            ) : (
              <div style={styles.trendsList}>
                {trends.map((t, idx) => (
                  <div
                    key={t._id}
                    onClick={() => setSelectedTag(t.hashtag)}
                    style={{
                      ...styles.trendItem,
                      ...(selectedTag === t.hashtag ? styles.trendItemActive : {}),
                    }}
                    onMouseEnter={(e) => {
                      if (selectedTag !== t.hashtag) {
                        e.currentTarget.style.background = 'hsla(240, 15%, 20%, 0.3)';
                        e.currentTarget.style.borderColor = 'var(--border-glass)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedTag !== t.hashtag) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = 'transparent';
                      }
                    }}
                  >
                    <div style={styles.trendRank}>#{idx + 1}</div>
                    <div style={styles.trendInfo}>
                      <span style={styles.trendTag}>#{t.hashtag}</span>
                      <span style={styles.trendSub}>
                        {t.currentCount} posts • score: {t.score.toFixed(0)}
                      </span>
                    </div>
                    {t.isEmerging && (
                      <span style={styles.sparkBadge} title="Spike in usage!">
                        <Sparkles size={10} />
                        Emerging
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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
    color: 'var(--secondary)',
    filter: 'drop-shadow(var(--glow-secondary))',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: 'var(--text-secondary)',
  },
  dashboardLayout: {
    display: 'flex',
    gap: '1.5rem',
    flexWrap: 'wrap',
  },
  mainColumn: {
    flex: '1',
    minWidth: '320px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  sideColumn: {
    width: '320px',
    flexGrow: 1,
    minWidth: '280px',
  },
  filterBar: {
    display: 'flex',
    padding: '0.4rem',
    gap: '0.5rem',
    borderRadius: 'var(--radius-md)',
    marginBottom: '1rem',
  },
  filterTab: {
    flex: 1,
    padding: '0.6rem',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    fontWeight: '600',
    fontSize: '0.85rem',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  filterTabActive: {
    background: 'var(--bg-secondary)',
    color: 'var(--secondary)',
    boxShadow: 'var(--glow-secondary)',
    border: '1px solid var(--border-glass)',
  },
  feedContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  postsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
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
  sidePanel: {
    padding: '1.5rem',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  sidePanelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    borderBottom: '1px solid var(--border-glass)',
    paddingBottom: '0.75rem',
  },
  sidePanelTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  sideLoading: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    padding: '1rem 0',
  },
  sideEmpty: {
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    textAlign: 'center',
    padding: '1.5rem 0',
  },
  trendsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  trendItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    gap: '0.75rem',
    border: '1px solid transparent',
  },
  trendItemActive: {
    background: 'hsla(265, 85%, 60%, 0.15)',
    borderColor: 'hsla(265, 85%, 60%, 0.25)',
    boxShadow: 'var(--glow-primary)',
  },
  trendRank: {
    fontSize: '0.95rem',
    fontWeight: '800',
    color: 'var(--text-muted)',
    minWidth: '24px',
  },
  trendInfo: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
  },
  trendTag: {
    fontWeight: '600',
    fontSize: '0.95rem',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
  },
  trendSub: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  sparkBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.2rem',
    backgroundColor: 'rgba(255, 170, 0, 0.15)',
    border: '1px solid rgba(255, 170, 0, 0.3)',
    color: '#ffaa00',
    fontSize: '0.65rem',
    fontWeight: '700',
    padding: '0.15rem 0.35rem',
    borderRadius: 'var(--radius-sm)',
    textTransform: 'uppercase',
  },
  tagDetailContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    width: 'fit-content',
    padding: '0.25rem 0',
  },
  detailsContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  statsCard: {
    padding: '1.5rem',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  statsCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  hashTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  hashtagText: {
    fontSize: '1.4rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
  },
  sparkBadgeLarge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    backgroundColor: 'rgba(255, 170, 0, 0.15)',
    border: '1px solid rgba(255, 170, 0, 0.3)',
    color: '#ffaa00',
    fontSize: '0.75rem',
    fontWeight: '700',
    padding: '0.25rem 0.65rem',
    borderRadius: 'var(--radius-sm)',
    textTransform: 'uppercase',
    boxShadow: '0 0 10px rgba(255, 170, 0, 0.25)',
  },
  metricsGrid: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  metricItem: {
    flex: 1,
    minWidth: '100px',
    background: 'hsla(240, 15%, 15%, 0.4)',
    border: '1px solid var(--border-glass)',
    borderRadius: 'var(--radius-sm)',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem',
  },
  metricValue: {
    fontSize: '1.5rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
  },
  metricLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    textAlign: 'center',
  },
  chartContainer: {
    padding: '1.25rem',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    background: 'hsla(240, 15%, 10%, 0.3)',
  },
  chartTitle: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
  },
  chartBars: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: '100px',
    padding: '0 0.5rem',
    gap: '0.5rem',
  },
  chartBarCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    height: '100%',
    gap: '0.4rem',
  },
  chartBarWrapper: {
    width: '100%',
    height: '80px',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  chartBar: {
    width: '100%',
    maxWidth: '24px',
    borderRadius: '3px 3px 0 0',
    transition: 'height 0.5s ease',
    background: 'var(--primary-gradient)',
    boxShadow: 'var(--glow-primary)',
  },
  chartBarLabel: {
    fontSize: '0.65rem',
    color: 'var(--text-muted)',
  },
  tagFeedHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '0.5rem',
  },
  tagFeedTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
};

export default Trending;
