/**
 * BLAST Pipeline Orchestrator
 *
 * State machine that drives the full pipeline:
 * Blueprint → Link → Architect → Style → Trigger
 *
 * Each stage delegates to real service modules.
 * Emits events for dashboard UI updates.
 */

import type {
  AudioAsset,
  BlastStage,
  GeneratedScript,
  NotebookProject,
  PipelineRun,
  StageStatus,
  SyncEntry,
  VisualAsset,
} from '../types';

import { extract3MHooks } from './analysis';
import { synthesizeAudio } from './audio';
import { buildProject, ingestText, queryNotebook } from './notebook';
import { buildSyncTable, splitIntoChunks } from './sync';
import { generateAllVisuals } from './visuals';

const BLAST_STAGES: { id: BlastStage; label: string }[] = [
  { id: 'BLUEPRINT', label: 'Blueprint' },
  { id: 'LINK', label: 'Link' },
  { id: 'ARCHITECT', label: 'Architect' },
  { id: 'STYLE', label: 'Style' },
  { id: 'TRIGGER', label: 'Trigger' },
];

export type PipelineEvent =
  | { type: 'STAGE_START'; stage: BlastStage }
  | { type: 'STAGE_COMPLETE'; stage: BlastStage }
  | { type: 'STAGE_ERROR'; stage: BlastStage; error: string }
  | { type: 'PIPELINE_COMPLETE'; run: PipelineRun }
  | { type: 'PIPELINE_FAILED'; run: PipelineRun; error: string };

export type PipelineEventHandler = (event: PipelineEvent) => void;

export interface PipelineConfig {
  projectTitle: string;
  sourceUrls: string[];
  brainContext: string;
  onEvent?: PipelineEventHandler;
}

export interface PipelineResult {
  run: PipelineRun;
  notebook?: NotebookProject;
  script?: GeneratedScript;
  audio?: AudioAsset;
  visuals?: VisualAsset[];
  syncTable?: SyncEntry[];
}

function createInitialRun(projectId: string): PipelineRun {
  return {
    id: crypto.randomUUID(),
    projectId,
    stages: BLAST_STAGES.map((s) => ({
      id: s.id,
      label: s.label,
      status: 'idle' as StageStatus,
    })),
    currentStage: null,
    status: 'idle',
    createdAt: Date.now(),
  };
}

function updateStage(
  run: PipelineRun,
  stageId: BlastStage,
  status: StageStatus,
  error?: string,
): PipelineRun {
  return {
    ...run,
    stages: run.stages.map((s) =>
      s.id === stageId
        ? {
            ...s,
            status,
            ...(status === 'running' ? { startedAt: Date.now() } : {}),
            ...(status === 'success' || status === 'error' ? { completedAt: Date.now() } : {}),
            ...(error ? { error } : {}),
          }
        : s,
    ),
    currentStage: status === 'running' ? stageId : run.currentStage,
  };
}

/**
 * Execute the full BLAST pipeline.
 */
export async function executePipeline(config: PipelineConfig): Promise<PipelineResult> {
  const run = createInitialRun(config.projectTitle);
  const result: PipelineResult = {
    run: { ...run, status: 'running' },
  };

  const emit = config.onEvent ?? (() => {});

  for (const stage of BLAST_STAGES) {
    try {
      emit({ type: 'STAGE_START', stage: stage.id });
      result.run = updateStage(result.run, stage.id, 'running');

      await executeStage(stage.id, config, result);

      result.run = updateStage(result.run, stage.id, 'success');
      emit({ type: 'STAGE_COMPLETE', stage: stage.id });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      result.run = updateStage(result.run, stage.id, 'error', errorMsg);
      result.run.status = 'failed';
      emit({ type: 'PIPELINE_FAILED', run: result.run, error: errorMsg });
      return result;
    }
  }

  result.run.status = 'completed';
  result.run.completedAt = Date.now();
  emit({ type: 'PIPELINE_COMPLETE', run: result.run });

  return result;
}

/**
 * Execute a single BLAST stage with real service calls.
 */
