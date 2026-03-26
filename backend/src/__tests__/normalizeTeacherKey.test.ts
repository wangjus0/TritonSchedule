import { normalizeTeacherKey } from '../utils/normalizeTeacherKey.js';

describe('normalizeTeacherKey', () => {
  it('should trim whitespace', () => {
    expect(normalizeTeacherKey('  John Doe  ')).toBe('john doe');
  });

  it('should replace multiple spaces with single space', () => {
    expect(normalizeTeacherKey('John   Doe')).toBe('john doe');
  });

  it('should remove special characters', () => {
    expect(normalizeTeacherKey('John O\'Connor')).toBe('john oconnor');
    expect(normalizeTeacherKey('Jane-Smith')).toBe('janesmith');
  });

  it('should convert to lowercase', () => {
    expect(normalizeTeacherKey('JOHN DOE')).toBe('john doe');
  });

  it('should handle edge cases', () => {
    expect(normalizeTeacherKey('')).toBe('');
    expect(normalizeTeacherKey('   ')).toBe('');
  });
});
