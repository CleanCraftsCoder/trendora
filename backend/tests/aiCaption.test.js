const aiController = require('../controllers/aiController');

describe('AI Caption Controller - Category Detection & Suggestions', () => {
  describe('detectCategory', () => {
    test('should map food keywords to food category', () => {
      expect(aiController.detectCategory('my_lunch_pic.jpg')).toBe('food');
      expect(aiController.detectCategory('delicious-dinner.png')).toBe('food');
      expect(aiController.detectCategory('cooking-recipe.webp')).toBe('food');
    });

    test('should map travel keywords to travel category', () => {
      expect(aiController.detectCategory('summer_trip.jpg')).toBe('travel');
      expect(aiController.detectCategory('vacation-spot.png')).toBe('travel');
      expect(aiController.detectCategory('beach-sunset.webp')).toBe('travel');
    });

    test('should map tech keywords to tech category', () => {
      expect(aiController.detectCategory('my_coding_desk.jpg')).toBe('tech');
      expect(aiController.detectCategory('programming-tips.png')).toBe('tech');
      expect(aiController.detectCategory('new-software-update.webp')).toBe('tech');
    });

    test('should map nature keywords to nature category', () => {
      expect(aiController.detectCategory('forest-hike.jpg')).toBe('nature');
      expect(aiController.detectCategory('mountain_climbing.png')).toBe('nature');
    });

    test('should map pets keywords to pets category', () => {
      expect(aiController.detectCategory('cute-puppy.jpg')).toBe('pets');
      expect(aiController.detectCategory('cat-life.png')).toBe('pets');
    });

    test('should map unknown keywords to general category', () => {
      expect(aiController.detectCategory('random-file.jpg')).toBe('general');
      expect(aiController.detectCategory('screenshot_123.png')).toBe('general');
    });
  });

  describe('MOCK_CATEGORIES', () => {
    test('should contain valid mock captions and hashtags for each category', () => {
      const categories = ['travel', 'food', 'tech', 'nature', 'pets', 'general'];
      for (const cat of categories) {
        expect(aiController.MOCK_CATEGORIES).toHaveProperty(cat);
        expect(Array.isArray(aiController.MOCK_CATEGORIES[cat].captions)).toBe(true);
        expect(aiController.MOCK_CATEGORIES[cat].captions.length).toBeGreaterThan(0);
        expect(Array.isArray(aiController.MOCK_CATEGORIES[cat].hashtags)).toBe(true);
        expect(aiController.MOCK_CATEGORIES[cat].hashtags.length).toBeGreaterThan(0);
      }
    });
  });

  describe('generateDynamicCaptions', () => {
    test('should return 3 captions and an array of hashtags', () => {
      const result = aiController.generateDynamicCaptions({
        filename: 'IMG_4021.jpg',
        fileSize: 204800,
        nonce: 1001,
      });

      expect(result).toHaveProperty('captions');
      expect(result).toHaveProperty('hashtags');
      expect(result.captions.length).toBe(3);
      expect(result.hashtags.length).toBeGreaterThan(3);
    });

    test('should produce distinct captions across different posts and nonces', () => {
      const result1 = aiController.generateDynamicCaptions({
        filename: 'sunset_beach.jpg',
        fileSize: 102400,
        nonce: 100,
        vibe: 'Chill 🌿',
      });

      const result2 = aiController.generateDynamicCaptions({
        filename: 'gym_workout.jpg',
        fileSize: 512000,
        nonce: 9999,
        vibe: 'Hype 🔥',
      });

      // Different inputs should not yield identical caption arrays
      expect(result1.captions[0]).not.toBe(result2.captions[0]);
    });

    test('should respect user custom keywords and vibes', () => {
      const result = aiController.generateDynamicCaptions({
        filename: 'photo.jpg',
        keywords: 'coffee latte art',
        vibe: 'Aesthetic ✨',
        nonce: 50,
      });

      expect(result.captions.some((c) => c.toLowerCase().includes('coffee') || c.toLowerCase().includes('latte'))).toBe(true);
      expect(result.hashtags.some((h) => h.includes('coffee') || h.includes('latte') || h.includes('trendora'))).toBe(true);
    });
  });
});
