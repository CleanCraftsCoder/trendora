import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import PostCard from '../components/PostCard';
import { getImageUrl } from '../utils/imageUrl';
import { 
  Camera, MapPin, Calendar, Users, 
  Check, UserPlus, UserMinus, Edit3, 
  Lock, AlertCircle, Grid, ChevronRight 
} from 'lucide-react';

const Profile = () => {
  const { username } = useParams();
  const { user: currentUser, setUser: setCurrentUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Follower/Following lists state
  const [activeTab, setActiveTab] = useState('posts'); // posts, followers, following
  const [tabData, setTabData] = useState([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Actions state
  const [isFollowingAction, setIsFollowingAction] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const isMyProfile = currentUser?.username === username?.toLowerCase();

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/users/${username}`);
      setProfile(res.data.data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err.response?.data?.error?.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    setActiveTab('posts'); // Reset tab on username change
  }, [username]);

  const fetchTabData = async (tab, pageNum = 1) => {
    if (!profile) return;
    setTabLoading(true);
    try {
      let res;
      if (tab === 'posts') {
        res = await api.get(`/posts?authorId=${profile.id}&page=${pageNum}&limit=10`);
      } else {
        res = await api.get(`/users/${profile.id}/${tab}?page=${pageNum}&limit=10`);
      }
      const { data, pagination } = res.data;
      
      if (pageNum === 1) {
        setTabData(data);
      } else {
        setTabData((prev) => [...prev, ...data]);
      }
      setPage(pagination.page);
      setTotalPages(pagination.pages);
    } catch (err) {
      console.error(`Error fetching ${tab}:`, err);
    } finally {
      setTabLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchTabData(activeTab, 1);
    }
  }, [activeTab, profile]);

  const handleFollowToggle = async () => {
    if (!profile || isFollowingAction) return;
    setIsFollowingAction(true);
    try {
      if (profile.isFollowing) {
        await api.delete(`/users/${profile.id}/follow`);
        setProfile((prev) => ({
          ...prev,
          isFollowing: false,
          stats: {
            ...prev.stats,
            followersCount: Math.max(0, prev.stats.followersCount - 1),
          },
        }));
      } else {
        await api.post(`/users/${profile.id}/follow`);
        setProfile((prev) => ({
          ...prev,
          isFollowing: true,
          stats: {
            ...prev.stats,
            followersCount: prev.stats.followersCount + 1,
          },
        }));
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
    } finally {
      setIsFollowingAction(false);
    }
  };

  const handleImageUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5242880) {
      alert('File size exceeds the 5MB limit.');
      return;
    }

    const formData = new FormData();
    const endpoint = type === 'avatar' ? '/users/me/profile-picture' : '/users/me/cover-image';
    const fieldName = type === 'avatar' ? 'profilePicture' : 'coverImage';
    
    formData.append(fieldName, file);

    if (type === 'avatar') setUploadingAvatar(true);
    else setUploadingCover(true);

    try {
      const res = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const updatedData = res.data.data;

      // Update local states
      if (type === 'avatar') {
        setProfile((prev) => ({ ...prev, profilePicture: updatedData.profilePicture }));
        setCurrentUser((prev) => ({ ...prev, profilePicture: updatedData.profilePicture }));
      } else {
        setProfile((prev) => ({ ...prev, coverImage: updatedData.coverImage }));
        setCurrentUser((prev) => ({ ...prev, coverImage: updatedData.coverImage }));
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      alert(err.response?.data?.error?.message || 'Failed to upload image.');
    } finally {
      if (type === 'avatar') setUploadingAvatar(false);
      else setUploadingCover(false);
    }
  };

  const loadMoreData = () => {
    if (page < totalPages) {
      fetchTabData(activeTab, page + 1);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div className="spinner"></div>
        <span>Loading profile...</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={styles.errorContainer} className="glass-panel">
        <AlertCircle size={48} style={{ color: 'var(--error)' }} />
        <h3>Profile Error</h3>
        <p>{error || 'User not found'}</p>
        <button className="btn-primary" onClick={() => navigate('/')}>
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Cover Image Section */}
      <div style={styles.coverContainer}>
        <img
          src={profile.coverImage ? getImageUrl(profile.coverImage) : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80'}
          alt="Cover"
          style={styles.coverImage}
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';
          }}
        />
        {isMyProfile && (
          <button 
            style={styles.coverUploadBtn} 
            onClick={() => coverInputRef.current?.click()}
            disabled={uploadingCover}
          >
            <Camera size={16} />
            <span>{uploadingCover ? 'Uploading...' : 'Change Cover'}</span>
          </button>
        )}
        <input
          type="file"
          ref={coverInputRef}
          onChange={(e) => handleImageUpload(e, 'cover')}
          style={{ display: 'none' }}
          accept="image/*"
        />
      </div>

      {/* Profile Info Details Header */}
      <div style={styles.profileHeader}>
        <div style={styles.avatarWrapper}>
          <img
            src={profile.profilePicture ? getImageUrl(profile.profilePicture) : `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.username}`}
            alt={profile.username}
            style={styles.avatar}
            onError={(e) => {
              e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.username}`;
            }}
          />
          {isMyProfile && (
            <button 
              style={styles.avatarUploadBtn}
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
            >
              <Camera size={14} />
            </button>
          )}
          <input
            type="file"
            ref={avatarInputRef}
            onChange={(e) => handleImageUpload(e, 'avatar')}
            style={{ display: 'none' }}
            accept="image/*"
          />
        </div>

        <div style={styles.actionRow}>
          {isMyProfile ? (
            <button className="btn-secondary" onClick={() => navigate(`/profile/${profile.username}/edit`)} style={styles.editBtn}>
              <Edit3 size={16} style={{ marginRight: '0.5rem' }} />
              Edit Profile
            </button>
          ) : (
            <button 
              onClick={handleFollowToggle} 
              disabled={isFollowingAction}
              className={profile.isFollowing ? 'btn-secondary' : 'btn-primary'}
              style={styles.followBtn}
            >
              {profile.isFollowing ? (
                <>
                  <Check size={16} style={{ marginRight: '0.5rem' }} />
                  Following
                </>
              ) : (
                <>
                  <UserPlus size={16} style={{ marginRight: '0.5rem' }} />
                  Follow
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* User Details info */}
      <div style={styles.userInfo}>
        <div style={styles.nameHeader}>
          <h2 style={styles.fullName}>
            {profile.firstName} {profile.lastName}
            {profile.isVerified && <span style={styles.verifiedBadge}>✓</span>}
          </h2>
          <span style={styles.usernameTag}>@{profile.username}</span>
        </div>

        {profile.bio && <p style={styles.bio}>{profile.bio}</p>}

        <div style={styles.meta}>
          {!profile.isPublic && (
            <span style={styles.metaItem}>
              <Lock size={14} style={{ marginRight: '0.4rem' }} />
              Private Account
            </span>
          )}
          <span style={styles.metaItem}>
            <Calendar size={14} style={{ marginRight: '0.4rem' }} />
            Joined {new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </span>
        </div>

        {/* Stats Grid */}
        <div style={styles.statsRow}>
          <div style={styles.statItem} onClick={() => setActiveTab('posts')}>
            <span style={styles.statCount}>{profile.stats.postsCount || 0}</span>
            <span style={styles.statLabel}>Posts</span>
          </div>
          <div style={styles.statItem} onClick={() => setActiveTab('followers')}>
            <span style={styles.statCount}>{profile.stats.followersCount || 0}</span>
            <span style={styles.statLabel}>Followers</span>
          </div>
          <div style={styles.statItem} onClick={() => setActiveTab('following')}>
            <span style={styles.statCount}>{profile.stats.followingCount || 0}</span>
            <span style={styles.statLabel}>Following</span>
          </div>
        </div>
      </div>

      {/* Profile View Tabs */}
      <div style={styles.tabsContainer}>
        <div style={styles.tabList}>
          <button 
            style={{ ...styles.tabBtn, ...(activeTab === 'posts' ? styles.tabBtnActive : {}) }}
            onClick={() => setActiveTab('posts')}
          >
            Posts
          </button>
          <button 
            style={{ ...styles.tabBtn, ...(activeTab === 'followers' ? styles.tabBtnActive : {}) }}
            onClick={() => setActiveTab('followers')}
          >
            Followers
          </button>
          <button 
            style={{ ...styles.tabBtn, ...(activeTab === 'following' ? styles.tabBtnActive : {}) }}
            onClick={() => setActiveTab('following')}
          >
            Following
          </button>
        </div>

        <div style={styles.tabContent}>
          {activeTab === 'posts' && (
            <div style={styles.usersGrid}>
              {tabLoading && page === 1 ? (
                <div style={styles.tabLoading}>
                  <div className="spinner"></div>
                </div>
              ) : tabData.length === 0 ? (
                <div style={styles.emptyPosts} className="glass-panel">
                  <Grid size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                  <h3>No posts yet</h3>
                  <p>Create a post to start building your feed!</p>
                  {isMyProfile && (
                    <button className="btn-primary" onClick={() => navigate('/posts/create')} style={{ marginTop: '1rem' }}>
                      Create First Post
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div style={styles.postsList}>
                    {tabData.map((postItem) => (
                      <PostCard 
                        key={postItem._id} 
                        post={postItem} 
                        onDeleteSuccess={(deletedId) => {
                          setTabData((prev) => prev.filter((p) => p._id !== deletedId));
                          setProfile((prev) => ({
                            ...prev,
                            stats: {
                              ...prev.stats,
                              postsCount: Math.max(0, prev.stats.postsCount - 1),
                            },
                          }));
                        }}
                      />
                    ))}
                  </div>

                  {page < totalPages && (
                    <button onClick={loadMoreData} className="btn-secondary" style={styles.loadMoreBtn} disabled={tabLoading}>
                      {tabLoading ? 'Loading...' : 'Load More'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {(activeTab === 'followers' || activeTab === 'following') && (
            <div style={styles.usersGrid}>
              {tabLoading && page === 1 ? (
                <div style={styles.tabLoading}>
                  <div className="spinner"></div>
                </div>
              ) : tabData.length === 0 ? (
                <div style={styles.emptyTab}>
                  <Users size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
                  <p>No {activeTab} yet.</p>
                </div>
              ) : (
                <>
                  <div style={styles.usersList}>
                    {tabData.map((userItem) => (
                      <div key={userItem.id} style={styles.userCard} className="glass-panel">
                        <div style={styles.userCardInfo} onClick={() => navigate(`/profile/${userItem.username}`)}>
                          <img
                            src={userItem.profilePicture ? getImageUrl(userItem.profilePicture) : `https://api.dicebear.com/7.x/bottts/svg?seed=${userItem.username}`}
                            alt={userItem.username}
                            style={styles.cardAvatar}
                            onError={(e) => {
                              e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${userItem.username}`;
                            }}
                          />
                          <div style={styles.cardNames}>
                            <span style={styles.cardFullName}>{userItem.firstName} {userItem.lastName}</span>
                            <span style={styles.cardUsername}>@{userItem.username}</span>
                          </div>
                        </div>
                        <button 
                          style={styles.viewProfileBtn}
                          onClick={() => navigate(`/profile/${userItem.username}`)}
                        >
                          View
                          <ChevronRight size={14} style={{ marginLeft: '0.2rem' }} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {page < totalPages && (
                    <button onClick={loadMoreData} className="btn-secondary" style={styles.loadMoreBtn} disabled={tabLoading}>
                      {tabLoading ? 'Loading...' : 'Load More'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    gap: '1rem',
    color: 'var(--text-secondary)',
  },
  errorContainer: {
    padding: '3rem 2rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.25rem',
  },
  coverContainer: {
    position: 'relative',
    height: '220px',
    width: '100%',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    border: '1px solid var(--border-glass)',
    backgroundColor: 'var(--bg-secondary)',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  coverUploadBtn: {
    position: 'absolute',
    bottom: '1rem',
    right: '1rem',
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 'var(--radius-md)',
    color: '#fff',
    padding: '0.5rem 1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '600',
    transition: 'var(--transition-fast)',
  },
  profileHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0 1.5rem',
    marginTop: '-4.5rem',
    alignItems: 'flex-end',
    marginBottom: '1rem',
  },
  avatarWrapper: {
    position: 'relative',
    width: '110px',
    height: '110px',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 'var(--radius-full)',
    objectFit: 'cover',
    border: '4px solid var(--bg-primary)',
    background: 'var(--bg-secondary)',
  },
  avatarUploadBtn: {
    position: 'absolute',
    bottom: '2px',
    right: '2px',
    background: 'var(--primary-gradient)',
    border: 'none',
    width: '32px',
    height: '32px',
    borderRadius: 'var(--radius-full)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    transition: 'var(--transition-fast)',
  },
  actionRow: {
    paddingBottom: '0.5rem',
  },
  followBtn: {
    minWidth: '120px',
    height: '40px',
  },
  editBtn: {
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    padding: '0.5rem 1rem',
  },
  userInfo: {
    padding: '0 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '2rem',
  },
  nameHeader: {
    display: 'flex',
    flexDirection: 'column',
  },
  fullName: {
    fontSize: '1.75rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  verifiedBadge: {
    fontSize: '1rem',
    background: 'var(--primary-gradient)',
    color: '#fff',
    borderRadius: 'var(--radius-full)',
    width: '20px',
    height: '20px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
  },
  usernameTag: {
    fontSize: '0.9rem',
    color: 'var(--text-muted)',
    fontWeight: '500',
  },
  bio: {
    fontSize: '0.95rem',
    lineHeight: '1.5',
    color: 'var(--text-secondary)',
    maxWidth: '600px',
  },
  meta: {
    display: 'flex',
    gap: '1.5rem',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    fontWeight: '500',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
  },
  statsRow: {
    display: 'flex',
    gap: '2.5rem',
    borderTop: '1px solid var(--border-glass)',
    borderBottom: '1px solid var(--border-glass)',
    padding: '1rem 0',
    marginTop: '0.5rem',
  },
  statItem: {
    display: 'flex',
    gap: '0.4rem',
    alignItems: 'baseline',
    cursor: 'pointer',
  },
  statCount: {
    fontSize: '1.15rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
  },
  statLabel: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    fontWeight: '500',
  },
  tabsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  tabList: {
    display: 'flex',
    gap: '1rem',
    borderBottom: '1px solid var(--border-glass)',
    paddingBottom: '0.1px',
  },
  tabBtn: {
    background: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    color: 'var(--text-secondary)',
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  tabBtnActive: {
    color: 'var(--secondary)',
    borderBottomColor: 'var(--secondary)',
    textShadow: '0 0 10px hsla(180, 85%, 45%, 0.2)',
  },
  tabContent: {
    minHeight: '200px',
  },
  emptyPosts: {
    padding: '4rem 2rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
  },
  emptyTab: {
    textAlign: 'center',
    padding: '3rem 0',
    color: 'var(--text-muted)',
  },
  tabLoading: {
    display: 'flex',
    justifyContent: 'center',
    padding: '2rem 0',
  },
  usersGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  usersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  userCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.25rem',
    width: '100%',
  },
  userCardInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    cursor: 'pointer',
    flex: 1,
    overflow: 'hidden',
  },
  cardAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: 'var(--radius-full)',
    objectFit: 'cover',
    border: '1.5px solid var(--border-glass)',
    background: 'var(--bg-secondary)',
  },
  cardNames: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  cardFullName: {
    fontWeight: '600',
    fontSize: '0.9rem',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
  },
  cardUsername: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
  },
  viewProfileBtn: {
    background: 'transparent',
    border: '1px solid var(--border-glass)',
    color: 'var(--text-secondary)',
    borderRadius: 'var(--radius-md)',
    padding: '0.4rem 0.8rem',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'var(--transition-fast)',
  },
  loadMoreBtn: {
    alignSelf: 'center',
    minWidth: '150px',
  },
  postsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    width: '100%',
  },
};

export default Profile;
