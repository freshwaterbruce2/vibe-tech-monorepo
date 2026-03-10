import { describe, it, expect } from 'vitest';
import { cosineSimilarity, euclideanDistance } from '../../electron/services/vector-utils';

describe('ApexVectorUtils', () => {
  it('should calculate cosine similarity correctly', () => {
    const vecA = new Float32Array([1, 0, 0]);
    const vecB = new Float32Array([1, 0, 0]);
    expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(1.0);

    const vecC = new Float32Array([0, 1, 0]);
    expect(cosineSimilarity(vecA, vecC)).toBeCloseTo(0.0);

    const vecD = new Float32Array([-1, 0, 0]);
    expect(cosineSimilarity(vecA, vecD)).toBeCloseTo(-1.0);
  });

  it('should handle non-normalized vectors', () => {
    const vecA = new Float32Array([3, 0, 0]); // Magnitude 3
    const vecB = new Float32Array([1, 0, 0]); // Magnitude 1
    // Angle is 0, cos(0) = 1
    expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(1.0);
  });

  it('should calculate euclidean distance', () => {
      const vecA = new Float32Array([0, 0]);
      const vecB = new Float32Array([3, 4]);
      expect(euclideanDistance(vecA, vecB)).toBe(5);
  });

  it('should throw on mismatch', () => {
      const vecA = new Float32Array([1]);
      const vecB = new Float32Array([1, 2]);
      expect(() => cosineSimilarity(vecA, vecB)).toThrow();
  });
});
