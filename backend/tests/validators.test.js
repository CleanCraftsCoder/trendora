const {
  validateGmailAddress,
  isDisposableEmail,
  checkDomainExists,
  validateAndSanitizeEmail,
  validateAndSanitizeEmailAsync,
} = require('../utils/validators');

describe('Strict Email & Domain Validator', () => {
  describe('Gmail Specific Validation', () => {
    test('should reject Gmail usernames shorter than 6 characters (e.g. acb@gmail.com)', () => {
      const result = validateGmailAddress('acb@gmail.com');
      expect(result.valid).toBe(false);
      expect(result.message).toMatch(/between 6 and 30 characters/i);
    });

    test('should reject 4 and 5 character Gmail addresses like user@gmail.com', () => {
      const result = validateGmailAddress('user1@gmail.com');
      expect(result.valid).toBe(false);
      expect(result.message).toMatch(/between 6 and 30 characters/i);
    });

    test('should reject anonymous and placeholder Gmail usernames', () => {
      const result1 = validateGmailAddress('anonymoususer@gmail.com');
      expect(result1.valid).toBe(false);

      const result2 = validateGmailAddress('dummyaccount123@gmail.com');
      expect(result2.valid).toBe(false);
    });

    test('should reject Gmail addresses with consecutive dots or leading/trailing dots', () => {
      const result1 = validateGmailAddress('john..doe1234@gmail.com');
      expect(result1.valid).toBe(false);

      const result2 = validateGmailAddress('.johndoe1234@gmail.com');
      expect(result2.valid).toBe(false);
    });

    test('should accept valid, properly formatted Gmail addresses', () => {
      const result = validateGmailAddress('hasannawaz0290@gmail.com');
      expect(result.valid).toBe(true);
    });
  });

  describe('Disposable Email Check', () => {
    test('should detect disposable domains like mailinator.com and tempmail.com', () => {
      expect(isDisposableEmail('testuser@mailinator.com')).toBe(true);
      expect(isDisposableEmail('testuser@tempmail.com')).toBe(true);
      expect(isDisposableEmail('testuser@guerrillamail.com')).toBe(true);
      expect(isDisposableEmail('testuser@gmail.com')).toBe(false);
    });
  });

  describe('Domain Existence Check (DNS)', () => {
    test('should recognize existing domains like google.com or example.com', async () => {
      const exists = await checkDomainExists('google.com');
      expect(exists).toBe(true);
    });

    test('should reject completely non-existent domains', async () => {
      const exists = await checkDomainExists('fake-domain-that-strictly-does-not-exist-123456789.xyz');
      expect(exists).toBe(false);
    });
  });

  describe('Full Synchronous and Asynchronous Email Sanitization', () => {
    test('should reject acb@gmail.com in validateAndSanitizeEmail', () => {
      const result = validateAndSanitizeEmail('acb@gmail.com');
      expect(result.valid).toBe(false);
    });

    test('should reject disposable emails in validateAndSanitizeEmail', () => {
      const result = validateAndSanitizeEmail('test@tempmail.com');
      expect(result.valid).toBe(false);
      expect(result.message).toMatch(/disposable or temporary/i);
    });

    test('should reject non-existent domains in validateAndSanitizeEmailAsync', async () => {
      const result = await validateAndSanitizeEmailAsync('creator@fake-domain-that-strictly-does-not-exist-123456789.xyz');
      expect(result.valid).toBe(false);
      expect(result.message).toMatch(/does not exist or cannot receive emails/i);
    });

    test('should accept valid emails with existing domains', async () => {
      const result = await validateAndSanitizeEmailAsync('trendora.creator.test@example.com');
      expect(result.valid).toBe(true);
      expect(result.email).toBe('trendora.creator.test@example.com');
    });
  });
});
