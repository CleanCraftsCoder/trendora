import React, { useState } from 'react';
import api from '../utils/api';
import { Sparkles, Loader2, RefreshCw, Hash, Check } from 'lucide-react';

const CaptionAssistant = ({ imageFile, onSelectCaption, onSelectHashtags }) => {
  const [loading, setLoading] = useState(false);
  const [captions, setCaptions] = useState([]);
  const [hashtags, setHashtags] = useState([]);
  const [activeCaptionIdx, setActiveCaptionIdx] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [error, setError] = useState('');

  const generateSuggestions = async () => {
    if (!imageFile) return;
    setLoading(true);
    setError('');
    setActiveCaptionIdx(null);
    setSelectedTags([]);

    const formData = new FormData();
    formData.append('image', imageFile);

    try {
      const res = await api.post('/posts/generate-caption', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { captions: sugCaptions, hashtags: sugTags } = res.data;
      setCaptions(sugCaptions || []);
      setHashtags(sugTags || []);
    } catch (err) {
      console.error('Failed to generate suggestions:', err);
      setError('Failed to analyze image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCaptionClick = (caption, index) => {
    setActiveCaptionIdx(index);
    onSelectCaption(caption);
  };

  const handleHashtagClick = (tag) => {
    let updatedTags;
    if (selectedTags.includes(tag)) {
      updatedTags = selectedTags.filter((t) => t !== tag);
    } else {
      updatedTags = [...selectedTags, tag];
    }
    setSelectedTags(updatedTags);
    onSelectHashtags(updatedTags);
  };

  // Styles map for suggested caption tones
  const tones = [
    { name: 'Aesthetic ✨', style: styles.toneAesthetic },
    { name: 'Energetic 🔥', style: styles.toneEnergetic },
    { name: 'Professional 💼', style: styles.toneProfessional },
  ];

  return (
    <div style={styles.container} className="glass-panel">
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <Sparkles size={18} style={{ color: 'var(--secondary)' }} />
          <h4 style={{ margin: 0, fontWeight: '700', fontSize: '0.95rem' }}>AI Caption Assistant</h4>
        </div>
        
        {captions.length > 0 && (
          <button 
            type="button" 
            onClick={generateSuggestions} 
            disabled={loading} 
            style={styles.refreshBtn}
          >
            {loading ? <Loader2 size={14} className="spinner" /> : <RefreshCw size={14} />}
            <span>Regenerate</span>
          </button>
        )}
      </div>

      {error && <p style={styles.errorText}>{error}</p>}

      {captions.length === 0 ? (
        <div style={styles.ctaBlock}>
          <p style={styles.ctaText}>
            Want a perfect caption? Let the Trendora Vision AI analyze your image and write suggested options and hashtags.
          </p>
          <button
            type="button"
            onClick={generateSuggestions}
            disabled={loading || !imageFile}
            className="btn-primary"
            style={{
              ...styles.generateBtn,
              ...(!imageFile ? styles.disabledBtn : {})
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="spinner" style={{ marginRight: '0.5rem' }} />
                Analyzing Image...
              </>
            ) : (
              <>
                <Sparkles size={16} style={{ marginRight: '0.5rem' }} />
                Generate AI Captions
              </>
            )}
          </button>
        </div>
      ) : (
        <div style={styles.resultsBlock}>
          {/* Caption suggestions */}
          <div style={styles.section}>
            <span style={styles.sectionLabel}>Suggested Captions (click to copy to post)</span>
            <div style={styles.captionsGrid}>
              {captions.map((cap, idx) => (
                <div
                  key={idx}
                  onClick={() => handleCaptionClick(cap, idx)}
                  style={{
                    ...styles.captionCard,
                    ...(activeCaptionIdx === idx ? styles.activeCaptionCard : {})
                  }}
                  className="glass-panel"
                >
                  <div style={styles.cardHeader}>
                    <span style={{ ...styles.toneBadge, ...tones[idx].style }}>
                      {tones[idx].name}
                    </span>
                    {activeCaptionIdx === idx && (
                      <span style={styles.copiedIndicator}>
                        <Check size={12} style={{ marginRight: '0.2rem' }} />
                        Applied
                      </span>
                    )}
                  </div>
                  <p style={styles.captionText}>{cap}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Hashtags suggestions */}
          {hashtags.length > 0 && (
            <div style={styles.section}>
              <span style={styles.sectionLabel}>Suggested Hashtags (click to append to post)</span>
              <div style={styles.tagsContainer}>
                {hashtags.map((tag, idx) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleHashtagClick(tag)}
                      style={{
                        ...styles.tagBtn,
                        ...(isSelected ? styles.activeTagBtn : {})
                      }}
                    >
                      <Hash size={12} />
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '1.25rem',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginTop: '0.5rem',
    marginBottom: '1rem',
    border: '1px dashed var(--border-glass)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border-glass)',
    paddingBottom: '0.5rem',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: 'var(--text-primary)',
  },
  refreshBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: '0.8rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.25rem 0.5rem',
    borderRadius: 'var(--radius-sm)',
    transition: 'var(--transition-fast)',
  },
  ctaBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '0.75rem',
    padding: '0.5rem 0',
  },
  ctaText: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
    maxWidth: '500px',
    margin: 0,
  },
  generateBtn: {
    padding: '0.5rem 1.25rem',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  resultsBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  sectionLabel: {
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    fontWeight: '700',
    letterSpacing: '0.05em',
  },
  captionsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  captionCard: {
    padding: '1rem',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  activeCaptionCard: {
    borderColor: 'var(--secondary)',
    background: 'rgba(255, 255, 255, 0.04)',
    boxShadow: '0 0 10px rgba(0, 242, 254, 0.1)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toneBadge: {
    fontSize: '0.7rem',
    padding: '0.15rem 0.5rem',
    borderRadius: 'var(--radius-full)',
    fontWeight: '700',
  },
  toneAesthetic: {
    background: 'rgba(180, 70, 255, 0.15)',
    color: 'rgb(200, 120, 255)',
  },
  toneEnergetic: {
    background: 'rgba(255, 120, 0, 0.15)',
    color: 'rgb(255, 160, 80)',
  },
  toneProfessional: {
    background: 'rgba(0, 200, 255, 0.15)',
    color: 'rgb(80, 220, 255)',
  },
  copiedIndicator: {
    fontSize: '0.7rem',
    color: 'var(--secondary)',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
  },
  captionText: {
    fontSize: '0.88rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
    margin: 0,
  },
  tagsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  tagBtn: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--border-glass)',
    color: 'var(--text-secondary)',
    borderRadius: 'var(--radius-full)',
    padding: '0.35rem 0.75rem',
    fontSize: '0.8rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  activeTagBtn: {
    background: 'rgba(0, 242, 254, 0.1)',
    color: 'var(--secondary)',
    borderColor: 'var(--secondary)',
  },
  errorText: {
    fontSize: '0.8rem',
    color: 'var(--error)',
    margin: 0,
  },
};

export default CaptionAssistant;
