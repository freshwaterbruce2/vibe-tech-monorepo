// Disable Zod v4's JIT validator compiler. Its fast path builds specialized
// validators with `new Function`, which the packaged app's strict CSP
// (`script-src 'self'`, no 'unsafe-eval') blocks. With `jitless`, Zod uses the
// standard parse path instead — identical results, only slower validation.
//
// This module is imported FIRST in main.tsx (before App and any module that
// constructs Zod schemas at import time) so the config is in effect before the
// JIT path can run. Note: Zod still runs a one-time `allowsEval()` probe
// (`new Function("")`) at load, so a single CSP warning may still be logged
// upstream — see colinhacks/zod#5789 — but no validation uses eval after this.
import { z } from 'zod';

z.config({ jitless: true });
