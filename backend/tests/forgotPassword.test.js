const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/database');
const User = require('../models/User');
const supertest = require('supertest');
const app = require('../app');
const request = supertest(app);

describe('Forgot & Reset Password Endpoints (Secure 6-Digit Code Flow)', () => {
  const testEmail = `forgot_test_${Date.now()}@example.com`;
  const originalPassword = 'OldPassword123!';
  const newPassword = 'NewPassword456!';
  let generatedCode = null;

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
      expect(res.body.message).toMatch(/confirmation code has been sent/i);
    });

    test('should generate 6-digit confirmation code in DB and NEVER leak code or token in API response', async () => {
      const res = await request
        .post('/api/auth/forgot-password')
        .send({ email: testEmail });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // CRITICAL SECURITY ASSERTION: Response MUST NOT contain any code, token, or URL
      expect(res.body.data).toBeNull();
      expect(res.body.resetToken).toBeUndefined();
      expect(res.body.resetUrl).toBeUndefined();
      expect(res.body.code).toBeUndefined();

      // Verify 6-digit code was saved securely in DB (select: false)
      const userInDb = await User.findOne({ email: testEmail }).select('+resetPasswordCode +resetPasswordCodeExpiry');
      expect(userInDb.resetPasswordCode).toBeDefined();
      expect(userInDb.resetPasswordCode).toHaveLength(6);
      expect(/^\d{6}$/.test(userInDb.resetPasswordCode)).toBe(true);
      expect(userInDb.resetPasswordCodeExpiry).toBeDefined();
      expect(new Date(userInDb.resetPasswordCodeExpiry).getTime()).toBeGreaterThan(Date.now());

      generatedCode = userInDb.resetPasswordCode;
    });
  });

  describe('POST /api/auth/reset-password', () => {
    test('should reject reset if confirmation code or password is missing', async () => {
      const res1 = await request
        .post('/api/auth/reset-password')
        .send({ email: testEmail, newPassword: newPassword });

      expect(res1.status).toBe(400);
      expect(res1.body.success).toBe(false);

      const res2 = await request
        .post('/api/auth/reset-password')
        .send({ email: testEmail, code: generatedCode });

      expect(res2.status).toBe(400);
      expect(res2.body.success).toBe(false);
    });

    test('should reject invalid or wrong 6-digit confirmation code', async () => {
      const res = await request
        .post('/api/auth/reset-password')
        .send({
          email: testEmail,
          code: '999999', // wrong code
          newPassword: newPassword,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/invalid or expired confirmation code/i);
    });

    test('should reject weak new password that does not meet security rules', async () => {
      const res = await request
        .post('/api/auth/reset-password')
        .send({
          email: testEmail,
          code: generatedCode,
          newPassword: 'weak',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Password must/i);
    });

    test('should successfully reset password with valid 6-digit code and strong password', async () => {
      const res = await request
        .post('/api/auth/reset-password')
        .send({
          email: testEmail,
          code: generatedCode,
          newPassword: newPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/Password has been reset successfully/i);

      // Verify code cleared in DB
      const userInDb = await User.findOne({ email: testEmail }).select('+resetPasswordCode +resetPasswordCodeExpiry');
      expect(userInDb.resetPasswordCode).toBeUndefined();
    });

    test('should reject reuse of the same confirmation code after it was used', async () => {
      const res = await request
        .post('/api/auth/reset-password')
        .send({
          email: testEmail,
          code: generatedCode,
          newPassword: 'AnotherPassword789!',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should prevent login with old password and allow login with new password', async () => {
      // Old password must fail
      const oldLoginRes = await request
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: originalPassword,
        });

      expect(oldLoginRes.status).toBe(401);
      expect(oldLoginRes.body.success).toBe(false);

      // New password must succeed
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
