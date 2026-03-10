import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
  it('should merge class names', () => {
    const result = cn('foo', 'bar');
    expect(result).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    const result = cn('foo', false && 'bar', 'baz');
    expect(result).toBe('foo baz');
  });

  it('should merge tailwind classes correctly', () => {
    const result = cn('px-2 py-1', 'px-4');
    // tailwind-merge should keep only px-4
    expect(result).toBe('py-1 px-4');
  });

  it('should handle arrays of classes', () => {
    const result = cn(['foo', 'bar'], 'baz');
    expect(result).toBe('foo bar baz');
  });

  it('should handle objects with boolean values', () => {
    const result = cn({
      foo: true,
      bar: false,
      baz: true,
    });
    expect(result).toBe('foo baz');
  });

  it('should handle empty input', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('should handle undefined and null', () => {
    const result = cn('foo', undefined, null, 'bar');
    expect(result).toBe('foo bar');
  });

  it('should merge conflicting tailwind classes', () => {
    const result = cn('text-sm text-lg');
    // tailwind-merge should keep only the last conflicting class
    expect(result).toBe('text-lg');
  });

  it('should handle complex combinations', () => {
    const result = cn(
      'base-class',
      { active: true, disabled: false },
      'px-4',
      ['rounded', 'shadow'],
      null,
      undefined
    );
    expect(result).toContain('base-class');
    expect(result).toContain('active');
    expect(result).not.toContain('disabled');
    expect(result).toContain('px-4');
    expect(result).toContain('rounded');
    expect(result).toContain('shadow');
  });
});
