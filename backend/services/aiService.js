/**
 * AI Recommendation Service
 * Handles text embedding generation, cosine similarity, user preferences, and recommendations
 */

const User = require('../models/User');
const Post = require('../models/Post');
const Engagement = require('../models/Engagement');
const Follow = require('../models/Follow');
const logger = require('../utils/logger');

// Fixed embedding dimension
const EMBEDDING_DIM = 128;

/**
 * Generate a deterministic hash from a string
 * @param {string} str - String to hash
 * @returns {number} 32-bit integer hash
 */
const stringHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

/**
 * Generate a pseudo-random number generator seeded with a hash
 * @param {number} seed - Seed value
 * @returns {function} RNG function returning [0, 1)
 */
const sfc32 = (seed) => {
  let a = seed | 0;
  let b = (seed ^ 0xdeadbeef) | 0;
  let c = (seed ^ 0xbadcafe) | 0;
  let d = (seed ^ 0xc0de) | 0;

  return function() {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
};

/**
 * Generate a deterministic 128-dimensional unit vector for a word
 * @param {string} word - The term
 * @returns {Array<number>} 128-dimensional unit vector
 */
const getWordVector = (word) => {
  const seed = stringHash(word.toLowerCase());
  const rand = sfc32(seed);
  const vec = [];
  let sumSq = 0;

  for (let i = 0; i < EMBEDDING_DIM; i++) {
    // Standard normal approximation using Box-Muller transform
    const u1 = rand() || 0.0001; // Avoid 0
    const u2 = rand();
    const val = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    vec.push(val);
    sumSq += val * val;
  }

  // Normalize to unit vector
  const mag = Math.sqrt(sumSq) || 1;
  return vec.map((v) => v / mag);
};

/**
 * Generate a text embedding vector (size 128)
 * Falls back to deterministic token hashing if OpenAI fails or is not configured
 * @param {string} text - The post caption or text
 * @param {Array<string>} [hashtags=[]] - The post hashtags
 * @returns {Promise<Array<number>>} 128-dimensional vector
 */
const generateTextEmbedding = async (text = '', hashtags = []) => {
  const apiKey = process.env.OPENAI_API_KEY;
  const isRealKey = apiKey && apiKey.startsWith('sk-') && !apiKey.includes('your_openai');

  if (isRealKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: `${text} ${hashtags.join(' ')}`,
          dimensions: EMBEDDING_DIM,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data && result.data[0] && result.data[0].embedding) {
          return result.data[0].embedding;
        }
      } else {
        const errorText = await response.text();
        logger.warn('OpenAI embedding API failed, falling back to local model', { error: errorText });
      }
    } catch (err) {
      logger.warn('OpenAI embedding call error, falling back to local model', { error: err.message });
    }
  }

  // Local Token-Hashing Fallback Implementation
  const cleanText = text
    .toLowerCase()
    .replace(/[^\w\s#]/g, '') // remove punctuation
    .trim();

  const words = cleanText.split(/\s+/).filter((w) => w.length > 2);
  const tags = hashtags.map((t) => `#${t.toLowerCase()}`);
  const tokens = [...words, ...tags];

  if (tokens.length === 0) {
    // Return a default deterministic zero-like/neutral vector
    return new Array(EMBEDDING_DIM).fill(0).map((_, i) => (i === 0 ? 1 : 0));
  }

  const finalVector = new Array(EMBEDDING_DIM).fill(0);
  let totalWeight = 0;

  for (const token of tokens) {
    const isHashtag = token.startsWith('#');
    const weight = isHashtag ? 3.0 : 1.0; // Give hashtags more weight in content mapping
    const vec = getWordVector(token);

    for (let i = 0; i < EMBEDDING_DIM; i++) {
      finalVector[i] += vec[i] * weight;
    }
    totalWeight += weight;
  }

  // Normalize final vector
  let sumSq = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    sumSq += finalVector[i] * finalVector[i];
  }
  const magnitude = Math.sqrt(sumSq) || 1;
  return finalVector.map((v) => v / magnitude);
};

/**
 * Calculate Cosine Similarity between two vectors
 * @param {Array<number>} vecA - First vector
 * @param {Array<number>} vecB - Second vector
 * @returns {number} Cosine similarity (-1 to 1)
 */
