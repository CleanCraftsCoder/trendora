const aiService = require('../services/aiService');

describe('AI Recommendation Service', () => {
  describe('cosineSimilarity', () => {
    test('should return 1 for identical vectors', () => {
      const vecA = [1, 0, 0, 0];
      const vecB = [1, 0, 0, 0];
      expect(aiService.cosineSimilarity(vecA, vecB)).toBeCloseTo(1.0, 5);
    });

    test('should return 0 for orthogonal vectors', () => {
      const vecA = [1, 0, 0, 0];
      const vecB = [0, 1, 0, 0];
      expect(aiService.cosineSimilarity(vecA, vecB)).toBe(0);
    });

    test('should return -1 for opposite vectors', () => {
      const vecA = [1, 0, 0, 0];
      const vecB = [-1, 0, 0, 0];
      expect(aiService.cosineSimilarity(vecA, vecB)).toBeCloseTo(-1.0, 5);
    });

    test('should handle empty or mismatching vectors safely', () => {
      expect(aiService.cosineSimilarity([], [])).toBe(0);
      expect(aiService.cosineSimilarity([1, 2], [1])).toBe(0);
      expect(aiService.cosineSimilarity(null, [1])).toBe(0);
    });
  });

  describe('generateTextEmbedding (Fallback local model)', () => {
    test('should return a 128-dimensional vector', async () => {
      const embedding = await aiService.generateTextEmbedding('Hello world, checking recommendations!');
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(128);
      
      // Vector should be normalized to unit length: sum of squares ≈ 1
      const sumSq = embedding.reduce((sum, val) => sum + val * val, 0);
      expect(sumSq).toBeCloseTo(1.0, 4);
    });

    test('should produce similar vectors for semantically similar inputs', async () => {
      const vec1 = await aiService.generateTextEmbedding('Love this new social media site #awesome #social', ['awesome', 'social']);
      const vec2 = await aiService.generateTextEmbedding('This social media site is awesome #social', ['social']);
      const vec3 = await aiService.generateTextEmbedding('Completely different topic food recipes cooking kitchen');

      const simSimilar = aiService.cosineSimilarity(vec1, vec2);
      const simDifferent1 = aiService.cosineSimilarity(vec1, vec3);
      const simDifferent2 = aiService.cosineSimilarity(vec2, vec3);

      expect(simSimilar).toBeGreaterThan(0.5);
      expect(simSimilar).toBeGreaterThan(simDifferent1);
      expect(simSimilar).toBeGreaterThan(simDifferent2);
    });
  });
});
