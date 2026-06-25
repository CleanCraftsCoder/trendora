import React, { useState } from 'react';

const CommentForm = ({ 
  initialText = '', 
  placeholder = 'Add a comment...', 
  submitLabel = 'Post', 
  onSubmit, 
  onCancel, 
  maxLength = 1000 
}) => {
  const [text, setText] = useState(initialText);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || submitting) return;

    setSubmitting(true);
    try {
      await onSubmit(text);
      if (!initialText) {
        setText('');
      }
    } catch (err) {
      console.error('Failed to submit comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <textarea
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={maxLength}
        style={styles.textarea}
        rows={2}
        required
      />
      <div style={styles.footer}>
        <span style={styles.charCount}>{text.length}/{maxLength}</span>
        <div style={styles.actions}>
          {onCancel && (
            <button 
              type="button" 
              onClick={onCancel} 
              style={styles.cancelBtn}
              className="btn-secondary"
            >
              Cancel
            </button>
          )}
          <button 
            type="submit" 
            disabled={!text.trim() || submitting}
            className="btn-primary"
            style={styles.submitBtn}
          >
            {submitting ? 'Posting...' : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
};

const styles = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    width: '100%',
  },
  textarea: {
    width: '100%',
    background: 'rgba(0, 0, 0, 0.25)',
    border: '1px solid var(--border-glass)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    padding: '0.75rem 1rem',
    fontSize: '0.925rem',
    outline: 'none',
    resize: 'none',
    fontFamily: 'var(--font-sans)',
    transition: 'var(--transition-fast)',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  charCount: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
  },
  cancelBtn: {
    padding: '0.4rem 1rem',
    fontSize: '0.85rem',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    border: '1px solid var(--border-glass)',
  },
  submitBtn: {
    padding: '0.4rem 1.25rem',
    fontSize: '0.85rem',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
  },
};

export default CommentForm;
