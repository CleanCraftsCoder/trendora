import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    
    if (!email || !password) {
      setFormError('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setFormError(err.message || 'Login failed. Please try again.');
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

      <div style={styles.card} className="glass-panel">
        <div style={styles.header}>
          <h1 style={styles.brandTitle}>Trendora</h1>
          <p style={styles.brandSubtitle}>Enter your credentials to access your feed</p>
        </div>

        {formError && (
          <div style={styles.errorAlert}>
            <AlertCircle size={20} style={{ color: 'var(--error)', flexShrink: 0 }} />
            <span style={styles.errorText}>{formError}</span>
          </div>
        )}

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
              />
            </div>
          </div>

          <div className="input-group">
            <div style={styles.passwordHeader}>
              <label className="input-label">Password</label>
              <Link to="/forgot-password" style={styles.forgotLink}>Forgot?</Link>
            </div>
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

          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
            style={styles.submitBtn}
          >
            {isSubmitting ? (
              <div style={styles.loaderContainer}>
                <div className="spinner" style={styles.btnSpinner}></div>
                <span>Signing In...</span>
              </div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div style={styles.footer}>
          <span style={styles.footerText}>Don't have an account? </span>
          <Link to="/signup" style={styles.signupLink}>Sign Up</Link>
        </div>
      </div>
    </div>
  );
};

const styles = {
  card: {
    width: '100%',
    maxWidth: '460px',
    padding: '3rem 2.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  header: {
    textAlign: 'center',
  },
  brandTitle: {
    fontSize: '2.5rem',
    fontWeight: '800',
    background: 'var(--primary-gradient)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.03em',
    marginBottom: '0.5rem',
  },
  brandSubtitle: {
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
    lineHeight: '1.4',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
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
  passwordHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  forgotLink: {
    fontSize: '0.8rem',
    color: 'var(--secondary)',
    fontWeight: '500',
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
  footer: {
    textAlign: 'center',
    fontSize: '0.9rem',
  },
  footerText: {
    color: 'var(--text-secondary)',
  },
  signupLink: {
    fontWeight: '600',
    color: 'var(--secondary)',
  },
};

export default Login;
