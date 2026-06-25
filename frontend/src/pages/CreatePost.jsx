import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { 
  Upload, X, Image as ImageIcon, Globe, 
  Users, Lock, AlertCircle, ArrowLeft 
} from 'lucide-react';
import CaptionAssistant from '../components/CaptionAssistant';

const CreatePost = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSelectHashtags = (tags) => {
    // Strip existing hashtags and reconstruct the caption with current toggled tag pills
    const words = caption.split(/\s+/);
    const textWords = words.filter((w) => !w.startsWith('#'));
    const baseText = textWords.join(' ').trim();
    
    if (tags.length > 0) {
      const hashtagsStr = tags.map((t) => `#${t}`).join(' ');
      setCaption(`${baseText} ${hashtagsStr}`.trim());
    } else {
      setCaption(baseText);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    if (selectedFiles.length + files.length > 10) {
      setError('You can upload a maximum of 10 images.');
      return;
    }

    const validFiles = [];
    const validPreviews = [];

    files.forEach((file) => {
      // Validate file size (max 5MB)
      if (file.size > 5242880) {
        setError('Each file size must be less than 5MB.');
        return;
      }

      validFiles.push(file);
      validPreviews.push(URL.createObjectURL(file));
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    setPreviews((prev) => [...prev, ...validPreviews]);
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    
    // Revoke object URL to avoid memory leak
    URL.revokeObjectURL(previews[index]);
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (selectedFiles.length === 0) {
      setError('Please select at least one image.');
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('caption', caption);
    formData.append('visibility', visibility);
    
    selectedFiles.forEach((file) => {
      formData.append('images', file);
    });

    try {
      await api.post('/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Redirect to user's profile
      navigate(`/profile/${user.username}`);
    } catch (err) {
      console.error('Post creation error:', err);
      setError(err.response?.data?.error?.message || 'Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          <ArrowLeft size={18} />
          Back
        </button>
        <h2 style={styles.title}>Create Post</h2>
        <p style={styles.subtitle}>Share your thoughts and media with your followers.</p>
      </header>

      {error && (
        <div style={styles.errorAlert}>
          <AlertCircle size={20} style={{ color: 'var(--error)', flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.form} className="glass-panel">
        {/* Drag and Drop Zone */}
        <div style={styles.uploadSection}>
          {previews.length === 0 ? (
            <label style={styles.dropzone}>
              <Upload size={40} style={styles.uploadIcon} />
              <span style={styles.dropzoneTitle}>Upload Images</span>
              <span style={styles.dropzoneSubtitle}>Support up to 10 images (JPEG, PNG, WEBP, GIF, max 5MB)</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>
          ) : (
            <div style={styles.previewContainer}>
              <div style={styles.grid}>
                {previews.map((preview, index) => (
                  <div key={index} style={styles.previewCard}>
                    <img src={preview} alt={`Upload ${index}`} style={styles.previewImg} />
                    <button 
                      type="button" 
                      onClick={() => removeFile(index)} 
                      style={styles.removeBtn}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                
                {previews.length < 10 && (
                  <label style={styles.addMoreCard}>
                    <Upload size={20} />
                    <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>Add More</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>
            </div>
          )}
        </div>

        {/* AI Caption Assistant Section (Phase 13) */}
        {selectedFiles.length > 0 && (
          <CaptionAssistant
            imageFile={selectedFiles[0]}
            onSelectCaption={(sugCap) => setCaption(sugCap)}
            onSelectHashtags={handleSelectHashtags}
          />
        )}

        {/* Caption Form Input */}
        <div className="input-group">
          <label className="input-label">Caption</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="What is on your mind?..."
            className="input-field"
            style={styles.textarea}
            rows={5}
            maxLength={2000}
          />
          <span style={styles.charCount}>{caption.length}/2000</span>
        </div>

        {/* Visibility Form Input */}
        <div className="input-group">
          <label className="input-label">Post Visibility</label>
          <div style={styles.visibilityGrid}>
            <button
              type="button"
              onClick={() => setVisibility('public')}
              style={{
                ...styles.visibilityBtn,
                ...(visibility === 'public' ? styles.visibilityActive : {}),
              }}
            >
              <Globe size={16} />
              <span>Public</span>
            </button>
            <button
              type="button"
              onClick={() => setVisibility('friends')}
              style={{
                ...styles.visibilityBtn,
                ...(visibility === 'friends' ? styles.visibilityActive : {}),
              }}
            >
              <Users size={16} />
              <span>Followers</span>
            </button>
            <button
              type="button"
              onClick={() => setVisibility('private')}
              style={{
                ...styles.visibilityBtn,
                ...(visibility === 'private' ? styles.visibilityActive : {}),
              }}
            >
              <Lock size={16} />
              <span>Only Me</span>
            </button>
          </div>
        </div>

        {/* Submit Actions */}
        <div style={styles.actions}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
            style={styles.actionBtn}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
            style={styles.actionBtn}
          >
            {isSubmitting ? 'Uploading...' : 'Publish Post'}
          </button>
        </div>
      </form>
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
    gap: '0.5rem',
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
  title: {
    fontSize: '2rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
    marginTop: '0.5rem',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: 'var(--text-secondary)',
  },
  form: {
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  uploadSection: {
    width: '100%',
  },
  dropzone: {
    width: '100%',
    height: '200px',
    border: '2px dashed var(--border-glass)',
    borderRadius: 'var(--radius-lg)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    background: 'rgba(0,0,0,0.1)',
  },
  uploadIcon: {
    color: 'var(--secondary)',
    filter: 'drop-shadow(var(--glow-secondary))',
  },
  dropzoneTitle: {
    fontWeight: '600',
    fontSize: '1.05rem',
  },
  dropzoneSubtitle: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    textAlign: 'center',
    padding: '0 1rem',
  },
  previewContainer: {
    width: '100%',
    padding: '1rem',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-glass)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: '0.75rem',
  },
  previewCard: {
    position: 'relative',
    height: '100px',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    border: '1.5px solid var(--border-glass)',
  },
  previewImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  removeBtn: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    background: 'rgba(0,0,0,0.7)',
    border: 'none',
    color: '#fff',
    borderRadius: '50%',
    width: '22px',
    height: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
  },
  addMoreCard: {
    height: '100px',
    border: '2px dashed var(--border-glass)',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.25rem',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    transition: 'var(--transition-fast)',
  },
  textarea: {
    width: '100%',
    resize: 'none',
    lineHeight: '1.5',
  },
  charCount: {
    alignSelf: 'flex-end',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '-0.25rem',
  },
  visibilityGrid: {
    display: 'flex',
    gap: '1rem',
    width: '100%',
  },
  visibilityBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-glass)',
    background: 'hsla(240, 15%, 5%, 0.3)',
    color: 'var(--text-secondary)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  visibilityActive: {
    background: 'var(--bg-secondary)',
    color: 'var(--secondary)',
    borderColor: 'var(--secondary)',
    boxShadow: 'var(--glow-secondary)',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    marginTop: '1rem',
  },
  actionBtn: {
    minWidth: '130px',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    backgroundColor: 'hsla(355, 75%, 50%, 0.1)',
    border: '1px solid hsla(355, 75%, 50%, 0.25)',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
  },
};

export default CreatePost;
