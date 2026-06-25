const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/database');
const User = require('../models/User');
const Post = require('../models/Post');
const Trend = require('../models/Trend');
const trendService = require('../services/trendService');
const supertest = require('supertest');
const app = require('../app');
const { generateAccessToken } = require('../middlewares/auth');
const request = supertest(app);

const defaultLocation = {
  coordinates: {
    type: 'Point',
    coordinates: [0, 0]
  }
};

describe('AI Trend Detection Module', () => {
  let user;
  let token;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Post.deleteMany({});
    await Trend.deleteMany({});

    user = await User.create({
      email: 'trenduser@example.com',
      username: 'trenduser',
      password: 'password123',
      firstName: 'Trend',
      lastName: 'User'
    });

    token = generateAccessToken(user._id.toString());
  });

  describe('Trend Service Logic', () => {
    test('should extract hashtags, calculate trend scores, and flag emerging trends', async () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      // Create posts in previous window (2 days ago)
      // Tag "nature": 1 post
      await Post.create({
        author: user._id,
        caption: 'Beautiful forest hike #nature',
        hashtags: ['nature'],
        visibility: 'public',
        location: defaultLocation,
        createdAt: twoDaysAgo
      });

      // Tag "travel": 2 posts
      await Post.create({
        author: user._id,
        caption: 'First day in Paris #travel',
        hashtags: ['travel'],
        visibility: 'public',
        location: defaultLocation,
        createdAt: twoDaysAgo
      });
      await Post.create({
        author: user._id,
        caption: 'Exploring Europe #travel',
        hashtags: ['travel'],
        visibility: 'public',
        location: defaultLocation,
        createdAt: twoDaysAgo
      });

      // Create posts in current window (last 24h)
      // Tag "nature": 4 posts (tripled growth, > 3 posts -> emerging!)
      for (let i = 0; i < 4; i++) {
        await Post.create({
          author: user._id,
          caption: `Hike number ${i} #nature`,
          hashtags: ['nature'],
          visibility: 'public',
          location: defaultLocation,
          createdAt: now
        });
      }

      // Tag "travel": 1 post (decaying, not emerging)
      await Post.create({
        author: user._id,
        caption: 'Going home #travel',
        hashtags: ['travel'],
        visibility: 'public',
        location: defaultLocation,
        createdAt: now
      });

      // Calculate trends
      const success = await trendService.calculateTrends();
      expect(success).toBe(true);

      // Verify "nature" stats
      // currentCount = 4
      // previousCount = 1
      // growthRate = (4-1)/1 = 3.0
      // score = 4 * (1 + 3) = 16
      // isEmerging = true
      const natureTrend = await Trend.findOne({ hashtag: 'nature' });
      expect(natureTrend).toBeDefined();
      expect(natureTrend.currentCount).toBe(4);
      expect(natureTrend.previousCount).toBe(1);
      expect(natureTrend.score).toBeCloseTo(16.0);
      expect(natureTrend.isEmerging).toBe(true);

      // Verify "travel" stats
      // currentCount = 1
      // previousCount = 2
      // growthRate = (1-2)/2 = -0.5
      // score = 1 * (1 - 0.5) = 0.5
      // isEmerging = false
      const travelTrend = await Trend.findOne({ hashtag: 'travel' });
      expect(travelTrend).toBeDefined();
      expect(travelTrend.currentCount).toBe(1);
      expect(travelTrend.previousCount).toBe(2);
      expect(travelTrend.score).toBeCloseTo(0.5);
      expect(travelTrend.isEmerging).toBe(false);
    });
  });

  describe('Trends API Routes', () => {
    test('GET /api/trends - should retrieve top trends', async () => {
      // Create a dummy trend directly in database
      await Trend.create({
        hashtag: 'tech',
        currentCount: 5,
        previousCount: 0,
        score: 10,
        isEmerging: true
      });

      const response = await request
        .get('/api/trends')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].hashtag).toBe('tech');
    });

    test('GET /api/trends/:hashtag - should retrieve specific trend details and hydrated posts', async () => {
      const post = await Post.create({
        author: user._id,
        caption: 'Code is fun #programming',
        hashtags: ['programming'],
        visibility: 'public',
        location: defaultLocation
      });

      await Trend.create({
        hashtag: 'programming',
        currentCount: 1,
        previousCount: 0,
        score: 2,
        isEmerging: false,
        posts: [post._id]
      });

      const response = await request
        .get('/api/trends/programming')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.hashtag).toBe('programming');
      expect(response.body.data.posts.length).toBe(1);
      expect(response.body.data.posts[0].caption).toContain('Code is fun');
      expect(response.body.data.posts[0].author.username).toBe('trenduser');
    });

    test('GET /api/trends/:hashtag - should return 404 for non-existent hashtags', async () => {
      const response = await request
        .get('/api/trends/nonexistent')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});
