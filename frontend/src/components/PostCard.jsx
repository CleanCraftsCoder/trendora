import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { getImageUrl } from '../utils/imageUrl';
import { 
  Heart, MessageCircle, Share2, MoreHorizontal, 
  Trash2, Edit, ChevronLeft, ChevronRight, AlertTriangle
} from 'lucide-react';

const PostCard = ({ post, onDeleteSuccess }) => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [isLiking, setIsLiking] = useState(false);

  // Dwell-time view tracking (2s)
  useEffect(() => {
    if (!currentUser || post.author?.id === currentUser.id || post.author?._id === currentUser.id) return;
    const timer = setTimeout(() => {
      api.post('/feed/interact', { postId: post._id, interactionType: 'view' }).catch(() => {});
    }, 2000);
    return () => clearTimeout(timer);
  }, [post._id, currentUser]);

  const handlePostClick = () => {
    if (currentUser && post.author?.id !== currentUser.id && post.author?._id !== currentUser.id) {
      api.post('/feed/interact', { postId: post._id, interactionType: 'click' }).catch(() => {});
    }
    navigate(`/posts/${post._id}`);
  };

  const handleLikeToggle = async (e) => {
    e.stopPropagation();
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (isLiking) return;

    const previousIsLiked = isLiked;
    const previousLikesCount = likesCount;

    setIsLiked(!previousIsLiked);
    setLikesCount(previousIsLiked ? Math.max(0, previousLikesCount - 1) : previousLikesCount + 1);
    setIsLiking(true);

    try {
      if (previousIsLiked) {
        await api.delete(`/posts/${post._id}/like`);
      } else {
        await api.post(`/posts/${post._id}/like`);
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
      setIsLiked(previousIsLiked);
      setLikesCount(previousLikesCount);
    } finally {
      setIsLiking(false);
    }
  };

  const isOwner = currentUser?.id === post.author?.id || currentUser?.id === post.author?._id;

  const nextImage = (e) => {
    e.stopPropagation();
    if (post.images && post.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % post.images.length);
    }
  };

  const prevImage = (e) => {
    e.stopPropagation();
    if (post.images && post.images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + post.images.length) % post.images.length);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
    setIsDeleting(true);
    try {
      await api.delete(`/posts/${post._id}`);
      if (onDeleteSuccess) {
        onDeleteSuccess(post._id);
      }
    } catch (err) {
      console.error('Failed to delete post:', err);
      alert('Failed to delete post. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper to render caption text with highlighted clickable hashtags
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

  const formattedDate = new Date(post.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const shouldTruncate = post.caption && post.caption.length > 150;
  const displayCaption = shouldTruncate && !isExpanded 
    ? `${post.caption.substring(0, 150)}...` 
    : post.caption;

  const cdnBase = (import.meta.env.VITE_CDN_URL || 'https://trendora-9k7e.onrender.com/uploads')
    .replace('/uploads', '');

  return (
    <article style={styles.card} className="glass-panel" onClick={handlePostClick}>
      {/* Header Info Area */}
      <div style={styles.header}>
        <div style={styles.authorInfo} onClick={(e) => { e.stopPropagation(); navigate(`/profile/${post.author?.username}`); }}>
          <img
            src={post.author?.profilePicture ? getImageUrl(post.author.profilePicture) : `https://api.dicebear.com/7.x/bottts/svg?seed=${post.author?.username}`}
            alt={post.author?.username}
            style={styles.avatar}
            onError={(e) => {
              e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${post.author?.username}`;
            }}
          />
          <div style={styles.nameContainer}>
            <span style={styles.fullName}>{post.author?.firstName} {post.author?.lastName}</span>
            <span style={styles.metaText}>@{post.author?.username} • {formattedDate}</span>
          </div>
        </div>

        {isOwner && (
          <div style={styles.menuWrapper}>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} 
              style={styles.menuBtn}
            >
              <MoreHorizontal size={20} />
            </button>
            {showMenu && (
              <div style={styles.menuDropdown} className="glass-panel">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/posts/${post._id}/edit`);
                  }}
                  style={styles.menuItem}
                >
                  <Edit size={14} style={{ marginRight: '0.5rem' }} />
                  Edit Post
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  style={{ ...styles.menuItem, ...styles.deleteItem }}
                >
                  <Trash2 size={14} style={{ marginRight: '0.5rem' }} />
                  {isDeleting ? 'Deleting...' : 'Delete Post'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {post.moderationStatus === 'pending_review' && (
        <div style={styles.moderationBanner} onClick={(e) => e.stopPropagation()}>
          <AlertTriangle size={14} style={{ marginRight: '0.4rem', flexShrink: 0 }} />
          <span>This post is pending content review and may be hidden soon.</span>
        </div>
      )}

      {/* Caption Content Area */}
      {post.caption && (
        <div style={styles.captionContainer}>
          <p style={styles.caption}>
            {renderCaption(displayCaption)}
            {shouldTruncate && (
              <button 
                onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                style={styles.showMoreBtn}
              >
                {isExpanded ? ' Show less' : ' Show more'}
              </button>
            )}
          </p>
        </div>
      )}

      {/* Post Images Slider Area */}
      {post.images && post.images.length > 0 && (
        <div style={styles.mediaContainer}>
          <img
            src={getImageUrl(post.images[currentImageIndex])}
            alt={`Attachment ${currentImageIndex + 1}`}
            style={styles.postImage}
          />
          
          {post.images.length > 1 && (
            <>
              <button onClick={prevImage} style={{ ...styles.sliderArrow, left: '1rem' }} className="slider-btn">
                <ChevronLeft size={20} />
              </button>
              <button onClick={nextImage} style={{ ...styles.sliderArrow, right: '1rem' }} className="slider-btn">
                <ChevronRight size={20} />
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

      {/* Engagement Actions Footer Bar */}
      <div style={styles.actionsBar} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={handleLikeToggle}
          style={{
            ...styles.actionBtn,
            ...(isLiked ? styles.likedBtn : {}),
          }}
          disabled={isLiking}
        >
          <Heart size={20} fill={isLiked ? 'var(--error)' : 'transparent'} />
          <span>{likesCount}</span>
        </button>

        <button style={styles.actionBtn} onClick={() => navigate(`/posts/${post._id}`)}>
          <MessageCircle size={20} />
          <span>{post.commentsCount || 0}</span>
        </button>

        <button style={styles.actionBtn}>
          <Share2 size={20} />
          <span>{post.sharesCount || 0}</span>
        </button>
      </div>
    </article>
  );
};

const styles = {
  card: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    cursor: 'pointer',
    width: '100%',
    marginBottom: '1.5rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
  },
  authorInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flex: 1,
  },
  avatar: {
    width: '42px',
    height: '42px',
    borderRadius: 'var(--radius-full)',
    objectFit: 'cover',
    border: '1.5px solid var(--border-glass)',
    background: 'var(--bg-secondary)',
  },
  nameContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  fullName: {
    fontWeight: '600',
    fontSize: '0.95rem',
    color: 'var(--text-primary)',
  },
  metaText: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    fontWeight: '500',
  },
  menuWrapper: {
    position: 'relative',
  },
  menuBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '0.25rem',
    borderRadius: 'var(--radius-sm)',
    transition: 'var(--transition-fast)',
    display: 'flex',
    alignItems: 'center',
  },
  menuDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    width: '150px',
    zIndex: 10,
    padding: '0.25rem',
    marginTop: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 'var(--radius-md)',
  },
  menuItem: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    padding: '0.6rem 0.8rem',
    fontSize: '0.85rem',
    fontWeight: '500',
    textAlign: 'left',
    cursor: 'pointer',
    borderRadius: 'var(--radius-sm)',
    transition: 'var(--transition-fast)',
    display: 'flex',
    alignItems: 'center',
  },
  deleteItem: {
    color: 'var(--error)',
  },
  captionContainer: {
    lineHeight: '1.5',
  },
  caption: {
    fontSize: '0.95rem',
    color: 'var(--text-secondary)',
    wordBreak: 'break-word',
  },
  hashtag: {
    color: 'var(--secondary)',
    fontWeight: '600',
    marginRight: '0.15rem',
  },
  showMoreBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  mediaContainer: {
    position: 'relative',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    border: '1px solid var(--border-glass)',
    backgroundColor: 'var(--bg-secondary)',
    maxHeight: '400px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postImage: {
    width: '100%',
    height: '100%',
    maxHeight: '400px',
    objectFit: 'contain',
  },
  sliderArrow: {
    position: 'absolute',
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#fff',
    borderRadius: '50%',
    width: '36px',
    height: '36px',
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
    gap: '0.4rem',
    width: '100%',
    zIndex: 2,
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.4)',
    transition: 'var(--transition-fast)',
  },
  activeDot: {
    background: '#fff',
    transform: 'scale(1.2)',
  },
  actionsBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '2rem',
    borderTop: '1px solid var(--border-glass)',
    paddingTop: '0.75rem',
    marginTop: '0.5rem',
  },
  actionBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'var(--transition-fast)',
  },
  likedBtn: {
    color: 'var(--error)',
  },
  moderationBanner: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'hsla(35, 100%, 50%, 0.1)',
    border: '1px solid hsla(35, 100%, 50%, 0.25)',
    color: '#ffaa00',
    padding: '0.5rem 0.75rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.8rem',
    fontWeight: '500',
    marginTop: '0.25rem',
  },
};

styles.menuItem[':hover'] = {
  background: 'rgba(255,255,255,0.05)',
  color: 'var(--text-primary)',
};
styles.actionBtn[':hover'] = {
  color: 'var(--secondary)',
};

export default PostCard;