async function executeStage(
  stage: BlastStage,
  config: PipelineConfig,
  result: PipelineResult,
): Promise<void> {
  switch (stage) {
    case 'BLUEPRINT': {
      // Create NotebookLM project and ingest all sources + brain.md
      console.log('[BLAST] Blueprint: Creating notebook and ingesting sources...');
      const notebook = await buildProject(
        config.projectTitle,
        config.sourceUrls,
        config.brainContext,
      );
      result.notebook = notebook;

      // Also ingest brain context as grounding material
      if (config.brainContext && notebook.notebookId) {
        await ingestText(notebook.notebookId, config.brainContext, 'Brand Context');
      }
      break;
    }

    case 'LINK': {
      // Extract 3M Hook patterns from notebook sources
      console.log('[BLAST] Link: Extracting 3M Hook patterns...');
      if (!result.notebook) throw new Error('No notebook from BLUEPRINT stage');

      const hookAnalysis = await extract3MHooks(result.notebook.notebookId);
      // Store for ARCHITECT stage
      result.script = {
        id: crypto.randomUUID(),
        title: config.projectTitle,
        durationMinutes: 0,
        segments: [],
        fullText: '',
        hookAnalysis,
      };
      break;
    }

    case 'ARCHITECT': {
      // Synthesize script from hook analysis
      console.log('[BLAST] Architect: Synthesizing script from intelligence...');
      if (!result.notebook || !result.script) {
        throw new Error('Missing notebook or hook analysis from prior stages');
      }

      const scriptResponse = await queryNotebook(
        result.notebook.notebookId,
        buildScriptPrompt(result.script.hookAnalysis),
      );

      // Parse the generated script into 5-second segments
      // Estimate ~150 words/min narration rate for duration calc
      const wordCount = scriptResponse.answer.split(/\s+/).length;
      const estimatedDuration = Math.ceil((wordCount / 150) * 60);
      const segments = splitIntoChunks(scriptResponse.answer, estimatedDuration);
      result.script = {
        ...result.script,
        fullText: scriptResponse.answer,
        segments,
        durationMinutes: Math.ceil(estimatedDuration / 60),
      };
      break;
    }

    case 'STYLE': {
      // Generate audio + visuals in parallel
      console.log('[BLAST] Style: Generating audio and visuals...');
      if (!result.script) throw new Error('No script from ARCHITECT stage');

      const [audio, visuals] = await Promise.all([
        synthesizeAudio(result.script),
        generateAllVisuals(result.script.segments, result.script.id),
      ]);

      result.audio = audio;
      result.visuals = visuals;
      break;
    }

    case 'TRIGGER': {
      // Build sync table and export
      console.log('[BLAST] Trigger: Building sync table and exporting...');
      if (!result.script || !result.visuals || !result.audio) {
        throw new Error('Missing script, visuals, or audio from STYLE stage');
      }

      result.syncTable = buildSyncTable(result.script, [result.audio], result.visuals);

      console.log(`[BLAST] ✅ Sync table: ${result.syncTable.length} entries`);
      break;
    }
  }
}

/**
 * Build the script generation prompt from hook analysis.
 */
function buildScriptPrompt(hookAnalysis: {
  hooks: unknown[];
  structures: unknown[];
  anxietyPoints: unknown[];
}): string {
  return `Based on the source analysis, generate a compelling YouTube video script.

Use these discovered patterns:
- ${hookAnalysis.hooks.length} hook patterns identified
- ${hookAnalysis.structures.length} story structures found
- ${hookAnalysis.anxietyPoints.length} anxiety triggers available

Requirements:
1. Open with the strongest hook from the analysis
2. Follow the most effective story structure
3. Layer anxiety triggers at key retention points
4. Include visual direction for each segment (describe what the viewer should see)
5. Target 8-12 minutes total length
6. Write in a direct, authoritative voice

Format each segment as:
[SEGMENT N | START-END seconds]
NARRATION: <script text>
VISUAL: <visual direction>
MOOD: <emotional tone>`;
}

export { BLAST_STAGES };
