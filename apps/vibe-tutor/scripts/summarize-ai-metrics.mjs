import { readFile } from 'node:fs/promises';
import { summarizeMetricEvents } from '../render-backend/metrics.mjs';

const path = process.argv[2];
if (!path || process.argv.length !== 3) {
  process.stderr.write('Usage: node scripts/summarize-ai-metrics.mjs <sanitized-jsonl-path>\n');
  process.exitCode = 2;
} else {
  try {
    const lines = (await readFile(path, 'utf8')).split(/\r?\n/).filter(Boolean);
    const events = lines.map((line) => { try { return JSON.parse(line); } catch { return null; } });
    process.stdout.write(`${JSON.stringify(summarizeMetricEvents(events))}\n`);
  } catch {
    process.stderr.write('Unable to read sanitized metrics input.\n');
    process.exitCode = 1;
  }
}
