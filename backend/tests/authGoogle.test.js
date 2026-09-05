const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/database');
const User = require('../models/User');
const supertest = require('supertest');
const app = require('../app');
const request = supertest(app);

describe('Google Authentication Endpoint', () => {
  const testGoogleEmail = `google_test_${Date.now()}@example.com`;
  const testGoogleId = `google_sub_${Date.now()}`;

  const createMockToken = (data) => {
    return `mock-google-token:${Buffer.from(JSON.stringify(data)).toString('base64')}`;
  };

  beforeAll(async () => {
    jest.setTimeout(30000);
    await connectDB();
  }, 30000);

  afterAll(async () => {
    // Cleanup created test user
    await User.deleteMany({ email: { $regex: /google_test_/ } });
    await disconnectDB();
  }, 30000);

  test('should return 401 if missing credentials or empty payload', async () => {
    const res = await request
      .post('/api/auth/google')
      .send({});

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('should reject invalid or impossible Gmail addresses like acb@gmail.com', async () => {
    const fakeGmailToken = createMockToken({
      googleId: 'fake_google_id_123',
      email: 'acb@gmail.com',
      emailVerified: true,
      firstName: 'Fake',
      lastName: 'User',
    });

    const res = await request
      .post('/api/auth/google')
      .send({ credential: fakeGmailToken });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/Gmail usernames must be between 6 and 30 characters/i);
  });

  test('should reject unverified Google emails', async () => {
    const unverifiedToken = createMockToken({
      googleId: 'unverified_google_id_456',
      email: 'valid.user.account@example.com',
      emailVerified: false,
    });

    const res = await request
      .post('/api/auth/google')
      .send({ credential: unverifiedToken });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('should register a new user using verified Google authentication', async () => {
    const validToken = createMockToken({
      googleId: testGoogleId,
      email: testGoogleEmail,
      emailVerified: true,
      firstName: 'GoogleTester',
      lastName: 'Account',
      profilePicture: 'https://example.com/avatar.jpg',
    });

    const res = await request
      .post('/api/auth/google')
      .send({ credential: validToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe(testGoogleEmail.toLowerCase());
    expect(res.body.data.user.firstName).toBe('GoogleTester');
    expect(res.body.data.tokens).toBeDefined();
    expect(res.body.data.tokens.accessToken).toBeDefined();
    expect(res.body.data.tokens.refreshToken).toBeDefined();

    // Verify user exists in database with googleId
    const savedUser = await User.findOne({ email: testGoogleEmail.toLowerCase() });
    expect(savedUser).toBeDefined();
    expect(savedUser.googleId).toBe(testGoogleId);
    expect(savedUser.authProvider).toBe('google');
    expect(savedUser.isVerified).toBe(true);
  });

  test('should sign in an existing user without duplicating account', async () => {
    const existingToken = createMockToken({
      googleId: testGoogleId,
      email: testGoogleEmail,
      emailVerified: true,
      firstName: 'GoogleTester',
      lastName: 'Account',
    });

    const res = await request
      .post('/api/auth/google')
      .send({ credential: existingToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testGoogleEmail.toLowerCase());
    expect(res.body.data.tokens.accessToken).toBeDefined();

    // Check count of users with this email is still 1
    const count = await User.countDocuments({ email: testGoogleEmail.toLowerCase() });
    expect(count).toBe(1);
  });
});
