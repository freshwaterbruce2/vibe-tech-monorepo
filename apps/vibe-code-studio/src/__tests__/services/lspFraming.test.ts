import { describe, it, expect, vi } from 'vitest';

import { createFramer, encodeMessage } from '../../../scripts/lib/lsp-framing.js';

describe('encodeMessage', () => {
  it('frames an object with a byte-accurate Content-Length header', () => {
    const wire = encodeMessage({ jsonrpc: '2.0', id: 1 });
    expect(wire).toBe('Content-Length: 24\r\n\r\n{"jsonrpc":"2.0","id":1}');
  });

  it('accepts a pre-serialized string and counts UTF-8 bytes, not chars', () => {
    const json = '{"m":"café"}'; // 'é' is 2 bytes → 13 bytes, 12 chars
    const wire = encodeMessage(json);
    expect(wire).toBe(`Content-Length: 13\r\n\r\n${json}`);
  });
});

describe('createFramer', () => {
  it('emits one complete message body', () => {
    const seen: string[] = [];
    const framer = createFramer(body => seen.push(body));
    framer.push(encodeMessage({ a: 1 }));
    expect(seen).toEqual(['{"a":1}']);
  });

  it('reassembles a message split across chunks', () => {
    const seen: string[] = [];
    const framer = createFramer(body => seen.push(body));
    const wire = encodeMessage({ hello: 'world' });
    framer.push(wire.slice(0, 10));
    framer.push(wire.slice(10, 20));
    framer.push(wire.slice(20));
    expect(seen).toEqual(['{"hello":"world"}']);
  });

  it('emits multiple messages from a single concatenated chunk', () => {
    const seen: string[] = [];
    const framer = createFramer(body => seen.push(body));
    framer.push(encodeMessage({ n: 1 }) + encodeMessage({ n: 2 }));
    expect(seen).toEqual(['{"n":1}', '{"n":2}']);
  });

  it('is byte-correct for multi-byte UTF-8 payloads', () => {
    const seen: string[] = [];
    const framer = createFramer(body => seen.push(body));
    const payload = { msg: 'café 日本' };
    // Feed as a real Buffer so byte vs char boundaries actually differ.
    framer.push(Buffer.from(encodeMessage(payload), 'utf8'));
    expect(JSON.parse(seen[0]!)).toEqual(payload);
  });

  it('drops a garbage header and resyncs to the next framed message', () => {
    const seen: string[] = [];
    const framer = createFramer(body => seen.push(body));
    framer.push('NotAHeader\r\n\r\n' + encodeMessage({ ok: true }));
    expect(seen).toEqual(['{"ok":true}']);
  });

  it('waits for the full body before emitting', () => {
    const onMessage = vi.fn();
    const framer = createFramer(onMessage);
    framer.push('Content-Length: 20\r\n\r\n{"partial":');
    expect(onMessage).not.toHaveBeenCalled();
  });
});
