/**
 * 5-Second Chunk Sync System
 *
 * Splits scripts into timed segments and aligns audio with visuals.
 * Outputs a sync table for CapCut / Premiere import.
 * This is "The Sync Trick" — bypasses token limits via chunked processing.
 */

import type { AudioAsset, GeneratedScript, ScriptSegment, SyncEntry, VisualAsset } from '../types';

const CHUNK_DURATION_SECONDS = 5;
const VIDEO_FINAL_DIR = 'D:\\avge\\assets\\video_final';

/**
 * Split a full script into 5-second segments.
 */
export function splitIntoChunks(fullText: string, totalDurationSeconds: number): ScriptSegment[] {
  const words = fullText.split(/\s+/);
  const wordsPerSecond = words.length / totalDurationSeconds;
  const wordsPerChunk = Math.ceil(wordsPerSecond * CHUNK_DURATION_SECONDS);

  const segments: ScriptSegment[] = [];
  let wordIndex = 0;
  let segmentIndex = 0;

  while (wordIndex < words.length) {
    const chunkWords = words.slice(wordIndex, wordIndex + wordsPerChunk);
    const text = chunkWords.join(' ');

    segments.push({
      index: segmentIndex,
      startSeconds: segmentIndex * CHUNK_DURATION_SECONDS,
      endSeconds: Math.min((segmentIndex + 1) * CHUNK_DURATION_SECONDS, totalDurationSeconds),
      text,
      visualPrompt: deriveVisualPrompt(text),
      mood: deriveMood(text),
    });

    wordIndex += wordsPerChunk;
    segmentIndex++;
  }

  return segments;
}

/**
 * Build the master sync table aligning script → audio → visuals.
 */
export function buildSyncTable(
  script: GeneratedScript,
  audioAssets: AudioAsset[],
  visualAssets: VisualAsset[],
): SyncEntry[] {
  return script.segments.map((segment, i) => ({
    segmentIndex: segment.index,
    startSeconds: segment.startSeconds,
    endSeconds: segment.endSeconds,
    scriptLine: segment.text,
    visualPrompt: segment.visualPrompt,
    visualPath: visualAssets[i]?.filePath ?? '',
    audioPath: audioAssets[i]?.filePath ?? audioAssets[0]?.filePath ?? '',
  }));
}

/**
 * Export sync table as CSV for CapCut / Premiere import.
 */
export function syncTableToCSV(syncTable: SyncEntry[]): string {
  const headers = [
    'Segment',
    'Start (s)',
    'End (s)',
    'Script Line',
    'Visual Prompt',
    'Visual File',
    'Audio File',
  ];

  const rows = syncTable.map((entry) => [
    entry.segmentIndex.toString(),
    entry.startSeconds.toFixed(1),
    entry.endSeconds.toFixed(1),
    `"${entry.scriptLine.replace(/"/g, '""')}"`,
    `"${entry.visualPrompt.replace(/"/g, '""')}"`,
    entry.visualPath,
    entry.audioPath,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Export sync table as JSON for programmatic consumption.
 */
export function syncTableToJSON(syncTable: SyncEntry[]): string {
  return JSON.stringify(syncTable, null, 2);
}

/**
 * Derive a visual prompt from a script line.
 * Uses keyword extraction to suggest imagery.
 */
function deriveVisualPrompt(text: string): string {
  // Simple keyword-based prompt derivation
  // Phase 3: Replace with LLM-powered prompt generation
  const keywords = text
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .slice(0, 5);

  if (keywords.length === 0) return 'Abstract professional background';
  return `Scene depicting: ${keywords.join(', ')}`;
}

/**
 * Derive mood from script text for visual style adjustment.
 */
function deriveMood(text: string): string {
  const lowerText = text.toLowerCase();
  if (/danger|risk|warn|fail|crash|lose/i.test(lowerText)) return 'tense';
  if (/success|win|grow|achieve|rich/i.test(lowerText)) return 'triumphant';
  if (/secret|hidden|reveal|truth/i.test(lowerText)) return 'mysterious';
  if (/data|study|research|percent/i.test(lowerText)) return 'analytical';
  return 'neutral';
}

export { CHUNK_DURATION_SECONDS, VIDEO_FINAL_DIR };
