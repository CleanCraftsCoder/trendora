import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Search as SearchIcon, UserPlus, UserMinus, Check, ArrowRight, X, Clock } from 'lucide-react';
import PostCard from '../components/PostCard';
import { getImageUrl } from '../utils/imageUrl';

const Search = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionUserId, setActionUserId] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'posts'
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();
  
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/search/history');
      setHistory(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch search history:', err);
    }
  };

  const fetchSuggestions = async (searchQuery) => {
    if (searchQuery.trim().length < 1) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await api.get(`/search/suggestions?q=${encodeURIComponent(searchQuery)}`);
      setSuggestions(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
    }
  };

  const performSearch = async (searchQuery, tabType = activeTab) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/search?q=${encodeURIComponent(searchQuery)}&type=${tabType}`);
      setResults(res.data.data || []);
      // Refresh search history to show the newly added query
      fetchHistory();
    } catch (err) {
      console.error('Search error:', err);
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch search history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  // Handle click outside suggestions container
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Run search and suggestion fetching when query changes
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim() === '') {
      setResults([]);
      setSuggestions([]);
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 400);

    const sugTimeout = setTimeout(() => {
      fetchSuggestions(query);
    }, 150);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      clearTimeout(sugTimeout);
    };
  }, [query]);

  // Rerun search when switching tabs (if query is present)
  useEffect(() => {
    if (query.trim() !== '') {
      performSearch(query, activeTab);
    } else {
      setResults([]);
    }
  }, [activeTab]);

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    performSearch(suggestion, activeTab);
  };

  const handleHistoryClick = (historyQuery) => {
    setQuery(historyQuery);
    setShowSuggestions(false);
    performSearch(historyQuery, activeTab);
  };

  const handleDeleteHistoryItem = async (e, itemId) => {
    e.stopPropagation();
    try {
      await api.delete(`/search/history?itemId=${itemId}`);
      setHistory((prev) => prev.filter((item) => item._id !== itemId));
    } catch (err) {
      console.error('Failed to delete history item:', err);
    }
  };

  const handleClearAllHistory = async () => {
    try {
      await api.delete('/search/history');
      setHistory([]);
    } catch (err) {
      console.error('Failed to clear search history:', err);
    }
  };

  const handleFollowAction = async (userId, isFollowing) => {
    setActionUserId(userId);
    try {
      if (isFollowing) {
        await api.delete(`/users/${userId}/follow`);
        setResults((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isFollowing: false } : u))
        );
      } else {
        await api.post(`/users/${userId}/follow`);
        setResults((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isFollowing: true } : u))
        );
      }
    } catch (err) {
      console.error('Follow toggle error:', err);
    } finally {
      setActionUserId(null);
    }
  };

  const handlePostDeleteSuccess = (deletedPostId) => {
    setResults((prev) => prev.filter((p) => p._id !== deletedPostId));
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2 style={styles.title}>AI Smart Search</h2>
        <p style={styles.subtitle}>Discover posts and creators using advanced semantic matching.</p>
      </header>

      {/* Glassmorphic Search Bar + Autocomplete */}
      <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
        <div style={styles.searchBarContainer} className="glass-panel">
          <SearchIcon size={20} style={styles.searchIcon} />
          <input
            type="text"
            placeholder={activeTab === 'users' ? "Search by name, username, bio..." : "Search tags, captions, topics..."}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            style={styles.searchInput}
          />
          {query && (
            <button 
              onClick={() => {
                setQuery('');
                setResults([]);
                setShowSuggestions(false);
              }} 
              style={styles.clearInputBtn}
              title="Clear input"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Autocomplete Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div style={styles.suggestionsDropdown} className="glass-panel">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                style={styles.suggestionItem}
                onClick={() => handleSuggestionClick(suggestion)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'hsla(240, 15%, 25%, 0.4)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                <SearchIcon size={14} style={{ color: 'var(--text-muted)' }} />
                <span>{suggestion}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tab controls */}
      <div style={styles.tabsContainer}>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            ...styles.tabButton,
            ...(activeTab === 'users' ? styles.activeTabButton : {}),
          }}
        >
          Creators 👤
          {activeTab === 'users' && <div style={styles.activeTabIndicator} />}
        </button>
        <button
          onClick={() => setActiveTab('posts')}
          style={{
            ...styles.tabButton,
            ...(activeTab === 'posts' ? styles.activeTabButton : {}),
          }}
        >
          Posts 📝
          {activeTab === 'posts' && <div style={styles.activeTabIndicator} />}
        </button>
      </div>

      {/* Results Section */}
      <div style={styles.resultsContainer}>
        {loading && (
          <div style={styles.loadingState}>
            <div className="spinner"></div>
            <span>Searching Trendora...</span>
          </div>
        )}

        {error && <div style={styles.errorText}>{error}</div>}

        {/* Recent Searches (shown when query is empty) */}
        {!loading && query.trim() === '' && history.length > 0 && (
          <div style={styles.historySection} className="glass-panel">
            <div style={styles.historyHeader}>
              <h3 style={styles.historyTitle}>
                <Clock size={16} style={{ color: 'var(--text-muted)' }} />
                Recent Searches
              </h3>
              <button onClick={handleClearAllHistory} style={styles.clearAllBtn}>
                Clear All
              </button>
            </div>
            <div style={styles.historyGrid}>
              {history.map((item) => (
                <div
                  key={item._id}
                  style={styles.historyItem}
                  onClick={() => handleHistoryClick(item.query)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--text-muted)';
                    e.currentTarget.style.background = 'hsla(240, 15%, 20%, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-glass)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span style={styles.historyText}>{item.query}</span>
                  <button
                    onClick={(e) => handleDeleteHistoryItem(e, item._id)}
                    style={styles.deleteHistoryBtn}
                    title="Delete search"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && query.trim() === '' && history.length === 0 && (
          <div style={styles.introState}>
            <span>Discover Trendora! Type a query to search creators or posts.</span>
          </div>
        )}

        {!loading && query.trim().length > 0 && query.trim().length < 2 && (
          <div style={styles.introState}>
            <span>Type at least 2 characters to search...</span>
          </div>
        )}

        {!loading && query.trim().length >= 2 && results.length === 0 && (
          <div style={styles.emptyState}>
            <span>No {activeTab === 'users' ? 'creators' : 'posts'} found matching "{query}"</span>
          </div>
        )}

        {/* Creators Results List */}
        {!loading && activeTab === 'users' && results.length > 0 && (
          <div style={styles.resultsGrid}>
            {results.map((userResult) => (
              <div key={userResult.id} style={styles.card} className="glass-panel">
                <div style={styles.profileArea} onClick={() => navigate(`/profile/${userResult.username}`)}>
                  <img
                    src={userResult.profilePicture ? getImageUrl(userResult.profilePicture) : `https://api.dicebear.com/7.x/bottts/svg?seed=${userResult.username}`}
                    alt={userResult.username}
                    style={styles.avatar}
                    onError={(e) => {
                      e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${userResult.username}`;
                    }}
                  />
                  <div style={styles.names}>
                    <span style={styles.fullName}>{userResult.firstName} {userResult.lastName}</span>
                    <span style={styles.username}>@{userResult.username}</span>
                    {userResult.bio && <span style={styles.bioText}>{userResult.bio}</span>}
                  </div>
                </div>

                <div style={styles.actions}>
                  <button
                    onClick={() => handleFollowAction(userResult.id, userResult.isFollowing)}
                    disabled={actionUserId === userResult.id}
                    style={{
                      ...styles.actionBtn,
                      ...(userResult.isFollowing ? styles.unfollowBtn : styles.followBtn),
                    }}
                  >
                    {userResult.isFollowing ? (
                      <>
                        <Check size={14} style={{ marginRight: '0.4rem' }} />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus size={14} style={{ marginRight: '0.4rem' }} />
                        Follow
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => navigate(`/profile/${userResult.username}`)}
                    style={styles.profileBtn}
                    title="View Profile"
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Posts Results List */}
        {!loading && activeTab === 'posts' && results.length > 0 && (
          <div style={styles.postsGrid}>
            {results.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                onDeleteSuccess={handlePostDeleteSuccess}
              />
            ))}
          </div>
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
  title: {
    fontSize: '2rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: 'var(--text-secondary)',
  },
  searchBarContainer: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.75rem 1.25rem',
    gap: '0.75rem',
    width: '100%',
  },
  searchIcon: {
    color: 'var(--text-muted)',
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary)',
    fontSize: '1.05rem',
    width: '100%',
    fontFamily: 'var(--font-sans)',
  },
  clearInputBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    transition: 'color var(--transition-fast)',
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '0.5rem',
    background: 'rgba(20, 20, 30, 0.95)',
    backdropFilter: 'blur(16px)',
    border: '1px solid var(--border-glass)',
    borderRadius: 'var(--radius-md)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
    zIndex: 100,
    overflow: 'hidden',
  },
  suggestionItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.75rem 1.25rem',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    gap: '0.75rem',
    transition: 'background var(--transition-fast), color var(--transition-fast)',
  },
  tabsContainer: {
    display: 'flex',
    gap: '1.5rem',
    borderBottom: '1px solid var(--border-glass)',
    paddingBottom: '0.25rem',
    marginTop: '0.5rem',
  },
  tabButton: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '1rem',
    fontWeight: '600',
    padding: '0.75rem 0.5rem',
    cursor: 'pointer',
    transition: 'color var(--transition-fast)',
    position: 'relative',
    outline: 'none',
  },
  activeTabButton: {
    color: 'var(--text-primary)',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: '-0.25rem',
    left: 0,
    right: 0,
    height: '3px',
    background: 'var(--primary-gradient)',
    borderRadius: '2px 2px 0 0',
  },
  resultsContainer: {
    marginTop: '0.5rem',
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    padding: '3rem 0',
    color: 'var(--text-secondary)',
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem 0',
    color: 'var(--text-muted)',
    fontSize: '1rem',
  },
  introState: {
    textAlign: 'center',
    padding: '3rem 0',
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
  },
  errorText: {
    color: 'var(--error)',
    textAlign: 'center',
    padding: '1rem',
  },
  resultsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  postsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  card: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 1.5rem',
    width: '100%',
  },
  profileArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    cursor: 'pointer',
    flex: 1,
    overflow: 'hidden',
  },
  avatar: {
    width: '48px',
    height: '48px',
    borderRadius: 'var(--radius-full)',
    objectFit: 'cover',
    border: '2px solid var(--border-glass)',
    background: 'var(--bg-secondary)',
  },
  names: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  fullName: {
    fontWeight: '600',
    fontSize: '1rem',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
  },
  username: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
  },
  bioText: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    marginTop: '0.15rem',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.5rem 1rem',
    borderRadius: 'var(--radius-md)',
    fontWeight: '600',
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    height: '36px',
  },
  followBtn: {
    background: 'var(--primary-gradient)',
    border: 'none',
    color: '#fff',
    boxShadow: 'var(--glow-primary)',
  },
  unfollowBtn: {
    background: 'transparent',
    border: '1px solid var(--border-glass)',
    color: 'var(--text-secondary)',
  },
  profileBtn: {
    background: 'hsla(240, 15%, 20%, 0.3)',
    border: '1px solid var(--border-glass)',
    color: 'var(--text-secondary)',
    width: '36px',
    height: '36px',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  historySection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginTop: '1rem',
    padding: '1.25rem 1.5rem',
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  clearAllBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'color var(--transition-fast)',
    textDecoration: 'underline',
  },
  historyGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
  },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.4rem 0.8rem',
    borderRadius: 'var(--radius-full)',
    border: '1px solid var(--border-glass)',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  historyText: {
    whiteSpace: 'nowrap',
  },
  deleteHistoryBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
};

export default Search;
