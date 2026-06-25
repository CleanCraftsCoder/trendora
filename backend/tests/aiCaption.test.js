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
});
