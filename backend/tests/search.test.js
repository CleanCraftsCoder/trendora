const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/database');
const User = require('../models/User');
const Post = require('../models/Post');
const Follow = require('../models/Follow');
const Like = require('../models/Like');
const searchService = require('../services/searchService');
const aiService = require('../services/aiService');
const supertest = require('supertest');
const app = require('../app');
const { generateAccessToken } = require('../middlewares/auth');
const request = supertest(app);

// Mock aiService generateTextEmbedding to return deterministic vectors
// based on keywords to test semantic ranking and similarity logic.
jest.spyOn(aiService, 'generateTextEmbedding').mockImplementation(async (text) => {
  const lowercase = text.toLowerCase();
  const vec = new Array(128).fill(0);
  if (lowercase.includes('coffee') || lowercase.includes('espresso') || lowercase.includes('caffeine')) {
    vec[0] = 1.0;
  } else if (lowercase.includes('hike') || lowercase.includes('mountain') || lowercase.includes('forest')) {
    vec[1] = 1.0;
  } else if (lowercase.includes('code') || lowercase.includes('developer') || lowercase.includes('programming')) {
    vec[2] = 1.0;
  } else {
    // default unit vector
    vec[3] = 1.0;
  }
  return vec;
});

// Helper for location coordinates to satisfy 2dsphere index validation
const defaultLocation = {
  coordinates: {
    type: 'Point',
    coordinates: [0, 0]
  }
};

