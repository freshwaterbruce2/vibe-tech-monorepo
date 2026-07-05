/**
 * artifactContent tests — diff codec round-trip + malformed degradation,
 * task_list checklist line helpers.
 */
import { describe, expect, it } from 'vitest';
import type { FileChange } from '@vibetech/types';
import {
  checkTaskListLine,
  decodeDiffContent,
  decodeScreenshotContent,
  encodeDiffContent,
  encodeScreenshotContent,
  taskListLine,
} from '../../../services/artifacts/artifactContent';

const change: FileChange = {
  path: 'src/a.ts',
  originalContent: 'const a = 1;',
  newContent: 'const a = 2;',
  changeType: 'modify',
  reason: 'bump',
};

describe('diff content codec', () => {
  it('round-trips changes and impact', () => {
    const encoded = encodeDiffContent([change], 'high');
    const decoded = decodeDiffContent(encoded);
    expect(decoded?.estimatedImpact).toBe('high');
    expect(decoded?.changes).toEqual([change]);
  });

  it('defaults impact to medium', () => {
    const decoded = decodeDiffContent(encodeDiffContent([change]));
    expect(decoded?.estimatedImpact).toBe('medium');
  });

  it('returns null for non-JSON and schema-invalid content', () => {
    expect(decodeDiffContent('not json')).toBeNull();
    expect(decodeDiffContent('{"changes": [{"path": ""}]}')).toBeNull();
    expect(decodeDiffContent('{"nope": true}')).toBeNull();
  });
});

describe('screenshot content codec (spec 11)', () => {
  const payload = {
    imageDataUrl: 'data:image/png;base64,AAAA',
    capturedAt: new Date(3000).toISOString(),
    description: 'verify the dashboard',
  };

  it('round-trips a screenshot payload', () => {
    expect(decodeScreenshotContent(encodeScreenshotContent(payload))).toEqual(payload);
  });

  it('keeps description optional', () => {
    const { description: _omitted, ...minimal } = payload;
    expect(decodeScreenshotContent(encodeScreenshotContent(minimal))).toEqual(minimal);
  });

  it('returns null for non-JSON and schema-invalid content', () => {
    expect(decodeScreenshotContent('not json')).toBeNull();
    expect(decodeScreenshotContent('{"imageDataUrl": ""}')).toBeNull();
    expect(decodeScreenshotContent('{"capturedAt": "now"}')).toBeNull();
  });
});

describe('task list lines', () => {
  it('renders unchecked and checked lines', () => {
    expect(taskListLine('Do the thing', false)).toBe('- [ ] Do the thing');
    expect(taskListLine('Do the thing', true)).toBe('- [x] Do the thing');
  });

  it('checks the first matching unchecked line only', () => {
    const content = ['- [ ] step one', '- [ ] step two'].join('\n');
    const checked = checkTaskListLine(content, 'step one');
    expect(checked).toContain('- [x] step one');
    expect(checked).toContain('- [ ] step two');
  });

  it('is a no-op when the line is missing or already checked', () => {
    const content = '- [x] step one';
    expect(checkTaskListLine(content, 'step one')).toBe(content);
    expect(checkTaskListLine(content, 'unknown step')).toBe(content);
  });
});
