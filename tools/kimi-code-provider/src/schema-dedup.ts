import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';

const KIMI_MAX_SCHEMA_BYTES = 15 * 1024;

interface ToolDefinition {
  name: string;
  description?: string;
  parameters: JSONSchema7;
}

interface SchemaCollectionResult {
  schema: JSONSchema7;
  definitions: Record<string, JSONSchema7>;
}

/**
 * Extracts reusable subschemas into $defs and replaces inline occurrences
 * with $ref pointers. This reduces per-tool schema size for providers like
 * Kimi K2.7 Code that enforce a strict 15 KB limit per tool schema.
 */
export function deduplicateToolSchemas(tools: ToolDefinition[]): ToolDefinition[] {
  return tools.map((tool) => {
    const { schema, definitions } = collectDefinitionsForSchema(tool.parameters);

    const parameters: JSONSchema7 =
      Object.keys(definitions).length > 0
        ? { ...schema, $defs: { ...definitions, ...schema.$defs } }
        : schema;

    const size = Buffer.byteLength(JSON.stringify(parameters), 'utf8');
    if (size > KIMI_MAX_SCHEMA_BYTES) {
      throw new Error(
        `Tool schema "${tool.name}" exceeds ${KIMI_MAX_SCHEMA_BYTES} bytes after deduplication (${size} bytes)`,
      );
    }

    return { ...tool, parameters };
  });
}

function collectDefinitionsForSchema(rootSchema: JSONSchema7): SchemaCollectionResult {
  const definitions: Record<string, JSONSchema7> = {};
  const definitionIndex = new Map<string, string>();

  const collect = (schema: JSONSchema7Definition, isRoot: boolean): JSONSchema7Definition => {
    if (typeof schema === 'boolean' || schema.$ref !== undefined) {
      return schema;
    }

    if (shouldHoist(schema, isRoot)) {
      return hoistSchema(schema, definitions, definitionIndex);
    }

    return rebuildSchema(schema, collect);
  };

  const schema = collect(rootSchema, true) as JSONSchema7;
  return { schema, definitions };
}

function shouldHoist(schema: JSONSchema7, isRoot: boolean): boolean {
  return (
    !isRoot &&
    schema.type === 'object' &&
    schema.properties !== undefined &&
    schema.$defs === undefined &&
    schema.additionalProperties === undefined
  );
}

function hoistSchema(
  schema: JSONSchema7,
  definitions: Record<string, JSONSchema7>,
  definitionIndex: Map<string, string>,
): JSONSchema7Definition {
  const key = normalizeSchema(schema);
  const existing = definitionIndex.get(key);
  if (existing !== undefined) {
    return { $ref: `#/$defs/${existing}` };
  }

  const name = `Def_${definitionIndex.size + 1}`;
  definitionIndex.set(key, name);
  definitions[name] = schema;
  return { $ref: `#/$defs/${name}` };
}

function rebuildSchema(
  schema: JSONSchema7,
  collect: (schema: JSONSchema7Definition, isRoot: boolean) => JSONSchema7Definition,
): JSONSchema7 {
  const result: JSONSchema7 = { ...schema };

  if (schema.properties !== undefined) {
    result.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([k, v]) => [k, collect(v, false)]),
    );
  }

  if (schema.items !== undefined) {
    result.items = Array.isArray(schema.items)
      ? schema.items.map((item) => collect(item, false))
      : collect(schema.items, false);
  }

  if (schema.allOf !== undefined) {
    result.allOf = schema.allOf.map((item) => collect(item, false));
  }
  if (schema.anyOf !== undefined) {
    result.anyOf = schema.anyOf.map((item) => collect(item, false));
  }
  if (schema.oneOf !== undefined) {
    result.oneOf = schema.oneOf.map((item) => collect(item, false));
  }

  return result;
}

function normalizeSchema(schema: JSONSchema7Definition): string {
  if (typeof schema === 'boolean') {
    return JSON.stringify(schema);
  }
  return JSON.stringify(sortKeys(schema));
}

function sortKeys<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(sortKeys) as T;
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
    return Object.fromEntries(entries.map(([k, v]) => [k, sortKeys(v)])) as T;
  }
  return value;
}

export type { ToolDefinition };
export { KIMI_MAX_SCHEMA_BYTES };
