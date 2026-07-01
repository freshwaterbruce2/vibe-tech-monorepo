import { describe, expect, it } from 'vitest';
import { detectCrisis, getCrisisResponse } from '../crisisDetection';

describe('detectCrisis', () => {
  it('detects self-harm / suicidal language', () => {
    expect(detectCrisis('sometimes i want to kill myself')).toBe('self-harm');
    expect(detectCrisis('I want to die')).toBe('self-harm');
    expect(detectCrisis('i feel suicidal')).toBe('self-harm');
    expect(detectCrisis('I keep hurting myself')).toBe('self-harm');
    expect(detectCrisis("there's no reason to live")).toBe('self-harm');
  });

  it('detects abuse / unsafe-at-home language', () => {
    expect(detectCrisis('my uncle hits me')).toBe('abuse');
    expect(detectCrisis("i'm being abused")).toBe('abuse');
    expect(detectCrisis('I am scared of my dad')).toBe('abuse');
    expect(detectCrisis('i do not feel safe at home')).toBe('abuse');
  });

  it('does NOT fire on ordinary kid hyperbole', () => {
    expect(detectCrisis('this homework is killing me')).toBeNull();
    expect(detectCrisis("I'm dying to play that game")).toBeNull();
    expect(detectCrisis('I could die of boredom in math class')).toBeNull();
    expect(detectCrisis('My team died in the video game')).toBeNull();
  });

  it('returns null for empty or neutral input', () => {
    expect(detectCrisis('')).toBeNull();
    expect(detectCrisis('can you help me with fractions?')).toBeNull();
  });
});

describe('getCrisisResponse', () => {
  it('self-harm response includes 988 and trusted-adult guidance', () => {
    const r = getCrisisResponse('self-harm');
    expect(r).toContain('988');
    expect(r.toLowerCase()).toContain('trusted adult');
    expect(r).toContain('911');
  });

  it('abuse response includes 988 and is reassuring', () => {
    const r = getCrisisResponse('abuse');
    expect(r).toContain('988');
    expect(r.toLowerCase()).toContain('not your fault');
  });
});
