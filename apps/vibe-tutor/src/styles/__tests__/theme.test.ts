/**
 * Theme color-system tests
 *
 * jsdom cannot evaluate CSS custom properties, so these tests verify the color
 * constants that are used directly in component inline styles and icon props —
 * the source-of-truth values that the BrainGymHub color-system overhaul changed
 * from pink/fuchsia to sky/violet.
 *
 * We test:
 *   1. ZONE_CONFIG colors — all must be sky-blue variants, not pink/fuchsia
 *   2. GAMES list colors — no pink (#EC4899, #F472B6) or fuchsia (#D946EF, #E879F9)
 *   3. The sky-blue literal (#38BDF8) used in Data Cache stat box and Daily Goal panel
 *   4. The cyan color (#22d3ee) used in several stat boxes is present in the config
 */

import { describe, expect, it } from 'vitest';
import { GAMES, ZONE_CONFIG, ZONE_ORDER } from '../../components/games/brainGymConstants';

/* Regex for the colors that were removed in the overhaul */
const PINK_HEX = /#ec4899/i;
const PINK_LIGHT_HEX = /#f472b6/i;
const FUCHSIA_HEX = /#d946ef/i;
const FUCHSIA_LIGHT_HEX = /#e879f9/i;

/* Regex for the expected sky-blue family */
const SKY_BLUE_38 = /#38bdf8/i;   // Data Cache stat, Daily Goal panel
const CYAN_22 = /#22d3ee/i;        // Chill/Focus zone, Cognitive Fitness stat

describe('Theme color system — pink/fuchsia removal', () => {
  describe('ZONE_CONFIG colors', () => {
    it('no zone color is a pink hex', () => {
      for (const zone of ZONE_ORDER) {
        const color = ZONE_CONFIG[zone].color;
        expect(color).not.toMatch(PINK_HEX);
        expect(color).not.toMatch(PINK_LIGHT_HEX);
      }
    });

    it('no zone color is a fuchsia hex', () => {
      for (const zone of ZONE_ORDER) {
        const color = ZONE_CONFIG[zone].color;
        expect(color).not.toMatch(FUCHSIA_HEX);
        expect(color).not.toMatch(FUCHSIA_LIGHT_HEX);
      }
    });

    it('chill zone uses a sky/cyan color', () => {
      // Must be either #22d3ee (cyan-400) or within the sky-blue family
      const chillColor = ZONE_CONFIG.chill.color.toLowerCase();
      const isSkyCyan = chillColor === '#22d3ee' || chillColor === '#38bdf8' || chillColor === '#67e8f9' || chillColor === '#7dd3fc';
      expect(isSkyCyan).toBe(true);
    });

    it('focus zone uses a sky/cyan color', () => {
      const focusColor = ZONE_CONFIG.focus.color.toLowerCase();
      const isSkyCyan = focusColor === '#22d3ee' || focusColor === '#38bdf8' || focusColor === '#67e8f9' || focusColor === '#7dd3fc';
      expect(isSkyCyan).toBe(true);
    });

    it('challenge zone uses a sky/cyan color', () => {
      const challengeColor = ZONE_CONFIG.challenge.color.toLowerCase();
      const isSkyCyan = challengeColor === '#22d3ee' || challengeColor === '#38bdf8' || challengeColor === '#67e8f9' || challengeColor === '#7dd3fc';
      expect(isSkyCyan).toBe(true);
    });
  });

  describe('GAMES list colors', () => {
    it('no game color is a pink hex', () => {
      for (const game of GAMES) {
        expect(game.color).not.toMatch(PINK_HEX);
        expect(game.color).not.toMatch(PINK_LIGHT_HEX);
      }
    });

    it('no game color is a fuchsia hex', () => {
      for (const game of GAMES) {
        expect(game.color).not.toMatch(FUCHSIA_HEX);
        expect(game.color).not.toMatch(FUCHSIA_LIGHT_HEX);
      }
    });

    it('every game color is a non-empty string', () => {
      for (const game of GAMES) {
        expect(typeof game.color).toBe('string');
        expect(game.color.trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe('sky-blue token (#38BDF8) presence', () => {
    it('at least one game uses the sky-blue #38BDF8 token', () => {
      const usesToken = GAMES.some((g) => SKY_BLUE_38.test(g.color));
      expect(usesToken).toBe(true);
    });
  });

  describe('cyan-400 token (#22d3ee) presence', () => {
    it('at least one zone uses the cyan-400 (#22d3ee) token', () => {
      const usesToken = ZONE_ORDER.some((z) => CYAN_22.test(ZONE_CONFIG[z].color));
      expect(usesToken).toBe(true);
    });

    it('at least one game uses the cyan-400 (#22d3ee) token', () => {
      const usesToken = GAMES.some((g) => CYAN_22.test(g.color));
      expect(usesToken).toBe(true);
    });
  });
});

describe('Theme color system — GAMES structural integrity', () => {
  it('every game has an id, name, color, zone, tokens, and minLevel', () => {
    for (const game of GAMES) {
      expect(game.id).toBeTruthy();
      expect(game.name).toBeTruthy();
      expect(game.color).toBeTruthy();
      expect(['chill', 'focus', 'challenge']).toContain(game.zone);
      expect(typeof game.tokens).toBe('number');
      expect(game.tokens).toBeGreaterThan(0);
      expect(typeof game.minLevel).toBe('number');
      expect(game.minLevel).toBeGreaterThanOrEqual(0);
    }
  });

  it('games with minLevel 0 are always immediately playable', () => {
    const startingGames = GAMES.filter((g) => g.minLevel === 0);
    expect(startingGames.length).toBeGreaterThan(0);
    // Sanity: these include well-known games
    const ids = startingGames.map((g) => g.id);
    expect(ids).toContain('memory');
    expect(ids).toContain('mathadventure');
  });

  it('locked games require at least level 1', () => {
    const locked = GAMES.filter((g) => g.minLevel > 0);
    for (const game of locked) {
      expect(game.minLevel).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('ZONE_CONFIG structural integrity', () => {
  it('all three zones exist in ZONE_ORDER', () => {
    expect(ZONE_ORDER).toContain('chill');
    expect(ZONE_ORDER).toContain('focus');
    expect(ZONE_ORDER).toContain('challenge');
  });

  it('each zone has emoji, label, desc, and color properties', () => {
    for (const zone of ZONE_ORDER) {
      const cfg = ZONE_CONFIG[zone];
      expect(cfg.emoji).toBeTruthy();
      expect(cfg.label).toBeTruthy();
      expect(cfg.desc).toBeTruthy();
      expect(cfg.color).toBeTruthy();
    }
  });
});
