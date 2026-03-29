import { describe, it, expect } from '@jest/globals';

describe('Backend Example Test', () => {
  it('should pass a basic assertion', () => {
    expect(true).toBe(true);
  });

  it('should add numbers correctly', () => {
    const sum = (a: number, b: number) => a + b;
    expect(sum(2, 2)).toBe(4);
  });
});
