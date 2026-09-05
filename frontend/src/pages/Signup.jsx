import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, AlertCircle, Eye, EyeOff, Check, X } from 'lucide-react';
import GoogleAuthButton from '../components/GoogleAuthButton';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password requirements state
  const [passRequirements, setPassRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  const { register } = useAuth();
  const navigate = useNavigate();

  // Update password requirement checks
  useEffect(() => {
    setPassRequirements({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    });
  }, [password]);

  const getEmailValidationError = (val) => {
    if (!val || !val.includes('@')) return '';
    const trimmed = val.trim().toLowerCase();
    const parts = trimmed.split('@');
    if (parts.length !== 2) return 'Invalid email format';
    const [userPart, domainPart] = parts;

    if (domainPart === 'gmail.com' || domainPart === 'googlemail.com') {
      if (userPart.length < 6) {
        return `Gmail usernames must be at least 6 characters ("${trimmed}" does not exist on Gmail).`;
      }
      if (userPart.length > 30) {
        return 'Gmail usernames cannot exceed 30 characters.';
      }
      if (!/^[a-z0-9.]+$/.test(userPart)) {
        return 'Gmail only allows letters (a-z), numbers (0-9), and periods (.).';
      }
      if (userPart.startsWith('.') || userPart.endsWith('.') || userPart.includes('..')) {
        return 'Gmail addresses cannot begin/end with a dot or contain consecutive dots.';
      }
      if (/^(anonymous|nobody|fake|dummy|test|temp|throwaway|acb|abc)$/i.test(userPart)) {
        return 'Anonymous or placeholder Gmail addresses are not accepted.';
      }
    }

    const disposable = [
      'mailinator.com',
      'tempmail.com',
      '10minutemail.com',
      'guerrillamail.com',
      'throwawaymail.com',
      'trashmail.com',
      'yopmail.com',
      'sharklasers.com',
      'dispostable.com',
      'fake.com',
    ];
    if (disposable.includes(domainPart)) {
      return 'Disposable email addresses are not permitted. Please use a permanent email.';
    }

    return '';
  };

  const emailError = getEmailValidationError(email);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!email || !username || !firstName || !lastName || !password) {
      setFormError('Please fill in all fields.');
      return;
    }

    const validationMsg = getEmailValidationError(email);
    if (validationMsg) {
      setFormError(validationMsg);
      return;
    }

    if (!isPasswordValid) {
      setFormError('Password does not meet all security requirements.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        email: email.trim().toLowerCase(),
        username: username.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      navigate('/');
    } catch (err) {
      setFormError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Background blobs for premium glassmorphism effect */}
      <div className="blob-container">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <div style={styles.card} className="glass-panel auth-card">
        <div style={styles.header}>
          <h1 style={styles.brandTitle}>Trendora</h1>
          <p style={styles.brandSubtitle}>Join now and connect with global creators</p>
        </div>

        {formError && (
          <div style={styles.errorAlert}>
            <AlertCircle size={20} style={{ color: 'var(--error)', flexShrink: 0 }} />
            <span style={styles.errorText}>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.row} className="signup-row">
            <div className="input-group">
              <label className="input-label">First Name</label>
              <div style={styles.inputContainer}>
                <User size={16} style={styles.inputIcon} />
                <input
                  type="text"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="input-field"
                  style={styles.rowField}
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
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="input-field"
                  style={styles.rowField}
                  required
                />
              </div>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Username</label>
            <div style={styles.inputContainer}>
              <span style={styles.usernamePrefix}>@</span>
              <input
                type="text"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
                style={styles.usernameField}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Email Address</label>
            <div style={styles.inputContainer}>
              <Mail size={18} style={styles.inputIcon} />
              <input
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                style={styles.field}
                required
              />
            </div>
            {emailError && (
              <div style={{ color: 'var(--error)', fontSize: '0.78rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <AlertCircle size={13} style={{ flexShrink: 0 }} />
                <span>{emailError}</span>
              </div>
            )}
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
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
                  <span>Special char (@, $, !, etc.)</span>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting || (password && !isPasswordValid)}
            style={styles.submitBtn}
          >
            {isSubmitting ? (
              <div style={styles.loaderContainer}>
                <div className="spinner" style={styles.btnSpinner}></div>
                <span>Creating Account...</span>
              </div>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div style={styles.divider}>
          <span style={styles.dividerLine}></span>
          <span style={styles.dividerText}>or continue with</span>
          <span style={styles.dividerLine}></span>
        </div>

        <GoogleAuthButton isSignup={true} onError={(msg) => setFormError(msg)} />

        <div style={styles.footer}>
          <span style={styles.footerText}>Already have an account? </span>
          <Link to="/login" style={styles.loginLink}>Sign In</Link>
        </div>
      </div>
    </div>
  );
};

const styles = {
  card: {
    width: '100%',
    maxWidth: '520px',
    padding: '2.5rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  header: {
    textAlign: 'center',
  },
  brandTitle: {
    fontSize: '2.2rem',
    fontWeight: '800',
    background: 'var(--primary-gradient)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.03em',
    marginBottom: '0.25rem',
  },
  brandSubtitle: {
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    lineHeight: '1.4',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  row: {
    display: 'flex',
    gap: '1rem',
    width: '100%',
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
    pointerEvents: 'none',
  },
  field: {
    paddingLeft: '2.75rem',
    width: '100%',
  },
  rowField: {
    paddingLeft: '2.5rem',
    width: '100%',
  },
  usernamePrefix: {
    position: 'absolute',
    left: '1rem',
    color: 'var(--text-muted)',
    fontWeight: '600',
    fontSize: '1.1rem',
    pointerEvents: 'none',
  },
  usernameField: {
    paddingLeft: '2rem',
    width: '100%',
  },
  eyeBtn: {
    position: 'absolute',
    right: '1rem',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  submitBtn: {
    marginTop: '1rem',
    width: '100%',
    height: '48px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '1rem',
  },
  loaderContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  btnSpinner: {
    width: '18px',
    height: '18px',
    borderWidth: '2px',
    borderLeftColor: '#fff',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    backgroundColor: 'hsla(355, 75%, 50%, 0.1)',
    border: '1px solid hsla(355, 75%, 50%, 0.25)',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
  },
  errorText: {
    fontSize: '0.85rem',
    color: 'var(--text-primary)',
    fontWeight: '500',
  },
  requirementsGrid: {
    background: 'rgba(0, 0, 0, 0.2)',
    padding: '1rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-glass)',
    marginBottom: '1rem',
  },
  reqTitle: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    marginBottom: '0.5rem',
  },
  reqList: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.5rem',
  },
  reqItem: (met) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
    color: met ? 'var(--success)' : 'var(--text-muted)',
    transition: 'var(--transition-fast)',
  }),
  footer: {
    textAlign: 'center',
    fontSize: '0.9rem',
  },
  footerText: {
    color: 'var(--text-secondary)',
  },
  loginLink: {
    fontWeight: '600',
    color: 'var(--secondary)',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    margin: '0.25rem 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: 'var(--border-glass)',
  },
  dividerText: {
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
};

export default Signup;
