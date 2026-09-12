import { describe, expect, it, vi } from 'vitest';

const { play, volume } = vi.hoisted(() => ({ play: vi.fn(), volume: vi.fn() }));

vi.mock('howler', () => ({
  Howl: class Howl {
    play = play;
    volume = volume;
  },
}));

import { soundEffects } from '../soundEffects';

describe('soundEffects sensory integration', () => {
  it('applies the validated preference shape live without reparsing appStore values', () => {
    soundEffects.applyPreferences({
      animationSpeed: 'reduced',
      soundEnabled: false,
      hapticEnabled: true,
      fontSize: 'medium',
      dyslexiaFont: false,
      colorMode: 'default',
    });
    soundEffects.play('taskComplete');
    expect(play).not.toHaveBeenCalled();

    soundEffects.applyPreferences({
      animationSpeed: 'normal',
      soundEnabled: true,
      hapticEnabled: true,
      fontSize: 'medium',
      dyslexiaFont: false,
      colorMode: 'default',
    });
    soundEffects.play('taskComplete');
    expect(play).toHaveBeenCalledOnce();
  });
});
