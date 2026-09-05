import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Eye, EyeOff, Check, X, AlertCircle, CheckCircle, ArrowRight, KeyRound } from 'lucide-react';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  const urlToken = searchParams.get('token') || '';
  const [token, setToken] = useState(urlToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Password requirements validation state
  const [passRequirements, setPassRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  useEffect(() => {
    if (urlToken) {
      setToken(urlToken);
    }
  }, [urlToken]);

  useEffect(() => {
    setPassRequirements({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    });
  }, [password]);

  const isPasswordValid = Object.values(passRequirements).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!token.trim()) {
      setFormError('Password reset token is missing. Please check your reset link.');
      return;
    }

    if (!isPasswordValid) {
      setFormError('Password does not satisfy all security requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please re-enter your new password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(token.trim(), password);
      setIsSuccess(true);
    } catch (err) {
      setFormError(err.message || 'Failed to reset password. Please try again or request a new link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Background Blobs */}
      <div className="blob-container">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <div style={styles.card} className="glass-panel auth-card">
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.iconCircle}>
            <KeyRound size={26} style={{ color: 'var(--primary-glow)' }} />
          </div>
          <h1 style={styles.brandTitle}>Reset Password</h1>
          <p style={styles.brandSubtitle}>
            Create a strong, new password for your Trendora account.
          </p>
        </div>

        {/* Error Banner */}
        {formError && (
          <div style={styles.errorAlert}>
            <AlertCircle size={20} style={{ color: 'var(--error)', flexShrink: 0 }} />
            <span style={styles.errorText}>{formError}</span>
          </div>
        )}

        {/* Success View */}
        {isSuccess ? (
          <div style={styles.successContainer}>
            <div style={styles.successIconBox}>
              <CheckCircle size={40} style={{ color: 'var(--success)' }} />
            </div>
            <h3 style={styles.successTitle}>Password Reset Complete!</h3>
            <p style={styles.successText}>
              Your account password has been updated securely. You can now log in with your new credentials.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="btn-primary"
              style={styles.loginBtn}
            >
              <span>Sign In with New Password</span>
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          /* Form View */
          <form onSubmit={handleSubmit} style={styles.form}>
            {/* If token wasn't in URL query parameter, allow manual entry */}
            {!urlToken && (
              <div className="input-group">
                <label className="input-label">Reset Token</label>
                <div style={styles.inputContainer}>
                  <input
                    type="text"
                    placeholder="Enter reset token from your link"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
              </div>
            )}

            {/* New Password */}
            <div className="input-group">
              <label className="input-label">New Password</label>
              <div style={styles.inputContainer}>
                <Lock size={18} style={styles.inputIcon} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  style={styles.field}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Password Requirements Indicator */}
            {password && (
              <div style={styles.requirementsGrid}>
                <div style={styles.reqTitle}>Password Requirements:</div>
                <div style={styles.reqList}>
                  <div style={styles.reqItem(passRequirements.length)}>
                    {passRequirements.length ? <Check size={12} /> : <X size={12} />}
                    <span>Min 8 characters</span>
                  </div>
                  <div style={styles.reqItem(passRequirements.uppercase)}>
                    {passRequirements.uppercase ? <Check size={12} /> : <X size={12} />}
                    <span>Uppercase letter</span>
                  </div>
                  <div style={styles.reqItem(passRequirements.lowercase)}>
                    {passRequirements.lowercase ? <Check size={12} /> : <X size={12} />}
                    <span>Lowercase letter</span>
                  </div>
                  <div style={styles.reqItem(passRequirements.number)}>
                    {passRequirements.number ? <Check size={12} /> : <X size={12} />}
                    <span>Number (0-9)</span>
                  </div>
                  <div style={styles.reqItem(passRequirements.special)}>
                    {passRequirements.special ? <Check size={12} /> : <X size={12} />}
                    <span>Special character</span>
                  </div>
                </div>
              </div>
            )}

            {/* Confirm New Password */}
            <div className="input-group">
              <label className="input-label">Confirm New Password</label>
              <div style={styles.inputContainer}>
                <Lock size={18} style={styles.inputIcon} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field"
                  style={styles.field}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || (password && !isPasswordValid)}
              style={styles.submitBtn}
            >
              {isSubmitting ? (
                <div style={styles.loaderContainer}>
                  <div className="spinner" style={styles.btnSpinner}></div>
                  <span>Updating Password...</span>
                </div>
              ) : (
                'Set New Password'
              )}
            </button>

            <div style={styles.footer}>
              <Link to="/login" style={styles.backLink}>
                Cancel &amp; Return to Sign In
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
    maxWidth: '480px',
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
    paddingRight: '2.75rem',
  },
  eyeBtn: {
    position: 'absolute',
    right: '0.75rem',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.25rem',
  },
  requirementsGrid: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: '0.75rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-glass)',
  },
  reqTitle: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    marginBottom: '0.5rem',
  },
  reqList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.4rem',
  },
  reqItem: (met) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontSize: '0.72rem',
    color: met ? 'var(--success)' : 'var(--text-muted)',
    transition: 'var(--transition-fast)',
  }),
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
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    textDecoration: 'none',
  },
  successContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '1rem',
    padding: '1rem 0',
  },
  successIconBox: {
    width: '68px',
    height: '68px',
    borderRadius: '50%',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(34, 197, 94, 0.25)',
  },
  successTitle: {
    margin: 0,
    fontSize: '1.4rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  successText: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
    margin: 0,
  },
  loginBtn: {
    width: '100%',
    height: '46px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontSize: '0.95rem',
    fontWeight: '600',
    marginTop: '0.75rem',
  },
};

export default ResetPassword;
