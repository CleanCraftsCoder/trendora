import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, ArrowLeft, AlertCircle, CheckCircle, ArrowRight, Shield } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successData, setSuccessData] = useState(null);

  const { forgotPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setFormError('Please enter your email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await forgotPassword(trimmedEmail);
      setSuccessData(response.data || {});
    } catch (err) {
      setFormError(err.message || 'Failed to request password reset. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Dynamic Background Blobs */}
      <div className="blob-container">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <div style={styles.card} className="glass-panel auth-card">
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.iconCircle}>
            <Shield size={26} style={{ color: 'var(--primary-glow)' }} />
          </div>
          <h1 style={styles.brandTitle}>Forgot Password</h1>
          <p style={styles.brandSubtitle}>
            Enter your email and we&apos;ll help you regain access to your Trendora account.
          </p>
        </div>

        {/* Error Alert */}
        {formError && (
          <div style={styles.errorAlert}>
            <AlertCircle size={20} style={{ color: 'var(--error)', flexShrink: 0 }} />
            <span style={styles.errorText}>{formError}</span>
          </div>
        )}

        {/* Success View */}
        {successData ? (
          <div style={styles.successContainer}>
            <div style={styles.successIconBox}>
              <CheckCircle size={36} style={{ color: 'var(--success)' }} />
            </div>
            <h3 style={styles.successTitle}>Check Your Email</h3>
            <p style={styles.successText}>
              If an account exists for <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>, a password reset link has been generated.
            </p>

            {/* In Development/Local Mode, provide instant direct link for easy testing */}
            {successData.resetToken && (
              <div style={styles.devResetBox}>
                <span style={styles.devBadge}>LOCAL DEV MODE</span>
                <p style={styles.devNote}>
                  Ready to test password reset locally:
                </p>
                <button
                  type="button"
                  onClick={() => navigate(`/reset-password?token=${successData.resetToken}`)}
                  className="btn-primary"
                  style={styles.directResetBtn}
                >
                  <span>Proceed to Reset Password</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            )}

            <div style={styles.backRow}>
              <Link to="/login" style={styles.backLink}>
                <ArrowLeft size={16} />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Form View */
          <form onSubmit={handleSubmit} style={styles.form}>
            <div className="input-group">
              <label className="input-label">Email Address</label>
              <div style={styles.inputContainer}>
                <Mail size={18} style={styles.inputIcon} />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  style={styles.field}
                  required
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              style={styles.submitBtn}
            >
              {isSubmitting ? (
                <div style={styles.loaderContainer}>
                  <div className="spinner" style={styles.btnSpinner}></div>
                  <span>Generating Link...</span>
                </div>
              ) : (
                'Send Reset Link'
              )}
            </button>

            <div style={styles.footer}>
              <Link to="/login" style={styles.backLink}>
                <ArrowLeft size={16} />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const styles = {
  card: {
    width: '100%',
    maxWidth: '460px',
    padding: '2.5rem',
    borderRadius: 'var(--radius-lg)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    position: 'relative',
    zIndex: 10,
    backgroundColor: 'var(--bg-glass)',
    backdropFilter: 'blur(16px)',
    border: '1px solid var(--border-glass)',
    boxShadow: 'var(--shadow-glass)',
  },
  header: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
  },
  iconCircle: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: 'rgba(217, 70, 239, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '0.25rem',
    border: '1px solid rgba(217, 70, 239, 0.25)',
  },
  brandTitle: {
    fontSize: '1.75rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  brandSubtitle: {
    fontSize: '0.88rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.45',
    margin: 0,
    maxWidth: '340px',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: 'var(--radius-sm)',
  },
  errorText: {
    color: 'var(--error)',
    fontSize: '0.85rem',
    fontWeight: '500',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  inputContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '1rem',
    color: 'var(--text-muted)',
    pointerEvents: 'none',
  },
  field: {
    paddingLeft: '2.75rem',
  },
  submitBtn: {
    width: '100%',
    height: '48px',
    fontSize: '1rem',
    fontWeight: '600',
    borderRadius: 'var(--radius-md)',
    marginTop: '0.25rem',
  },
  loaderContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  },
  btnSpinner: {
    width: '18px',
    height: '18px',
    borderWidth: '2px',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderTopColor: '#fff',
  },
  footer: {
    textAlign: 'center',
    marginTop: '0.5rem',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    color: 'var(--text-secondary)',
    fontSize: '0.88rem',
    fontWeight: '500',
    transition: 'var(--transition-fast)',
    textDecoration: 'none',
  },
  successContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '1rem',
    padding: '0.5rem 0',
  },
  successIconBox: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(34, 197, 94, 0.25)',
  },
  successTitle: {
    margin: 0,
    fontSize: '1.35rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  successText: {
    fontSize: '0.88rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
    margin: 0,
  },
  devResetBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '1px dashed var(--border-glass)',
    borderRadius: 'var(--radius-md)',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
    marginTop: '0.5rem',
  },
  devBadge: {
    fontSize: '0.7rem',
    fontWeight: '700',
    letterSpacing: '0.08em',
    color: 'var(--secondary)',
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    padding: '0.2rem 0.6rem',
    borderRadius: '999px',
  },
  devNote: {
    fontSize: '0.82rem',
    color: 'var(--text-secondary)',
    margin: 0,
  },
  directResetBtn: {
    width: '100%',
    height: '42px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontSize: '0.9rem',
    fontWeight: '600',
  },
  backRow: {
    marginTop: '0.5rem',
  },
};

export default ForgotPassword;
