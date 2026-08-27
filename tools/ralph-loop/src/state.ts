import { readdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import type { LoopSpec, TaskEntry, TaskPlan } from './types.js';

const taskEntrySchema = z.object({
  id: z.string(),
  description: z.string(),
  status: z.enum(['pending', 'in_progress', 'done', 'blocked']),
});

const taskPlanSchema = z.object({
  phase: z.string(),
  tasks: z.array(taskEntrySchema),
  context: z.record(z.string(), z.unknown()),
  done: z.boolean(),
});

/**
 * Loads immutable specs from the specs directory.
 * Only files matching *.md are read; subdirectories are ignored.
 */
export async function loadSpecs(specsDir: string): Promise<LoopSpec[]> {
  const entries = await readdir(specsDir, { withFileTypes: true });
  const specs: LoopSpec[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) {
      continue;
    }

    const filePath = `${specsDir}/${entry.name}`;
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const objective =
      lines
        .find((line) => line.startsWith('# '))
        ?.slice(2)
        .trim() ?? entry.name;

    specs.push({
      id: entry.name.replace(/\.md$/, ''),
      objective,
      content,
      path: filePath,
    });
  }

  return specs;
}

/**
 * Reads the mutable task plan from disk, or returns a default plan if missing.
 */
export async function loadTaskPlan(taskPlanPath: string): Promise<TaskPlan> {
  try {
    const raw = await readFile(taskPlanPath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    return taskPlanSchema.parse(parsed);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return createDefaultTaskPlan();
    }
    throw error;
  }
}

export function createDefaultTaskPlan(): TaskPlan {
  return {
    phase: 'orient',
    tasks: [],
    context: {},
    done: false,
  };
}

/**
 * Atomically writes the task plan to disk as JSON with a trailing newline.
 */
export async function saveTaskPlan(taskPlanPath: string, taskPlan: TaskPlan): Promise<void> {
  const serialized = `${JSON.stringify(taskPlan, null, 2)}\n`;
  await writeFile(taskPlanPath, serialized, 'utf-8');
}

/**
 * Appends a single log entry to the progress file.
 */
export async function appendProgress(progressPath: string, entry: string): Promise<void> {
  const line = `[${new Date().toISOString()}] ${entry}\n`;
  await writeFile(progressPath, line, { encoding: 'utf-8', flag: 'a' });
}

/**
 * Loads all progress entries from disk for provider context.
 */
export async function loadProgress(progressPath: string): Promise<string[]> {
  try {
    const content = await readFile(progressPath, 'utf-8');
    return content
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Validates that specs files have not been mutated since loop start.
 * Throws if any spec content differs.
 */
export async function assertSpecsImmutable(originalSpecs: LoopSpec[]): Promise<void> {
  for (const original of originalSpecs) {
    const current = await readFile(original.path, 'utf-8');
    if (current !== original.content) {
      throw new Error(`Spec ${original.id} was mutated during loop run. Keep specs immutable.`);
    }
  }
}

/**
 * Converts a config value to an absolute path string.
 */
export function resolvePath(value: string | URL): string {
  if (value instanceof URL) {
    return value.pathname;
  }
  if (value.startsWith('file:')) {
    return pathToFileURL(value).pathname;
  }
  return value;
}

export type { TaskEntry, TaskPlan };
