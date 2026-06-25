import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { User, AlignLeft, Globe, Lock as LockIcon, Check, ArrowLeft, AlertCircle } from 'lucide-react';

const EditProfile = () => {
  const { user, setUser } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setBio(user.bio || '');
      setIsPublic(user.isPublic !== false); // Default to true if not specified
      setNotificationsEnabled(user.notificationsEnabled !== false);
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const res = await api.put('/users/me/profile', {
        firstName,
        lastName,
        bio,
        isPublic,
        notificationsEnabled,
      });

      // Update local storage/context user object
      const updatedUser = res.data.data;
      setUser((prev) => ({
        ...prev,
        ...updatedUser,
      }));

      setSuccess(true);
      setTimeout(() => {
        navigate(`/profile/${user.username}`);
      }, 1500);
    } catch (err) {
      console.error('Update profile error:', err);
      setError(err.response?.data?.error?.message || 'Failed to update profile.');
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
        <h2 style={styles.title}>Edit Profile</h2>
        <p style={styles.subtitle}>Update your personal information and profile settings.</p>
      </header>

      {error && (
        <div style={styles.errorAlert}>
          <AlertCircle size={20} style={{ color: 'var(--error)' }} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div style={styles.successAlert}>
          <Check size={20} style={{ color: 'var(--success)' }} />
          <span>Profile updated successfully! Redirecting...</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.form} className="glass-panel">
        <div style={styles.row}>
          <div className="input-group">
            <label className="input-label">First Name</label>
            <div style={styles.inputContainer}>
              <User size={16} style={styles.inputIcon} />
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="input-field"
                style={styles.field}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Last Name</label>
            <div style={styles.inputContainer}>
              <User size={16} style={styles.inputIcon} />
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="input-field"
                style={styles.field}
                required
              />
            </div>
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Biography</label>
          <div style={styles.inputContainer}>
            <AlignLeft size={16} style={{ ...styles.inputIcon, top: '1rem' }} />
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell the world about yourself..."
              className="input-field"
              style={styles.textarea}
              rows={4}
              maxLength={500}
            />
          </div>
          <span style={styles.charCount}>{bio.length}/500</span>
        </div>

        {/* Account Privacy Toggle */}
        <div className="input-group" style={styles.toggleGroup}>
          <label className="input-label">Account Privacy</label>
          <div style={styles.toggleContainer}>
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              style={{
                ...styles.toggleBtn,
                ...(isPublic ? styles.toggleActive : {}),
              }}
            >
              <Globe size={16} style={{ marginRight: '0.5rem' }} />
              Public
            </button>
            <button
              type="button"
              onClick={() => setIsPublic(false)}
              style={{
                ...styles.toggleBtn,
                ...(!isPublic ? styles.toggleActive : {}),
              }}
            >
              <LockIcon size={16} style={{ marginRight: '0.5rem' }} />
              Private
            </button>
          </div>
          <p style={styles.toggleHelp}>
            {isPublic 
              ? 'Anyone can follow you and view your posts.' 
              : 'Only approved followers can view your posts.'}
          </p>
        </div>

        <div style={styles.actions}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
            style={styles.actionBtn}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
            style={styles.actionBtn}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
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
    padding: '2.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  row: {
    display: 'flex',
    gap: '1.5rem',
  },
  inputContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  },
  inputIcon: {
    position: 'absolute',
    left: '1rem',
    color: 'var(--text-muted)',
  },
  field: {
    paddingLeft: '2.5rem',
    width: '100%',
  },
  textarea: {
    paddingLeft: '2.5rem',
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
  toggleGroup: {
    gap: '0.75rem',
  },
  toggleContainer: {
    display: 'flex',
    gap: '0.75rem',
    background: 'rgba(0,0,0,0.2)',
    padding: '0.25rem',
    borderRadius: 'var(--radius-md)',
    width: 'fit-content',
    border: '1px solid var(--border-glass)',
  },
  toggleBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.5rem 1.25rem',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  toggleActive: {
    background: 'var(--bg-secondary)',
    color: 'var(--secondary)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  toggleHelp: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    marginTop: '0.25rem',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    marginTop: '1rem',
  },
  actionBtn: {
    minWidth: '120px',
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
  successAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    backgroundColor: 'hsla(145, 75%, 45%, 0.1)',
    border: '1px solid hsla(145, 75%, 45%, 0.25)',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
  },
};

export default EditProfile;
