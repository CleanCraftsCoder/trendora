const moderationService = require('../services/moderationService');

describe('AI Content Moderation Service', () => {
  describe('moderateText', () => {
    test('should flag toxic keyword text with high score', async () => {
      const result = await moderationService.moderateText('This is absolutely toxic and abusive hatespeech!');
      expect(result.flagged).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(0.8);
      expect(result.reason).toContain('hatespeech');
    });

    test('should flag financial spam phrases', async () => {
      const result = await moderationService.moderateText('You can make money fast and earn cash now free crypto!');
      expect(result.flagged).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(0.7);
      expect(result.reason).toContain('cash spam');
    });

    test('should flag promo link spamming', async () => {
      const result = await moderationService.moderateText('Visit https://spam.site and http://promo.xyz and https://fake.org right now!');
      expect(result.flagged).toBe(true);
      expect(result.score).toBe(0.85);
      expect(result.reason).toContain('link spamming');
    });

    test('should pass clean safe texts', async () => {
      const result = await moderationService.moderateText('Having a beautiful morning coffee and reading some articles.');
      expect(result.flagged).toBe(false);
      expect(result.score).toBe(0);
    });
  });

  describe('moderateImage', () => {
    test('should flag unsafe keywords in filename', async () => {
      const result = await moderationService.moderateImage('', 'nude_photo_leak.png');
      expect(result.flagged).toBe(true);
      expect(result.score).toBe(0.75);
    });

    test('should pass safe image filenames', async () => {
      const result = await moderationService.moderateImage('', 'family_trip_beach.jpg');
      expect(result.flagged).toBe(false);
      expect(result.score).toBe(0);
    });
  });

  describe('moderatePost document routing', () => {
    test('should route highly toxic post to flagged status', async () => {
      const dummyPost = {
        caption: 'This post is pure spam and abuse',
        images: ['img1.jpg'],
        moderationStatus: 'approved',
        moderationReason: ''
      };

      await moderationService.moderatePost(dummyPost);
      expect(dummyPost.moderationStatus).toBe('flagged');
      expect(dummyPost.moderationReason).toContain('abuse');
    });

    test('should route suspicious content to pending_review', async () => {
      const dummyPost = {
        caption: 'Let us discuss some sensitive topics like toxic words',
        images: ['img1.jpg'],
        moderationStatus: 'approved',
        moderationReason: ''
      };

      await moderationService.moderatePost(dummyPost);
      expect(dummyPost.moderationStatus).toBe('pending_review');
    });

    test('should approve clean posts', async () => {
      const dummyPost = {
        caption: 'This is a clean and simple post caption',
        images: ['img1.jpg'],
        moderationStatus: 'approved',
        moderationReason: ''
      };

      await moderationService.moderatePost(dummyPost);
      expect(dummyPost.moderationStatus).toBe('approved');
    });
  });
});
