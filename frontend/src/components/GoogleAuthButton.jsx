import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { X, Key, ExternalLink, ShieldCheck } from 'lucide-react';

const GoogleAuthButton = ({ isSignup = false, onError }) => {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [inputClientId, setInputClientId] = useState('');
  const [configError, setConfigError] = useState('');

  const googleBtnRef = useRef(null);

  // Active client ID: either from environment variable or saved in localStorage
  const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const [activeClientId, setActiveClientId] = useState(
    envClientId || localStorage.getItem('trendora_google_client_id') || ''
  );

  // Handle Google Credential Callback from Google Identity Services
  const handleCredentialResponse = async (response) => {
    if (!response || !response.credential) return;
    setLoading(true);
    try {
      await loginWithGoogle(response.credential);
      navigate('/');
    } catch (err) {
      if (onError) onError(err.message || 'Google authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load and initialize Google Identity Services (GIS)
  useEffect(() => {
    if (!activeClientId) return;

    const scriptId = 'google-gis-script';
    let script = document.getElementById(scriptId);

    const initGIS = () => {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.initialize({
          client_id: activeClientId,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (googleBtnRef.current) {
          googleBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'filled_black',
            size: 'large',
            text: isSignup ? 'signup_with' : 'signin_with',
            shape: 'rectangular',
            width: 380,
            logo_alignment: 'left',
          });
        }
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGIS;
      document.body.appendChild(script);
    } else if (window.google?.accounts?.id) {
      initGIS();
    }
  }, [activeClientId, isSignup]);

  const handleCustomButtonClick = () => {
    if (activeClientId && window.google?.accounts?.id) {
      // If GIS button is rendered, trigger click on it to open official Google account chooser
      const renderedBtn = googleBtnRef.current?.querySelector('div[role="button"]');
      if (renderedBtn) {
        renderedBtn.click();
        return;
      }
      window.google.accounts.id.prompt();
    } else {
      // Client ID is missing; show configuration guidance modal
      setShowConfigModal(true);
    }
  };

  const handleSaveClientId = (e) => {
    e.preventDefault();
    const trimmed = inputClientId.trim();
    if (!trimmed) {
      setConfigError('Please enter a valid Google Client ID.');
      return;
    }
    if (!trimmed.includes('.apps.googleusercontent.com')) {
      setConfigError('Invalid Client ID format. It should end with .apps.googleusercontent.com');
      return;
    }

    localStorage.setItem('trendora_google_client_id', trimmed);
    setActiveClientId(trimmed);
    setShowConfigModal(false);
    setConfigError('');
  };

  return (
    <div style={styles.wrapper}>
      {/* If activeClientId is configured, GIS renders the official Google button */}
      {activeClientId ? (
        <div style={styles.renderedContainer}>
          <div ref={googleBtnRef} style={{ width: '100%' }} />
        </div>
      ) : (
        /* Styled Glassmorphic Google Button (prompts config modal if no Client ID yet) */
        <button
          type="button"
          onClick={handleCustomButtonClick}
          disabled={loading}
          style={styles.googleBtn}
          className="glass-panel"
          id="google-signin-custom-btn"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" style={styles.googleIcon}>
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
          </svg>
          <span style={styles.btnText}>
            {loading ? 'Connecting to Google...' : `${isSignup ? 'Sign up' : 'Sign in'} with Google`}
          </span>
        </button>
      )}

      {/* Google OAuth Configuration Modal */}
      {showConfigModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard} className="glass-panel">
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="22" height="22" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <h3 style={styles.modalTitle}>Google OAuth Setup</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                style={styles.closeBtn}
              >
                <X size={18} />
              </button>
            </div>

            <div style={styles.securityBanner}>
              <ShieldCheck size={18} style={{ color: 'var(--success)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Trendora enforces authentic Google OAuth account verification. Anonymous or simulated emails (such as <code>acb@gmail.com</code>) are strictly prohibited.
              </span>
            </div>

            <p style={styles.modalSubtext}>
              To open Google&apos;s authentic <strong>&ldquo;Choose an account&rdquo;</strong> popup (<code>accounts.google.com</code>), configure your Google Cloud OAuth Client ID:
            </p>

            <ol style={styles.stepsList}>
              <li>Create a Web Client in <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" style={styles.link}>Google Cloud Console <ExternalLink size={12} style={{ display: 'inline' }} /></a>.</li>
              <li>Add Authorized Origin: <code style={styles.codeSnippet}>http://localhost:3000</code> and <code style={styles.codeSnippet}>http://127.0.0.1:3000</code>.</li>
              <li>Enter your Client ID below or set <code style={styles.codeSnippet}>VITE_GOOGLE_CLIENT_ID</code> in <code style={styles.codeSnippet}>frontend/.env</code>.</li>
            </ol>

            {configError && (
              <div style={styles.errorBanner}>{configError}</div>
            )}

            <form onSubmit={handleSaveClientId} style={styles.form}>
              <div className="input-group" style={{ marginBottom: '1rem' }}>
                <label className="input-label" style={{ fontSize: '0.78rem' }}>Google Client ID</label>
                <div style={styles.inputWrapper}>
                  <Key size={16} style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="xxxxxxxxxxxx.apps.googleusercontent.com"
                    value={inputClientId}
                    onChange={(e) => {
                      setInputClientId(e.target.value);
                      setConfigError('');
                    }}
                    className="input-field"
                    style={styles.clientIdField}
                    required
                  />
                </div>
              </div>

              <div style={styles.btnRow}>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="btn-secondary"
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={styles.saveBtn}
                >
                  Save &amp; Open Google Login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  wrapper: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  renderedContainer: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
  },
  googleBtn: {
    width: '100%',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    border: '1px solid var(--border-glass)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    transition: 'var(--transition-fast)',
    color: 'var(--text-primary)',
    fontWeight: '600',
    fontSize: '0.95rem',
  },
  googleIcon: {
    flexShrink: 0,
  },
  btnText: {
    fontFamily: 'var(--font-sans)',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  modalCard: {
    width: '100%',
    maxWidth: '460px',
    padding: '2rem',
    borderRadius: 'var(--radius-lg)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-glass)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    margin: 0,
    fontSize: '1.15rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '0.25rem',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    backgroundColor: 'rgba(52, 168, 83, 0.1)',
    border: '1px solid rgba(52, 168, 83, 0.25)',
    padding: '0.6rem 0.85rem',
    borderRadius: 'var(--radius-sm)',
  },
  modalSubtext: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.45',
    margin: 0,
  },
  stepsList: {
    margin: 0,
    paddingLeft: '1.25rem',
    fontSize: '0.82rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
  },
  link: {
    color: 'var(--secondary)',
    textDecoration: 'underline',
  },
  codeSnippet: {
    background: 'rgba(255, 255, 255, 0.08)',
    padding: '0.15rem 0.35rem',
    borderRadius: '4px',
    color: 'var(--secondary)',
    fontSize: '0.78rem',
  },
  errorBanner: {
    color: 'var(--error)',
    fontSize: '0.82rem',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: '0.5rem 0.75rem',
    borderRadius: 'var(--radius-sm)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    marginTop: '0.25rem',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-glass)',
    borderRadius: 'var(--radius-sm)',
    padding: '0 0.75rem',
  },
  clientIdField: {
    border: 'none',
    backgroundColor: 'transparent',
    padding: '0.65rem 0.25rem',
    fontSize: '0.85rem',
    width: '100%',
    color: 'var(--text-primary)',
    outline: 'none',
  },
  btnRow: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'flex-end',
    marginTop: '0.5rem',
  },
  cancelBtn: {
    padding: '0.55rem 1rem',
    fontSize: '0.85rem',
  },
  saveBtn: {
    padding: '0.55rem 1.25rem',
    fontSize: '0.85rem',
  },
};

export default GoogleAuthButton;
