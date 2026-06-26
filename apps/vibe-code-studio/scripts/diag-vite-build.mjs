// Diagnostic: run vite build via JS API, logging each module id with an
// UNBUFFERED synchronous write so the last id before a native abort is captured.
// Temporary throwaway script — delete after diagnosis.
import fs from 'node:fs';

const LOG = 'D:\\logs\\vcs-module-trace.log';
fs.writeFileSync(LOG, '');
const fd = fs.openSync(LOG, 'a');
const trace = (msg) => { fs.writeSync(fd, msg + '\n'); };

process.on('uncaughtException', (e) => { trace('UNCAUGHT: ' + (e?.stack || e)); process.exit(2); });
process.on('unhandledRejection', (e) => { trace('UNHANDLED: ' + (e?.stack || e)); process.exit(3); });

const tracePlugin = {
  name: 'diag-module-trace',
  enforce: 'post',
  load(id) { trace('LOAD ' + id); return null; },
  transform(code, id) { trace('XFRM(' + code.length + ') ' + id); return null; },
  moduleParsed(info) { trace('PARSED ' + info.id); },
};

const { build } = await import('vite');

try {
  trace('DIAG: starting build()');
  await build({ root: process.cwd(), logLevel: 'warn', plugins: [tracePlugin] });
  trace('DIAG: build resolved OK');
  console.error('BUILD OK');
} catch (e) {
  trace('CAUGHT: ' + (e?.stack || e));
  console.error('CAUGHT BUILD ERROR:', e?.stack || e);
  process.exit(1);
}
