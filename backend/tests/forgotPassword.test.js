const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/database');
const User = require('../models/User');
const supertest = require('supertest');
const app = require('../app');
const request = supertest(app);

describe('Forgot & Reset Password Endpoints', () => {
  const testEmail = `forgot_test_${Date.now()}@example.com`;
  const originalPassword = 'OldPassword123!';
  const newPassword = 'NewPassword456!';
  let resetToken = null;

  beforeAll(async () => {
    jest.setTimeout(30000);
    await connectDB();

    // Create a test user
    await User.deleteMany({ email: { $regex: /forgot_test_/ } });
    const user = new User({
      email: testEmail,
      username: `forgot_user_${Date.now().toString().slice(-6)}`,
      password: originalPassword,
      firstName: 'Forgot',
      lastName: 'Tester',
      isVerified: true,
    });
    await user.save();
  }, 30000);

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /forgot_test_/ } });
    await disconnectDB();
  }, 30000);

  describe('POST /api/auth/forgot-password', () => {
    test('should reject request when email is missing', async () => {
      const res = await request
        .post('/api/auth/forgot-password')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should return success for non-existent email without revealing account absence', async () => {
      const res = await request
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent_account_999@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/password reset instructions have been sent/i);
    });

    test('should generate reset token for existing user', async () => {
      const res = await request
        .post('/api/auth/forgot-password')
        .send({ email: testEmail });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.resetToken).toBeDefined();
      expect(res.body.data.resetUrl).toMatch(/reset-password\?token=/);

      resetToken = res.body.data.resetToken;

      // Verify token in DB
      const userInDb = await User.findOne({ email: testEmail }).select('+verificationToken +verificationExpiry');
      expect(userInDb.verificationToken).toBe(resetToken);
      expect(userInDb.verificationExpiry).toBeDefined();
      expect(new Date(userInDb.verificationExpiry).getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('POST /api/auth/reset-password', () => {
    test('should reject reset if token or password is missing', async () => {
      const res1 = await request
        .post('/api/auth/reset-password')
        .send({ newPassword: newPassword });

      expect(res1.status).toBe(400);
      expect(res1.body.success).toBe(false);

      const res2 = await request
        .post('/api/auth/reset-password')
        .send({ token: resetToken });

      expect(res2.status).toBe(400);
      expect(res2.body.success).toBe(false);
    });

    test('should reject weak new password that does not meet security rules', async () => {
      const res = await request
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'weak',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Password must/i);
    });

    test('should reject invalid or expired reset token', async () => {
      const res = await request
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid_fake_token_1234567890abcdef',
          newPassword: newPassword,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/invalid or expired/i);
    });

    test('should successfully reset password with valid token and strong password', async () => {
      const res = await request
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: newPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/Password has been reset successfully/i);

      // Verify token cleared in DB
      const userInDb = await User.findOne({ email: testEmail }).select('+verificationToken +verificationExpiry');
      expect(userInDb.verificationToken).toBeUndefined();
    });

    test('should prevent login with old password and allow login with new password', async () => {
      // Old password should fail
      const oldLoginRes = await request
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: originalPassword,
        });

      expect(oldLoginRes.status).toBe(401);
      expect(oldLoginRes.body.success).toBe(false);

      // New password should succeed
      const newLoginRes = await request
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: newPassword,
        });

      expect(newLoginRes.status).toBe(200);
      expect(newLoginRes.body.success).toBe(true);
      expect(newLoginRes.body.data.tokens).toBeDefined();
    });
  });
});