describe('AI Smart Search Module', () => {
  let user1, user2;
  let token1;

  beforeAll(async () => {
    // Connect to database
    await connectDB();
  });

  afterAll(async () => {
    // Disconnect from database
    await disconnectDB();
  });

  beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});
    await Post.deleteMany({});
    await Follow.deleteMany({});
    await Like.deleteMany({});

    // Create test users
    user1 = await User.create({
      email: 'user1@example.com',
      username: 'userone',
      password: 'password123',
      firstName: 'User',
      lastName: 'One',
      bio: 'Enjoys coding and building apps',
      preferredHashtags: ['code', 'tech']
    });

    user2 = await User.create({
      email: 'user2@example.com',
      username: 'usertwo',
      password: 'password123',
      firstName: 'User',
      lastName: 'Two',
      bio: 'Enjoys hiking in the mountains and drinking hot espresso coffee',
      preferredHashtags: ['travel', 'coffee']
    });

    // Generate JWT access token for user1
    token1 = generateAccessToken(user1._id.toString());
  });

  describe('Search Service Logic', () => {
    test('should rank posts semantically based on query embedding', async () => {
      // Create posts
      const post1 = await Post.create({
        author: user1._id,
        caption: 'Had a delicious espresso shot this morning #caffeine',
        embeddings: [1.0, 0, 0, 0, ...new Array(124).fill(0)],
        visibility: 'public',
        location: defaultLocation
      });

      const post2 = await Post.create({
        author: user2._id,
        caption: 'Climbed the beautiful green forest mountains #nature',
        embeddings: [0, 1.0, 0, 0, ...new Array(124).fill(0)],
        visibility: 'public',
        location: defaultLocation
      });

      const results = await searchService.search({
        queryText: 'coffee',
        type: 'posts',
        currentUserId: user1._id
      });

      expect(results.length).toBe(2);
      expect(results[0]._id.toString()).toBe(post1._id.toString());
    });

    test('should apply exact keyword match boost', async () => {
      const post1 = await Post.create({
        author: user1._id,
        caption: 'Had a delicious espresso shot this morning #caffeine',
        embeddings: [1.0, 0, 0, 0, ...new Array(124).fill(0)],
        visibility: 'public',
        location: defaultLocation
      });

      const post2 = await Post.create({
        author: user2._id,
        caption: 'Drinking some hot coffee at a cafe',
        embeddings: [1.0, 0, 0, 0, ...new Array(124).fill(0)],
        visibility: 'public',
        location: defaultLocation
      });

      const results = await searchService.search({
        queryText: 'coffee',
        type: 'posts',
        currentUserId: user1._id
      });

      expect(results.length).toBe(2);
      expect(results[0]._id.toString()).toBe(post2._id.toString());
    });

    test('should exclude flagged posts', async () => {
      await Post.create({
        author: user1._id,
        caption: 'This is a flagged post with coffee',
        embeddings: [1.0, 0, ...new Array(126).fill(0)],
        moderationStatus: 'flagged',
        visibility: 'public',
        location: defaultLocation
      });

      const results = await searchService.search({
        queryText: 'coffee',
        type: 'posts',
        currentUserId: user1._id
      });

      expect(results.length).toBe(0);
    });

    test('should save query to search history and limit to 10 items without duplicates', async () => {
      const queries = ['coffee', 'hike', 'code', 'coffee', 'rust', 'go', 'python', 'javascript', 'html', 'css', 'react', 'node'];
      
      for (const q of queries) {
        await searchService.search({
          queryText: q,
          type: 'posts',
          currentUserId: user1._id
        });
      }

      const history = await searchService.getSearchHistory(user1._id);
      
      expect(history.length).toBe(10);
      expect(history[0].query).toBe('node');
      
      const queryList = history.map(h => h.query);
      expect(queryList).toContain('coffee');
      expect(queryList.indexOf('coffee')).toBeLessThan(queryList.indexOf('code'));
    });
  });

  describe('Search Suggestions API', () => {
    test('should return suggestions matching prefix', async () => {
      await User.create({
        email: 'coder@example.com',
        username: 'coder_john',
        password: 'password123',
        firstName: 'John',
        lastName: 'Coder'
      });

      await Post.create({
        author: user1._id,
        caption: 'Doing some #coding and #computational tasks',
        hashtags: ['coding', 'computational'],
        visibility: 'public',
        location: defaultLocation
      });

      const suggestions = await searchService.getSuggestions('cod');
      expect(suggestions).toContain('@coder_john');
      expect(suggestions).toContain('#coding');
    });
  });

  describe('Search API Router / Endpoints', () => {
    test('GET /api/search - should perform post search successfully', async () => {
      await Post.create({
        author: user2._id,
        caption: 'Climbed the beautiful green forest mountains #nature',
        embeddings: [0, 1.0, 0, 0, ...new Array(124).fill(0)],
        visibility: 'public',
        location: defaultLocation
      });

      const response = await request
        .get('/api/search')
        .query({ q: 'hike', type: 'posts' })
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].caption).toContain('mountains');
    });

    test('GET /api/search/suggestions - should retrieve suggestions successfully', async () => {
      const response = await request
        .get('/api/search/suggestions')
        .query({ q: 'user' })
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/search/history - should retrieve user search history', async () => {
      await request
        .get('/api/search')
        .query({ q: 'code', type: 'posts' })
        .set('Authorization', `Bearer ${token1}`);

      const response = await request
        .get('/api/search/history')
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].query).toBe('code');
    });

    test('DELETE /api/search/history - should clear single item or all', async () => {
      await request
        .get('/api/search')
        .query({ q: 'first', type: 'posts' })
        .set('Authorization', `Bearer ${token1}`);

      await request
        .get('/api/search')
        .query({ q: 'second', type: 'posts' })
        .set('Authorization', `Bearer ${token1}`);

      const historyRes = await request
        .get('/api/search/history')
        .set('Authorization', `Bearer ${token1}`);

      const items = historyRes.body.data;
      expect(items.length).toBe(2);

      const targetItemId = items[0]._id;

      const deleteSingleRes = await request
        .delete(`/api/search/history`)
        .query({ itemId: targetItemId })
        .set('Authorization', `Bearer ${token1}`);

      expect(deleteSingleRes.status).toBe(200);
      expect(deleteSingleRes.body.success).toBe(true);

      const checkRes = await request
        .get('/api/search/history')
        .set('Authorization', `Bearer ${token1}`);
      expect(checkRes.body.data.length).toBe(1);

      const clearAllRes = await request
        .delete('/api/search/history')
        .set('Authorization', `Bearer ${token1}`);
      expect(clearAllRes.status).toBe(200);

      const checkFinalRes = await request
        .get('/api/search/history')
        .set('Authorization', `Bearer ${token1}`);
      expect(checkFinalRes.body.data.length).toBe(0);
    });
  });
});
