/**
 * empty-module shim — verifies the @monacopilot/core stand-ins.
 *
 * monacopilot's browser entry statically imports { Copilot, logger } from
 * '@monacopilot/core' (aliased to this shim in vite.config). Only
 * registerCompletion runs client-side; Copilot is server-only and never
 * instantiated in the browser, so these stand-ins exist purely to satisfy the
 * static import without bundling the Node-dependent core.
 */

import { describe, expect, it } from 'vitest';
import emptyDefault, {
  Copilot,
  logger,
  promises,
  extname,
  createHash,
} from '../../shims/empty-module';

describe('empty-module shim', () => {
  it('exposes a no-op Copilot class for the @monacopilot/core static import', () => {
    expect(new Copilot()).toBeInstanceOf(Copilot);
  });

  it('exposes no-op node-builtin stand-ins that resolve without touching the filesystem', async () => {
    await expect(promises.mkdir()).resolves.toBeUndefined();
    expect(extname('file.ts')).toBe('');
    expect(createHash().update().digest()).toBe('');
  });

  it('exposes a no-op logger whose methods never throw', () => {
    expect(() => {
      logger.debug('d');
      logger.info('i');
      logger.warn('w');
      logger.error('e');
      logger.log('l');
    }).not.toThrow();
  });

  it('default export is an empty object', () => {
    expect(emptyDefault).toEqual({});
  });
});
