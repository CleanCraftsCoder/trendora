import React, { useState } from 'react';
import api from '../utils/api';
import { Sparkles, Loader2, RefreshCw, Hash, Check, Bot } from 'lucide-react';

const CaptionAssistant = ({ imageFile, onSelectCaption, onSelectHashtags }) => {
  const [loading, setLoading] = useState(false);
  const [captions, setCaptions] = useState([]);
  const [hashtags, setHashtags] = useState([]);
  const [activeCaptionIdx, setActiveCaptionIdx] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [error, setError] = useState('');
  const [vibe, setVibe] = useState('All');
  const [keywordInput, setKeywordInput] = useState('');

  const VIBES = ['All', 'Aesthetic ✨', 'Chill 🌿', 'Hype 🔥', 'Tech 💻', 'Fitness ⚡', 'Minimal ☁️'];

  const QUICK_PROMPTS = [
    '#jantarmantar #protest',
    '#travel #wanderlust',
    '#tech #ai #coding',
    '#cricket #matchday',
    '#fitness #workout',
    '#foodie #streetfood'
  ];

  const generateSuggestions = async (promptOverride) => {
    const activePrompt = typeof promptOverride === 'string' ? promptOverride : keywordInput;
    if (!imageFile && !activePrompt.trim()) {
      setError('Please enter hashtags or a prompt (e.g. #jantarmantar #protest) or select an image.');
      return;
    }
    setLoading(true);
    setError('');
    setActiveCaptionIdx(null);
    setSelectedTags([]);

    const formData = new FormData();
    if (imageFile) {
      formData.append('image', imageFile);
    }
    if (vibe && vibe !== 'All') {
      formData.append('vibe', vibe);
    }
    if (activePrompt.trim()) {
      formData.append('prompt', activePrompt.trim());
      formData.append('keywords', activePrompt.trim());
    }
    formData.append('nonce', Date.now().toString());

    try {
      const res = await api.post('/posts/generate-caption', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { captions: sugCaptions, hashtags: sugTags } = res.data;
      setCaptions(sugCaptions || []);
      setHashtags(sugTags || []);
    } catch (err) {
      console.error('Failed to generate suggestions:', err);
      setError(err.response?.data?.error?.message || 'Failed to generate captions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPromptClick = (promptStr) => {
    setKeywordInput(promptStr);
    generateSuggestions(promptStr);
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
          <span style={styles.aiBadge}>
            <Bot size={12} style={{ marginRight: '0.2rem' }} />
            Mistral / NLP
          </span>
        </div>
        
        {captions.length > 0 && (
          <button 
            type="button" 
            onClick={() => generateSuggestions()} 
            disabled={loading} 
            style={styles.refreshBtn}
            title="Generate new, different captions"
          >
            {loading ? <Loader2 size={14} className="spinner" /> : <RefreshCw size={14} />}
            <span>Regenerate Fresh</span>
          </button>
        )}
      </div>

      {error && <p style={styles.errorText}>{error}</p>}

      {/* Vibe & Hint Controls */}
      <div style={styles.controlsSection}>
        <div style={styles.vibeRow}>
          <span style={styles.vibeLabel}>Vibe:</span>
          <div style={styles.vibePills}>
            {VIBES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVibe(v)}
                style={{
                  ...styles.vibePill,
                  ...(vibe === v ? styles.activeVibePill : {}),
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.hintRow}>
          <input
            type="text"
            placeholder="Enter hashtag prompt: e.g. #jantarmantar #protest or #travel #mountains..."
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            className="input-field"
            style={styles.hintInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                generateSuggestions();
              }
            }}
          />
        </div>

        {/* Quick prompt chips */}
        <div style={styles.quickPromptsRow}>
          <span style={styles.quickPromptLabel}>Quick prompts:</span>
          <div style={styles.quickPromptChips}>
            {QUICK_PROMPTS.map((qp) => (
              <button
                key={qp}
                type="button"
                onClick={() => handleQuickPromptClick(qp)}
                style={{
                  ...styles.quickPromptChip,
                  ...(keywordInput === qp ? styles.activeQuickPromptChip : {})
                }}
              >
                {qp}
              </button>
            ))}
          </div>
        </div>
      </div>

      {captions.length === 0 ? (
        <div style={styles.ctaBlock}>
          <p style={styles.ctaText}>
            {imageFile 
              ? 'Trendora AI will analyze your photo and hashtags to write dynamic, custom captions.'
              : 'Enter your hashtags or prompt above (e.g. #jantarmantar #protest) to generate dynamic captions.'}
          </p>
          <button
            type="button"
            onClick={() => generateSuggestions()}
            disabled={loading || (!imageFile && !keywordInput.trim())}
            className="btn-primary"
            style={{
              ...styles.generateBtn,
              ...(!imageFile && !keywordInput.trim() ? styles.disabledBtn : {})
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="spinner" style={{ marginRight: '0.5rem' }} />
                Generating Dynamic Captions...
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
                    <span style={{ ...styles.toneBadge, ...(tones[idx] ? tones[idx].style : styles.toneAesthetic) }}>
                      {tones[idx] ? tones[idx].name : `Tone ${idx + 1}`}
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
    flexWrap: 'wrap',
  },
  aiBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '0.68rem',
    padding: '0.15rem 0.45rem',
    borderRadius: 'var(--radius-full)',
    background: 'rgba(0, 242, 254, 0.1)',
    color: 'var(--secondary)',
    border: '1px solid rgba(0, 242, 254, 0.25)',
    fontWeight: '600',
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
  controlsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    background: 'rgba(255, 255, 255, 0.02)',
    padding: '0.75rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-glass)',
  },
  vibeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  vibeLabel: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  vibePills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.35rem',
  },
  vibePill: {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid var(--border-glass)',
    color: 'var(--text-secondary)',
    borderRadius: 'var(--radius-full)',
    padding: '0.2rem 0.6rem',
    fontSize: '0.75rem',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  activeVibePill: {
    background: 'hsla(265, 85%, 60%, 0.2)',
    borderColor: 'var(--primary)',
    color: '#fff',
    fontWeight: '600',
  },
  hintRow: {
    width: '100%',
  },
  hintInput: {
    width: '100%',
    padding: '0.55rem 0.75rem',
    fontSize: '0.85rem',
    borderRadius: 'var(--radius-sm)',
  },
  quickPromptsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  quickPromptLabel: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    fontWeight: '600',
  },
  quickPromptChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.35rem',
  },
  quickPromptChip: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--border-glass)',
    color: 'var(--text-secondary)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.15rem 0.5rem',
    fontSize: '0.72rem',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  activeQuickPromptChip: {
    borderColor: 'var(--secondary)',
    color: 'var(--secondary)',
    background: 'rgba(0, 242, 254, 0.08)',
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
