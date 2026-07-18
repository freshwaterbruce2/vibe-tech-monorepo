import { beforeEach, describe, expect, it, vi } from 'vitest';

const configureMonaco = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('../../../utils/monacoConfig', () => ({
  configureMonaco: (...args: unknown[]) => configureMonaco(...args),
}));

vi.mock('@monaco-editor/react', () => ({
  default: () => null,
  loader: { config: vi.fn() },
}));

describe('preloadMonaco', () => {
  beforeEach(() => {
    configureMonaco.mockClear();
  });

  it('configures monaco then loads the editor package', async () => {
    const { preloadMonaco } = await import('../../../components/Editor/monacoPreload');
    const mod = await preloadMonaco();
    expect(configureMonaco).toHaveBeenCalledTimes(1);
    expect(mod).toBeTypeOf('object');
    expect(mod).toHaveProperty('default');
  });
});
