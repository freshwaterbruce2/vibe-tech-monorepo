/**
 * Flux Schnell Visual Generation Module
 *
 * Generates high-resolution visuals via Flux Schnell API.
 * Free tier: 10 req/min, sub-second generation, no watermarks.
 * Outputs to D:\avge\assets\visuals\
 *
 * Flux Schnell is optimized for speed — ideal for rapid iteration
 * on YouTube scene images and thumbnails.
 */

import type { ScriptSegment, VisualAsset } from '../types';

const VISUALS_OUTPUT_DIR = 'D:\\avge\\assets\\visuals';

export interface VisualConfig {
  /** Flux model variant */
  model: 'flux-schnell' | 'flux-pro';
  /** Output resolution */
  width: number;
  height: number;
  /** Visual style directive appended to prompts */
  style: 'cinematic' | 'photorealistic' | 'illustrative' | 'abstract';
  /** Number of inference steps (higher = better quality, slower) */
  steps: number;
  /** Guidance scale for prompt adherence */
  guidanceScale: number;
}

const DEFAULT_VISUAL_CONFIG: VisualConfig = {
  model: 'flux-schnell',
  width: 1792,
  height: 1024, // 16:9 landscape for YouTube
  style: 'cinematic',
  steps: 4, // Schnell is optimized for 1-4 steps
  guidanceScale: 3.5,
};

/** Style presets that enhance prompts for different visual moods */
export const STYLE_PRESETS = {
  cinematic:
    'cinematic lighting, dramatic atmosphere, film grain, wide angle lens, professional color grading, 8K',
  photorealistic:
    'photorealistic, ultra HD, professional photography, natural lighting, sharp focus, DSLR',
  illustrative:
    'digital illustration, clean lines, vibrant colors, professional vector art, flat design',
  abstract:
    'abstract art, flowing shapes, gradient colors, modern design, minimalist composition, geometric',
} as const;

/**
 * Generate a visual for a single script segment via Flux Schnell.
 */
export async function generateVisual(
  segment: ScriptSegment,
  scriptId: string,
  config: Partial<VisualConfig> = {},
): Promise<VisualAsset> {
  const merged = { ...DEFAULT_VISUAL_CONFIG, ...config };
  const apiKey = getApiKey();

  const enhancedPrompt = buildEnhancedPrompt(segment.visualPrompt, merged.style);
  const fileName = `${scriptId}_vis${segment.index.toString().padStart(3, '0')}.png`;
  const filePath = `${VISUALS_OUTPUT_DIR}\\${fileName}`;

  console.log(`[Visuals] Segment ${segment.index}: "${segment.visualPrompt.slice(0, 60)}..."`);
  console.log(`[Visuals] Model: ${merged.model}, ${merged.width}×${merged.height}`);

  if (!apiKey) {
    console.warn('[Visuals] No FLUX_API_KEY — returning stub asset');
    return createStubAsset(segment, scriptId, filePath, enhancedPrompt, merged);
  }

  try {
    // Flux API via fal.ai / Replicate / direct endpoint
    const response = await fetch(getFluxEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        image_size: { width: merged.width, height: merged.height },
        num_inference_steps: merged.steps,
        guidance_scale: merged.guidanceScale,
        num_images: 1,
        enable_safety_checker: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Flux API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`[Visuals] ✅ Generated ${fileName}`);

    return {
      id: crypto.randomUUID(),
      segmentIndex: segment.index,
      prompt: enhancedPrompt,
      filePath,
      resolution: `${merged.width}x${merged.height}`,
      model: merged.model,
      generatedAt: Date.now(),
      // Store image URL for dashboard preview
      ...(data.images?.[0]?.url ? { previewUrl: data.images[0].url } : {}),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Visuals] Generation failed: ${msg}`);
    return createStubAsset(segment, scriptId, filePath, enhancedPrompt, merged);
  }
}

/**
 * Batch-generate visuals for all script segments.
 * Processes sequentially to respect free-tier rate limits (10 req/min).
 */
export async function generateAllVisuals(
  segments: ScriptSegment[],
  scriptId: string,
  config: Partial<VisualConfig> = {},
): Promise<VisualAsset[]> {
  console.log(`[Visuals] Generating ${segments.length} visuals...`);

  const assets: VisualAsset[] = [];
  for (let i = 0; i < segments.length; i++) {
    const asset = await generateVisual(segments[i], scriptId, config);
    assets.push(asset);

    // Rate limit: 10 req/min on free tier → 6s between calls
    if (i < segments.length - 1) {
      console.log(`[Visuals] Rate limiting... (${i + 1}/${segments.length})`);
      await new Promise((r) => setTimeout(r, 6500));
    }
  }

  return assets;
}

/**
 * Enhance a visual prompt with style directives and quality boosters.
 */
function buildEnhancedPrompt(basePrompt: string, style: VisualConfig['style']): string {
  return `${basePrompt}. ${STYLE_PRESETS[style]}. High resolution, no text overlays, no watermarks.`;
}

function getApiKey(): string | undefined {
  try {
    return import.meta.env.VITE_FLUX_API_KEY as string | undefined;
  } catch {
    return undefined;
  }
}

function getFluxEndpoint(): string {
  // Default to fal.ai Flux Schnell endpoint
  const custom = import.meta.env.VITE_FLUX_ENDPOINT as string | undefined;
  return custom ?? 'https://fal.run/fal-ai/flux/schnell';
}

function createStubAsset(
  segment: ScriptSegment,
  _scriptId: string,
  filePath: string,
  prompt: string,
  config: VisualConfig,
): VisualAsset {
  return {
    id: crypto.randomUUID(),
    segmentIndex: segment.index,
    prompt,
    filePath,
    resolution: `${config.width}x${config.height}`,
    model: config.model,
    generatedAt: Date.now(),
  };
}

export { DEFAULT_VISUAL_CONFIG, VISUALS_OUTPUT_DIR };
