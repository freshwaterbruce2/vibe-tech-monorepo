import { describe, expect, it } from 'vitest';
import {
  hexToHSL,
  getForegroundColor,
  shadeColor,
  generateColorScale,
} from '../colorUtils';

describe('colorUtils', () => {
  describe('hexToHSL', () => {
    it('converts pure red', () => {
      const result = hexToHSL('#FF0000');
      expect(result).toBe('0 100% 50%');
    });

    it('converts pure white', () => {
      const result = hexToHSL('#FFFFFF');
      expect(result).toBe('0 0% 100%');
    });

    it('converts pure black', () => {
      const result = hexToHSL('#000000');
      expect(result).toBe('0 0% 0%');
    });

    it('works without hash prefix', () => {
      const result = hexToHSL('FF0000');
      expect(result).toBe('0 100% 50%');
    });

    it('converts a blue-ish color correctly', () => {
      // #0000FF => H=240 S=100% L=50%
      const result = hexToHSL('#0000FF');
      expect(result).toBe('240 100% 50%');
    });
  });

  describe('getForegroundColor', () => {
    it('returns dark text for light backgrounds', () => {
      const result = getForegroundColor('#FFFFFF');
      expect(result).toContain('11.2%'); // dark gray luminance
    });

    it('returns light text for dark backgrounds', () => {
      const result = getForegroundColor('#000000');
      expect(result).toContain('98%'); // almost white luminance
    });

    it('returns light text for medium-dark colors', () => {
      const result = getForegroundColor('#333333');
      expect(result).toContain('98%');
    });
  });

  describe('shadeColor', () => {
    it('darkens a color with factor < 1', () => {
      const result = shadeColor('#808080', 0.5);
      expect(result).toBe('#404040');
    });

    it('returns same color with factor = 1', () => {
      const result = shadeColor('#808080', 1);
      expect(result).toBe('#808080');
    });

    it('clamps to 255 when lightening', () => {
      const result = shadeColor('#FF0000', 2);
      expect(result).toBe('#ff0000'); // Red channel clamped at 255
    });

    it('handles hash prefix removal', () => {
      const withHash = shadeColor('#808080', 0.5);
      const withoutHash = shadeColor('808080', 0.5);
      expect(withHash).toBe(withoutHash);
    });
  });

  describe('generateColorScale', () => {
    it('returns levels 50 through 900', () => {
      const scale = generateColorScale('#0071CE');
      const keys = Object.keys(scale).map(Number);
      expect(keys).toContain(50);
      expect(keys).toContain(500);
      expect(keys).toContain(900);
      expect(keys.length).toBe(10);
    });

    it('base color is at level 500', () => {
      const scale = generateColorScale('#0071CE');
      expect(scale[500]!.toLowerCase()).toBe('#0071ce');
    });

    it('lighter shades are lighter than base', () => {
      const scale = generateColorScale('#808080');
      // Level 50 should have higher RGB values (lighter) than level 500
      const parseHex = (hex: string) => parseInt(hex.replace('#', '').slice(0, 2), 16);
      expect(parseHex(scale[50]!)).toBeGreaterThan(parseHex(scale[500]!));
    });

    it('darker shades are darker than base', () => {
      const scale = generateColorScale('#808080');
      const parseHex = (hex: string) => parseInt(hex.replace('#', '').slice(0, 2), 16);
      expect(parseHex(scale[900]!)).toBeLessThan(parseHex(scale[500]!));
    });
  });
});