const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  if (vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Recalculate and update user preferences vector and affinity tables
 * @param {string} userId - Target user ID
 */
const updateUserPreferences = async (userId) => {
  try {
    // 1. Fetch user engagements
    const engagements = await Engagement.find({ userId })
      .populate({
        path: 'postId',
        match: { isDeleted: false },
        select: 'embeddings hashtags author'
      })
      .limit(100); // Analyze up to 100 recent interactions

    const validEngagements = engagements.filter((e) => e.postId && e.postId.embeddings && e.postId.embeddings.length > 0);

    if (validEngagements.length === 0) {
      logger.info('No engagement history found to update user preferences', { userId });
      return;
    }

    // 2. Compute weighted preference vector
    const aggregateVector = new Array(EMBEDDING_DIM).fill(0);
    const hashtagInteractions = {};
    const authorInteractions = {};
    let totalScore = 0;

    for (const eng of validEngagements) {
      const post = eng.postId;
      const score = eng.score;

      // Add to preference vector
      for (let i = 0; i < EMBEDDING_DIM; i++) {
        aggregateVector[i] += post.embeddings[i] * score;
      }
      totalScore += score;

      // Track hashtags
      if (post.hashtags && Array.isArray(post.hashtags)) {
        for (const tag of post.hashtags) {
          const lowerTag = tag.toLowerCase();
          hashtagInteractions[lowerTag] = (hashtagInteractions[lowerTag] || 0) + score;
        }
      }

      // Track author affinity
      if (post.author) {
        const authorIdStr = post.author.toString();
        authorInteractions[authorIdStr] = (authorInteractions[authorIdStr] || 0) + score;
      }
    }

    // Normalize aggregate vector
    let preferenceVector = [];
    if (totalScore > 0) {
      let sumSq = 0;
      for (let i = 0; i < EMBEDDING_DIM; i++) {
        sumSq += aggregateVector[i] * aggregateVector[i];
      }
      const magnitude = Math.sqrt(sumSq) || 1;
      preferenceVector = aggregateVector.map((v) => v / magnitude);
    }

    // Sort and extract top preferred hashtags
    const preferredHashtags = Object.entries(hashtagInteractions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);

    // Sort and extract top preferred authors
    const preferredAuthors = Object.entries(authorInteractions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([authorId]) => authorId);

    // 3. Save to User document
    await User.findByIdAndUpdate(userId, {
      preferenceVector,
      preferredHashtags,
      preferredAuthors,
    });

    logger.info('Updated user recommendation preference vectors successfully', {
      userId,
      topHashtags: preferredHashtags,
      topAuthorsCount: preferredAuthors.length,
    });
  } catch (error) {
    logger.logError('Failed to update user preferences', error, { userId });
    throw error;
  }
};

/**
 * Daily batch recommendations updater
 * Loops through active users and regenerates recommendation preferences
 */
const processDailyRecommendations = async () => {
  logger.info('Running recommendation engine update batch job');
  try {
    // Find users who logged in during last 7 days to optimize processing
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeUsers = await User.find({
      $or: [
        { lastLogin: { $gte: sevenDaysAgo } },
        { updatedAt: { $gte: sevenDaysAgo } },
      ],
    }).select('_id');

    logger.info(`Found ${activeUsers.length} active users to process preferences`);

    for (const user of activeUsers) {
      await updateUserPreferences(user._id);
    }

    logger.info('Recommendation engine update batch job completed successfully');
    return activeUsers.length;
  } catch (error) {
    logger.logError('Recommendation engine batch update failed', error);
    throw error;
  }
};

/**
 * Generate AI-ranked recommended posts for a user
 * @param {Object} params - Query Parameters
 * @param {string} params.userId - Requesting user ID
 * @param {string} [params.cursor] - Offset pagination cursor (base64 of {offset, timestamp})
 * @param {number} params.limit - Limit per page
 * @returns {Promise<Object>} Recommended posts with next cursor
 */
const getRecommendedPosts = async ({ userId, cursor = null, limit = 20 }) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Decode cursor
    let offset = 0;
    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
        offset = parseInt(decoded.offset || 0, 10);
      } catch (err) {
        logger.warn('Failed to decode recommendation cursor, resetting offset', { cursor });
      }
    }

    // 1. Fetch user interaction history to exclude viewed posts
    const interactions = await Engagement.find({ userId }).select('postId');
    const interactedPostIds = interactions.map((i) => i.postId.toString());

    // 2. Fetch candidate posts created in the last 30 days (excluding own posts and already viewed posts)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Note: To remain performant, we fetch up to 300 candidates first, then score and paginate them.
    const candidates = await Post.find({
      isDeleted: false,
      visibility: 'public',
      moderationStatus: { $ne: 'flagged' },
      author: { $ne: userId },
      _id: { $nin: interactedPostIds },
      createdAt: { $gte: thirtyDaysAgo },
    })
      .select('author caption hashtags likesCount commentsCount sharesCount createdAt embeddings')
      .populate('author', 'username profilePicture firstName lastName')
      .limit(300);

    if (candidates.length === 0) {
      return { data: [], pagination: { nextCursor: null, hasMore: false, limit } };
    }

    // Get following relationships to award follow affinity bonus
    const following = await Follow.getFollowingIds(userId);
    const followingIds = following.map((f) => f.followingId.toString());

    const hasPrefs = user.preferenceVector && user.preferenceVector.length > 0;

    // 3. Score each candidate
    const scoredCandidates = candidates.map((post) => {
      let contentSim = 0;
      let hashtagScore = 0;
      let authorScore = 0;

      // A. Content similarity (Cosine similarity)
      if (hasPrefs && post.embeddings && post.embeddings.length > 0) {
        contentSim = cosineSimilarity(user.preferenceVector, post.embeddings);
      }

      // B. Hashtag overlap
      if (post.hashtags && post.hashtags.length > 0 && user.preferredHashtags && user.preferredHashtags.length > 0) {
        const matches = post.hashtags.filter((tag) => user.preferredHashtags.includes(tag.toLowerCase()));
        hashtagScore = matches.length / Math.max(post.hashtags.length, 1);
      }

      // C. Author affinity (user preference or follow status)
      const authorIdStr = post.author._id.toString();
      if (user.preferredAuthors && user.preferredAuthors.includes(authorIdStr)) {
        authorScore = 1.0;
      } else if (followingIds.includes(authorIdStr)) {
        authorScore = 0.8;
      }

      // D. Engagement popularity score with time decay
      // Popularity score = (likes * 2 + comments * 3 + shares * 5)
      // Decayed = Popularity / (hours_since_creation + 2)^1.5
      const hours = (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60);
      const rawEngagement = (post.likesCount || 0) * 2 + (post.commentsCount || 0) * 3 + (post.sharesCount || 0) * 5;
      const trendingFactor = rawEngagement / Math.pow(hours + 2, 1.5);

      // Final scoring formula weights:
      // - 40% Content similarity
      // - 20% Hashtag overlap
      // - 20% Author affinity
      // - 20% Popularity / Trending Factor
      // Normalize trendingFactor roughly by bounding it
      const normalizedTrending = Math.min(trendingFactor / 10, 1.0);
      
      const finalScore = (0.4 * contentSim) + (0.2 * hashtagScore) + (0.2 * authorScore) + (0.2 * normalizedTrending);

      return {
        post,
        score: finalScore,
      };
    });

    // 4. Sort and Paginate candidates
    scoredCandidates.sort((a, b) => b.score - a.score);

    const startIdx = offset;
    const endIdx = offset + limit;
    const paginatedItems = scoredCandidates.slice(startIdx, endIdx);
    const hasMore = scoredCandidates.length > endIdx;

    const data = paginatedItems.map((item) => {
      const postObj = item.post.toObject();
      postObj.recommendationScore = item.score;
      postObj.isLiked = false; // Filled in feedService
      return postObj;
    });

    let nextCursor = null;
    if (hasMore) {
      nextCursor = Buffer.from(
        JSON.stringify({
          offset: endIdx,
          timestamp: Date.now(),
        })
      ).toString('base64');
    }

    return {
      data,
      pagination: {
        nextCursor,
        hasMore,
        limit,
      },
    };
  } catch (error) {
    logger.logError('Recommendation engine getRecommendedPosts failed', error, { userId });
    throw error;
  }
};

module.exports = {
  generateTextEmbedding,
  cosineSimilarity,
  updateUserPreferences,
  processDailyRecommendations,
  getRecommendedPosts,
  EMBEDDING_DIM,
};
