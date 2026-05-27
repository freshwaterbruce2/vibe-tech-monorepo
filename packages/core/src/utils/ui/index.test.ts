import { describe, it, expect } from 'vitest';
import { cn } from './index';

describe('UI Utilities', () => {
  describe('cn (className merger)', () => {
    it('merges class names', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
    });

    it('handles conditional classes with clsx', () => {
      expect(cn('base', false && 'hidden', true && 'visible')).toBe('base visible');
    });

    it('merges Tailwind classes correctly', () => {
      // twMerge should handle conflicting Tailwind classes
      expect(cn('px-2', 'px-4')).toBe('px-4');
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });

    it('handles arrays of classes', () => {
      expect(cn(['class1', 'class2'])).toBe('class1 class2');
    });

    it('handles objects with boolean values', () => {
      expect(cn({
        'class1': true,
        'class2': false,
        'class3': true,
      })).toBe('class1 class3');
    });

    it('handles undefined and null values', () => {
      expect(cn('class1', undefined, null, 'class2')).toBe('class1 class2');
    });

    it('handles empty input', () => {
      expect(cn()).toBe('');
    });

    it('handles complex Tailwind merging scenarios', () => {
      // Test multiple conflicting utilities
      expect(cn('p-2', 'p-4')).toBe('p-4');
      expect(cn('mt-2', 'mt-4')).toBe('mt-4');
      
      // Test responsive variants
      expect(cn('text-sm', 'md:text-lg', 'text-base')).toContain('md:text-lg');
      
      // Test with custom classes and Tailwind
      expect(cn('custom-class', 'p-2', 'p-4')).toBe('custom-class p-4');
    });

    it('handles duplicate class inputs', () => {
      // Note: cn (clsx + tailwind-merge) doesn't deduplicate non-Tailwind classes
      // It does merge conflicting Tailwind utilities like p-2 + p-4 -> p-4
      const result = cn('class1', 'class1');
      expect(result).toContain('class1');
    });

    it('preserves non-conflicting classes', () => {
      const result = cn('flex', 'items-center', 'justify-between', 'p-4');
      expect(result).toContain('flex');
      expect(result).toContain('items-center');
      expect(result).toContain('justify-between');
      expect(result).toContain('p-4');
    });

    it('handles state variants correctly', () => {
      const result = cn('hover:bg-blue-500', 'hover:bg-red-500');
      expect(result).toBe('hover:bg-red-500');
    });

    it('works with component composition', () => {
      const baseStyles = 'rounded-lg border';
      const variantStyles = 'bg-blue-500 text-white';
      const overrides = 'bg-red-500';
      
      const result = cn(baseStyles, variantStyles, overrides);
      
      expect(result).toContain('rounded-lg');
      expect(result).toContain('border');
      expect(result).toContain('text-white');
      expect(result).toContain('bg-red-500');
      expect(result).not.toContain('bg-blue-500');
    });
  });
});
