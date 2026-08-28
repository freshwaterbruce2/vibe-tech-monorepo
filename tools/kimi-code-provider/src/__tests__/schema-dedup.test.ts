import { describe, expect, it } from 'vitest';
import { deduplicateToolSchemas, KIMI_MAX_SCHEMA_BYTES } from '../schema-dedup.js';

describe('deduplicateToolSchemas', () => {
  it('returns identical schemas unchanged when no deduplication possible', () => {
    const tools = [
      {
        name: 'simple',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        },
      },
    ];

    const result = deduplicateToolSchemas(tools);
    expect(result[0].parameters.type).toBe('object');
  });

  it('deduplicates repeated object shapes into $defs', () => {
    const addressSchema = {
      type: 'object',
      properties: {
        street: { type: 'string' },
        city: { type: 'string' },
      },
    };

    const tools = [
      {
        name: 'createUser',
        parameters: {
          type: 'object',
          properties: {
            home: addressSchema,
            work: addressSchema,
          },
        },
      },
    ];

    const result = deduplicateToolSchemas(tools);
    const params = result[0].parameters;
    expect(params.$defs).toBeDefined();
    expect(params.properties?.home).toEqual({ $ref: '#/$defs/Def_1' });
    expect(params.properties?.work).toEqual({ $ref: '#/$defs/Def_1' });
  });

  it('throws when a single schema exceeds the 15 KB limit', () => {
    const bigProperty = 'x'.repeat(KIMI_MAX_SCHEMA_BYTES + 100);
    const tools = [
      {
        name: 'huge',
        parameters: {
          type: 'object',
          properties: {
            payload: { type: 'string', description: bigProperty },
          },
        },
      },
    ];

    expect(() => deduplicateToolSchemas(tools)).toThrow('exceeds 15360 bytes after deduplication');
  });
});
