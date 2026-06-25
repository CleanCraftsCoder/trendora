import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import CommentsSection from '../components/CommentsSection';
import { getImageUrl } from '../utils/imageUrl';
import { 
  ArrowLeft, Edit, Trash2, Globe, Users, 
  Lock, Calendar, Heart, MessageCircle, Share2, 
  AlertCircle, ChevronLeft, ChevronRight 
} from 'lucide-react';

const PostDetails = () => {
  const { postId } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  const handleLikeToggle = async () => {
    if (!post || !currentUser) {
      if (!currentUser) navigate('/login');
      return;
    }
    if (isLiking) return;

    const previousIsLiked = post.isLiked || false;
    const previousLikesCount = post.likesCount || 0;

    // Optimistic UI update
    setPost((prev) => ({
      ...prev,
      isLiked: !previousIsLiked,
      likesCount: previousIsLiked ? Math.max(0, previousLikesCount - 1) : previousLikesCount + 1,
    }));
    setIsLiking(true);

    try {
      if (previousIsLiked) {
        await api.delete(`/posts/${post._id}/like`);
      } else {
        await api.post(`/posts/${post._id}/like`);
      }
    } catch (err) {
      console.error('Failed to toggle like on details page:', err);
      // Rollback
      setPost((prev) => ({
        ...prev,
        isLiked: previousIsLiked,
        likesCount: previousLikesCount,
      }));
    } finally {
      setIsLiking(false);
    }
  };

  const fetchPostDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/posts/${postId}`);
      setPost(res.data.data);
    } catch (err) {
      console.error('Error fetching post:', err);
      setError(err.response?.data?.error?.message || 'Failed to load post details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostDetails();
  }, [postId]);

  const handleDelete = async () => {
    if (!post) return;
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    setIsDeleting(true);
    try {
      await api.delete(`/posts/${post._id}`);
      navigate(`/profile/${post.author.username}`);
    } catch (err) {
      console.error('Error deleting post:', err);
      alert(err.response?.data?.error?.message || 'Failed to delete post.');
    } finally {
      setIsDeleting(false);
    }
  };

  const nextImage = () => {
    if (post.images && post.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % post.images.length);
    }
  };

  const prevImage = () => {
    if (post.images && post.images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + post.images.length) % post.images.length);
    }
  };

  const renderCaption = (text) => {
    if (!text) return null;
    const parts = text.split(/(#[a-zA-Z0-9_]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        const tag = part.substring(1);
        return (
          <Link key={i} to={`/search?q=${encodeURIComponent(tag)}`} style={styles.hashtag}>
            {part}
          </Link>
        );
      }
      return part;
    });
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div className="spinner"></div>
        <span>Loading post details...</span>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div style={styles.errorContainer} className="glass-panel">
        <AlertCircle size={48} style={{ color: 'var(--error)' }} />
        <h3>Failed to Load Post</h3>
        <p>{error || 'Post not found.'}</p>
        <button className="btn-primary" onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    );
  }

  const isOwner = currentUser?.id === post.author?.id || currentUser?.id === post.author?._id;
  const formattedDate = new Date(post.createdAt).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const cdnBase = (import.meta.env.VITE_CDN_URL || 'https://trendora-9k7e.onrender.com/uploads')
    .replace('/uploads', '');

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          <ArrowLeft size={18} />
          Back
        </button>
      </header>

      {/* Main Post Grid Section */}
      <div style={styles.card} className="glass-panel">
        {/* Header - Author Info */}
        <div style={styles.cardHeader}>
          <div style={styles.authorArea} onClick={() => navigate(`/profile/${post.author.username}`)}>
            <img
              src={post.author.profilePicture ? getImageUrl(post.author.profilePicture) : `https://api.dicebear.com/7.x/bottts/svg?seed=${post.author.username}`}
              alt={post.author.username}
              style={styles.avatar}
              onError={(e) => {
                e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${post.author.username}`;
              }}
            />
            <div style={styles.nameGroup}>
              <span style={styles.fullName}>{post.author.firstName} {post.author.lastName}</span>
              <span style={styles.username}>@{post.author.username}</span>
            </div>
          </div>

          {isOwner && (
            <div style={styles.ownerActions}>
              <button 
                onClick={() => navigate(`/posts/${post._id}/edit`)} 
                style={styles.iconBtn} 
                title="Edit Post"
              >
                <Edit size={16} />
              </button>
              <button 
                onClick={handleDelete} 
                disabled={isDeleting}
                style={{ ...styles.iconBtn, ...styles.deleteBtn }} 
                title="Delete Post"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Media Slideshow */}
        {post.images && post.images.length > 0 && (
          <div style={styles.mediaContainer}>
            <img
              src={getImageUrl(post.images[currentImageIndex])}
              alt={`Post slide ${currentImageIndex + 1}`}
              style={styles.postImage}
            />

            {post.images.length > 1 && (
              <>
                <button onClick={prevImage} style={{ ...styles.sliderArrow, left: '1rem' }}>
                  <ChevronLeft size={22} />
                </button>
                <button onClick={nextImage} style={{ ...styles.sliderArrow, right: '1rem' }}>
                  <ChevronRight size={22} />
                </button>
                <div style={styles.dotsContainer}>
                  {post.images.map((_, idx) => (
                    <span
                      key={idx}
                      style={{
                        ...styles.dot,
                        ...(idx === currentImageIndex ? styles.activeDot : {}),
                      }}
                    ></span>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Content Info */}
        <div style={styles.contentArea}>
          {post.caption && (
            <p style={styles.caption}>{renderCaption(post.caption)}</p>
          )}

          <div style={styles.metaRow}>
            <span style={styles.metaItem}>
              <Calendar size={14} style={{ marginRight: '0.4rem' }} />
              {formattedDate}
            </span>
            <span style={styles.metaItem}>
              {post.visibility === 'public' && (
                <><Globe size={14} style={{ marginRight: '0.4rem' }} /> Public</>
              )}
              {post.visibility === 'friends' && (
                <><Users size={14} style={{ marginRight: '0.4rem' }} /> Followers</>
              )}
              {post.visibility === 'private' && (
                <><Lock size={14} style={{ marginRight: '0.4rem' }} /> Only Me</>
              )}
            </span>
          </div>
        </div>

        {/* Social Status Placers */}
        <div style={styles.actionsBar}>
          <button
            onClick={handleLikeToggle}
            style={{
              ...styles.actionBtn,
              ...(post.isLiked ? styles.likedBtn : {}),
            }}
            disabled={isLiking}
          >
            <Heart size={20} fill={post.isLiked ? 'var(--error)' : 'transparent'} />
            <span>{post.likesCount || 0} Likes</span>
          </button>
          <button style={styles.actionBtn}>
            <MessageCircle size={20} />
            <span>{post.commentsCount || 0} Comments</span>
          </button>
          <button style={styles.actionBtn}>
            <Share2 size={20} />
            <span>Share</span>
          </button>
        </div>
      </div>

      <CommentsSection postId={post._id} initialCommentsCount={post.commentsCount} />
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
    alignItems: 'flex-start',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: 0,
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'var(--transition-fast)',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
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
  card: {
    width: '100%',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    cursor: 'pointer',
  },
  avatar: {
    width: '46px',
    height: '46px',
    borderRadius: 'var(--radius-full)',
    objectFit: 'cover',
    border: '2px solid var(--border-glass)',
    background: 'var(--bg-secondary)',
  },
  nameGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  fullName: {
    fontWeight: '700',
    fontSize: '1.05rem',
    color: 'var(--text-primary)',
  },
  username: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    fontWeight: '500',
  },
  ownerActions: {
    display: 'flex',
    gap: '0.75rem',
  },
  iconBtn: {
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
  deleteBtn: {
    color: 'var(--error)',
    borderColor: 'hsla(355, 75%, 50%, 0.25)',
  },
  mediaContainer: {
    position: 'relative',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    border: '1px solid var(--border-glass)',
    backgroundColor: 'var(--bg-secondary)',
    height: '450px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  sliderArrow: {
    position: 'absolute',
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#fff',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    top: '50%',
    transform: 'translateY(-50%)',
    transition: 'var(--transition-fast)',
    zIndex: 2,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: '1rem',
    display: 'flex',
    justifyContent: 'center',
    gap: '0.5rem',
    width: '100%',
    zIndex: 2,
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.4)',
    transition: 'var(--transition-fast)',
  },
  activeDot: {
    background: '#fff',
    transform: 'scale(1.2)',
  },
  contentArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  caption: {
    fontSize: '1.05rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
    wordBreak: 'break-word',
  },
  hashtag: {
    color: 'var(--secondary)',
    fontWeight: '600',
    marginRight: '0.15rem',
  },
  metaRow: {
    display: 'flex',
    gap: '2rem',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    fontWeight: '500',
    borderBottom: '1px solid var(--border-glass)',
    paddingBottom: '1rem',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
  },
  actionsBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '3rem',
  },
  actionBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '600',
    transition: 'var(--transition-fast)',
  },
  likedBtn: {
    color: 'var(--error)',
  },
};

export default PostDetails;
