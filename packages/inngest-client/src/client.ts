import { EventSchemas, Inngest } from 'inngest';
import type { Events } from './events.js';

/**
 * Shared Inngest client for the VibeTech monorepo.
 *
 * Import this from any app that needs to send events or define functions:
 *
 *   import { inngest } from '@vibetech/inngest-client';
 *
 *   // Send an event
 *   await inngest.send({ name: 'rag/index.requested', data: { ... } });
 *
 *   // Define a function
 *   export const myFn = inngest.createFunction(
 *     { id: 'my-fn' },
 *     { event: 'rag/index.requested' },
 *     async ({ event, step }) => { ... }
 *   );
 */
export const inngest = new Inngest({
  id: 'vibetech',
  schemas: new EventSchemas().fromRecord<Events>(),
});

export type VibetechInngest = typeof inngest;
