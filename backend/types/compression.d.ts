declare module 'compression' {
  import type { RequestHandler } from 'express';

  function compression(options?: Record<string, unknown>): RequestHandler;

  export = compression;
}
