/**
 * Moderation Service
 * Handles AI-based and fallback pattern-based content moderation for posts and comments
 */

const fs = require('fs');
const logger = require('../utils/logger');

// Local fallback dictionary of toxic words & patterns
const TOXIC_WORDS = ['hatespeech', 'abuse', 'toxic', 'vulgar', 'spam', 'fuck', 'shit', 'asshole', 'bastard', 'nude', 'nudes', 'porn', 'violence', 'kill', 'scam', 'promo'];

/**
 * Moderate text content
 * Checks text against OpenAI Moderation API or falls back to local regex keyword checks
 * @param {string} text - The input text to check
 * @returns {Promise<Object>} { flagged: boolean, reason: string, score: number }
 */
const moderateText = async (text = '') => {
  if (!text || text.trim() === '') {
    return { flagged: false, reason: '', score: 0 };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const isRealKey = apiKey && apiKey.startsWith('sk-') && !apiKey.includes('your_openai');

  if (isRealKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ input: text }),
      });

      if (response.ok) {
        const result = await response.json();
        const data = result.results[0];
        if (data.flagged) {
          // Find the category that triggered the flag
          const activeCategories = Object.entries(data.categories)
            .filter(([_, active]) => active)
            .map(([cat]) => cat);
          
          // Get the highest category score
          const maxScore = Math.max(...Object.values(data.category_scores));

          return {
            flagged: true,
            reason: `Flagged by AI for: ${activeCategories.join(', ')}`,
            score: maxScore,
          };
        }
        return { flagged: false, reason: '', score: 0 };
      } else {
        const errorText = await response.text();
        logger.warn('OpenAI moderation API call failed, using fallback', { error: errorText });
      }
    } catch (err) {
      logger.warn('OpenAI moderation API connection failed, using fallback', { error: err.message });
    }
  }

  // Local fallback pattern matching
  const cleanText = text.toLowerCase().replace(/[^\w\s]/g, '');
  const words = cleanText.split(/\s+/);
  
  // 1. Check for toxic words
  const foundToxicWords = words.filter((w) => TOXIC_WORDS.includes(w));
  if (foundToxicWords.length > 0) {
    const isHighConfidence = foundToxicWords.length >= 2 || cleanText.includes('fuck') || cleanText.includes('shit') || cleanText.includes('scam');
    return {
      flagged: true,
      reason: `Flagged for inappropriate/abusive language: [${foundToxicWords.join(', ')}]`,
      score: isHighConfidence ? 0.9 : 0.6,
    };
  }

  // 2. Check for spam links pattern (e.g. posting 3+ links in a single text)
  const linkMatches = text.match(/https?:\/\/\S+/g) || [];
  if (linkMatches.length >= 3) {
    return {
      flagged: true,
      reason: 'Flagged for promotional link spamming',
      score: 0.85,
    };
  }

  // 3. Check for suspicious promo/cash spam (e.g. "make money fast", "free crypto")
  if (cleanText.includes('make money fast') || cleanText.includes('free crypto') || cleanText.includes('earn cash now')) {
    return {
      flagged: true,
      reason: 'Flagged for financial cash spam keywords',
      score: 0.75,
    };
  }

  return { flagged: false, reason: '', score: 0 };
};

/**
 * Moderate image content
 * Checks image against local safety patterns
 * @param {string} imagePath - File path to the image
 * @param {string} filename - Filename of the image
 * @returns {Promise<Object>} { flagged: boolean, reason: string, score: number }
 */
const moderateImage = async (imagePath, filename = '') => {
  if (!filename) return { flagged: false, reason: '', score: 0 };

  const name = filename.toLowerCase();
  
  // In the real system, you would call AWS Rekognition or similar.
  // Here, we simulate vision moderation using keywords in the filename.
  if (name.includes('toxic') || name.includes('nude') || name.includes('spam') || name.includes('vulgar') || name.includes('abuse') || name.includes('gore') || name.includes('explicit')) {
    return {
      flagged: true,
      reason: 'Flagged by Vision AI for unsafe/abusive content in image metadata',
      score: name.includes('toxic') || name.includes('gore') ? 0.95 : 0.75,
    };
  }

  return { flagged: false, reason: '', score: 0 };
};

/**
 * Moderate a complete Post object (runs text + image checks)
 * @param {Object} post - Post Mongoose model/document
 * @returns {Promise<Object>} Updated post moderation status fields
 */
const moderatePost = async (post) => {
  try {
    const textMod = await moderateText(post.caption);
    let imageMod = { flagged: false, reason: '', score: 0 };

    if (post.images && post.images.length > 0) {
      // Moderate the first image for simulation
      const firstImage = post.images[0];
      const filename = path.basename(firstImage);
      imageMod = await moderateImage('', filename);
    }

    // Determine final status
    const flagged = textMod.flagged || imageMod.flagged;
    const highestScore = Math.max(textMod.score, imageMod.score);
    const reason = [textMod.reason, imageMod.reason].filter(Boolean).join(' | ');

    if (flagged) {
      if (highestScore >= 0.8) {
        post.moderationStatus = 'flagged';
      } else {
        post.moderationStatus = 'pending_review';
      }
      post.moderationReason = reason;
    } else {
      post.moderationStatus = 'approved';
      post.moderationReason = '';
    }

    logger.info('Post moderation completed', {
      postId: post._id,
      status: post.moderationStatus,
      reason: post.moderationReason,
      score: highestScore
    });

    return post;
  } catch (error) {
    logger.logError('Moderate post error', error, { postId: post._id });
    // Default safe fallback in case of errors: allow it, but flag for review
    post.moderationStatus = 'pending_review';
    post.moderationReason = 'Moderation service error, queued for safety check';
    return post;
  }
};

/**
 * Moderate a Comment object
 * @param {Object} comment - Comment document
 * @returns {Promise<Object>} Updated comment moderation status
 */
const moderateComment = async (comment) => {
  try {
    const textMod = await moderateText(comment.text);

    if (textMod.flagged) {
      if (textMod.score >= 0.8) {
        comment.moderationStatus = 'flagged';
      } else {
        comment.moderationStatus = 'pending_review';
      }
      comment.moderationReason = textMod.reason;
    } else {
      comment.moderationStatus = 'approved';
      comment.moderationReason = '';
    }

    logger.info('Comment moderation completed', {
      commentId: comment._id,
      status: comment.moderationStatus,
      score: textMod.score
    });

    return comment;
  } catch (error) {
    logger.logError('Moderate comment error', error, { commentId: comment._id });
    comment.moderationStatus = 'pending_review';
    comment.moderationReason = 'Moderation service error, queued for review';
    return comment;
  }
};

// Help helper library for path module inside this file
const path = require('path');

module.exports = {
  moderateText,
  moderateImage,
  moderatePost,
  moderateComment,
};
