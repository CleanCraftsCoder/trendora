import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, ArrowLeft, AlertCircle, CheckCircle, Shield, KeyRound, Lock, Eye, EyeOff, Check, X, RefreshCw } from 'lucide-react';

const ForgotPassword = () => {
  // Step state: 1 = Enter Email, 2 = Enter Code & New Password, 3 = Reset Complete
  const [step, setStep] = useState(1);

  // Form states
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);
  const [formError, setFormError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const { forgotPassword, resetPassword } = useAuth();
  const navigate = useNavigate();

  // Password validation rules
  const requirements = [
    { id: 'length', text: 'At least 8 characters', met: newPassword.length >= 8 },
    { id: 'uppercase', text: 'At least 1 uppercase letter', met: /[A-Z]/.test(newPassword) },
    { id: 'lowercase', text: 'At least 1 lowercase letter', met: /[a-z]/.test(newPassword) },
    { id: 'number', text: 'At least 1 number', met: /\d/.test(newPassword) },
    { id: 'special', text: 'At least 1 special character', met: /[!@#$%^&*()_+\-=[\]{};':"|,.<>/?]/.test(newPassword) },
  ];

  const allRequirementsMet = requirements.every((r) => r.met);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  // Step 1: Send Confirmation Code
  const handleRequestCode = async (e) => {
    e.preventDefault();
    setFormError('');
    setStatusMessage('');

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setFormError('Please enter your email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      await forgotPassword(trimmedEmail);
      setStep(2);
      setStatusMessage(`A 6-digit confirmation code has been sent to ${trimmedEmail}.`);
    } catch (err) {
      setFormError(err.message || 'Failed to send confirmation code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend Confirmation Code
  const handleResendCode = async () => {
    setFormError('');
    setStatusMessage('');
    setResendingCode(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setStatusMessage('A fresh 6-digit confirmation code has been sent to your email.');
    } catch (err) {
      setFormError(err.message || 'Failed to resend confirmation code.');
    } finally {
      setResendingCode(false);
    }
  };

  // Step 2: Verify Code and Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setFormError('');

    const trimmedCode = code.trim();
    if (!trimmedCode || trimmedCode.length !== 6) {
      setFormError('Please enter the 6-digit confirmation code sent to your email.');
      return;
    }

    if (!allRequirementsMet) {
      setFormError('Please ensure your new password satisfies all security requirements.');
      return;
    }

    if (!passwordsMatch) {
      setFormError('Passwords do not match. Please verify and try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword({
        email: email.trim().toLowerCase(),
        code: trimmedCode,
        newPassword,
      });
      setStep(3);
    } catch (err) {
      setFormError(err.message || 'Invalid or expired confirmation code. Please try again.');
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
            {step === 3 ? (
              <CheckCircle size={28} style={{ color: 'var(--success)' }} />
            ) : step === 2 ? (
              <KeyRound size={26} style={{ color: 'var(--primary-glow)' }} />
            ) : (
              <Shield size={26} style={{ color: 'var(--primary-glow)' }} />
            )}
          </div>
          <h1 style={styles.brandTitle}>
            {step === 3 ? 'Password Reset!' : step === 2 ? 'Enter Confirmation Code' : 'Forgot Password'}
          </h1>
          <p style={styles.brandSubtitle}>
            {step === 3
              ? 'Your password has been successfully updated. You can now sign in with your new credentials.'
              : step === 2
              ? `Check your Gmail inbox for ${email}. Enter the 6-digit confirmation code below to reset your password.`
              : 'Enter your account email and we will send a 6-digit confirmation code to your inbox.'}
          </p>
        </div>

        {/* Error Alert */}
        {formError && (
          <div style={styles.errorAlert}>
            <AlertCircle size={20} style={{ color: 'var(--error)', flexShrink: 0 }} />
            <span style={styles.errorText}>{formError}</span>
          </div>
        )}

        {/* Status Message */}
        {statusMessage && step === 2 && (
          <div style={styles.infoAlert}>
            <CheckCircle size={18} style={{ color: 'var(--secondary)', flexShrink: 0 }} />
            <span style={styles.infoText}>{statusMessage}</span>
          </div>
        )}

        {/* STEP 1: REQUEST CONFIRMATION CODE */}
        {step === 1 && (
          <form onSubmit={handleRequestCode} style={styles.form}>
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
                  <span>Sending Code...</span>
                </div>
              ) : (
                'Send Confirmation Code'
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

        {/* STEP 2: ENTER 6-DIGIT CODE AND NEW PASSWORD */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} style={styles.form}>
            {/* 6-Digit Confirmation Code Input */}
            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="input-label">6-Digit Confirmation Code</label>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendingCode}
                  style={styles.resendBtn}
                >
                  <RefreshCw size={12} className={resendingCode ? 'spin' : ''} />
                  <span>{resendingCode ? 'Resending...' : 'Resend Code'}</span>
                </button>
              </div>
              <div style={styles.inputContainer}>
                <KeyRound size={18} style={styles.inputIcon} />
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="input-field"
                  style={styles.codeField}
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* New Password */}
            <div className="input-group">
              <label className="input-label">New Password</label>
              <div style={styles.inputContainer}>
                <Lock size={18} style={styles.inputIcon} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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

            {/* Password Requirements Badges */}
            <div style={styles.requirementsContainer}>
              {requirements.map((req) => (
                <div
                  key={req.id}
                  style={{
                    ...styles.badge,
                    backgroundColor: req.met ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                    borderColor: req.met ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                    color: req.met ? 'var(--success)' : 'var(--text-muted)',
                  }}
                >
                  {req.met ? <Check size={12} /> : <X size={12} />}
                  <span>{req.text}</span>
                </div>
              ))}
            </div>

            {/* Confirm New Password */}
            <div className="input-group">
              <label className="input-label">Confirm New Password</label>
              <div style={styles.inputContainer}>
                <Lock size={18} style={styles.inputIcon} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field"
                  style={styles.field}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeBtn}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {confirmPassword && (
                <div style={{
                  fontSize: '0.8rem',
                  marginTop: '0.35rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  color: passwordsMatch ? 'var(--success)' : 'var(--error)',
                }}>
                  {passwordsMatch ? <Check size={14} /> : <X size={14} />}
                  <span>{passwordsMatch ? 'Passwords match' : 'Passwords do not match'}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || !allRequirementsMet || !passwordsMatch || code.length !== 6}
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

            <div style={styles.footerRow}>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setCode('');
                  setFormError('');
                  setStatusMessage('');
                }}
                style={styles.changeEmailBtn}
              >
                ← Change Email Address
              </button>
              <Link to="/login" style={styles.backLink}>
                <span>Cancel &amp; Sign In</span>
              </Link>
            </div>
          </form>
        )}

        {/* STEP 3: RESET COMPLETE */}
        {step === 3 && (
          <div style={styles.successContainer}>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="btn-primary"
              style={styles.submitBtn}
            >
              <span>Sign In with New Password</span>
            </button>
          </div>
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
    fontSize: '1.65rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  brandSubtitle: {
    fontSize: '0.86rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.45',
    margin: 0,
    maxWidth: '380px',
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
  infoAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    padding: '0.7rem 1rem',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    border: '1px solid rgba(6, 182, 212, 0.25)',
    borderRadius: 'var(--radius-sm)',
  },
  infoText: {
    color: 'var(--secondary)',
    fontSize: '0.82rem',
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
  codeField: {
    paddingLeft: '2.75rem',
    fontSize: '1.2rem',
    letterSpacing: '0.35em',
    fontWeight: '700',
    fontFamily: 'monospace',
    textAlign: 'center',
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
  requirementsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    padding: '0.75rem',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.78rem',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    border: '1px solid transparent',
    transition: 'var(--transition-fast)',
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
  resendBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--secondary)',
    fontSize: '0.78rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    padding: '0.1rem 0.3rem',
    fontWeight: '500',
  },
  footer: {
    textAlign: 'center',
    marginTop: '0.5rem',
  },
  footerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '0.5rem',
  },
  changeEmailBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: '0.82rem',
    cursor: 'pointer',
    padding: 0,
    fontWeight: '500',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    fontWeight: '500',
    transition: 'var(--transition-fast)',
    textDecoration: 'none',
  },
  successContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.25rem',
    padding: '1rem 0',
  },
};

export default ForgotPassword;
