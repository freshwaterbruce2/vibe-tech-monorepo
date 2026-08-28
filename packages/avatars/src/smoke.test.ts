import { describe, expect, it } from 'vitest';

describe('@vibetech/avatars', () => {
  it('loads shared types module', async () => {
    const mod = await import('./types');
    expect(mod).toBeDefined();
  });
});
