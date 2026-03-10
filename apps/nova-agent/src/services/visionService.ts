/**
 * Vision Analysis Service
 *
 * Provides screenshot analysis using Kimi K2.5 via Moonshot API.
 * Supports multimodal input (image + text) for UI analysis, debugging, and extraction.
 */

import { analyzeImage, type KimiChatOptions } from './moonshot';

export interface VisionAnalysisOptions {
  prompt?: string;
  thinking?: boolean;
  maxTokens?: number;
}

export interface VisionAnalysisResult {
  analysis: string;
  timestamp: number;
  model: string;
}

/**
 * Read image file and convert to base64
 */
async function readImageAsBase64(imagePath: string): Promise<string> {
  const { readFile } = await import('@tauri-apps/plugin-fs');
  const imageData = await readFile(imagePath);

  // Convert Uint8Array to base64
  const base64 = btoa(
    Array.from(imageData)
      .map((byte) => String.fromCharCode(byte))
      .join(''),
  );

  return base64;
}

/**
 * Determine MIME type from file extension
 */
function getMimeType(imagePath: string): string {
  const ext = imagePath.split('.').pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
  };

  return mimeTypes[ext ?? 'png'] ?? 'image/png';
}

/**
 * Analyze a screenshot using Kimi K2.5 vision capabilities
 *
 * @param imagePath - Absolute path to the screenshot file
 * @param options - Analysis options
 * @returns Analysis result with extracted insights
 */
export async function analyzeScreenshot(
  imagePath: string,
  options: VisionAnalysisOptions = {},
): Promise<VisionAnalysisResult> {
  const {
    prompt = 'Analyze this screenshot. Describe what you see, identify any UI elements, text, or issues.',
    thinking = false,
    maxTokens = 4096,
  } = options;

  // Read image and convert to base64 data URL
  const base64Image = await readImageAsBase64(imagePath);
  const mimeType = getMimeType(imagePath);
  const dataUrl = `data:${mimeType};base64,${base64Image}`;

  // Call Kimi K2.5 with vision
  const kimiOptions: KimiChatOptions = {
    thinking,
    maxTokens,
  };

  const analysis = await analyzeImage(dataUrl, prompt, kimiOptions);

  return {
    analysis,
    timestamp: Date.now(),
    model: 'kimi-k2.5',
  };
}

/**
 * Analyze screenshot for specific purpose (UI debugging, accessibility, design review)
 */
export async function analyzeScreenshotWithContext(
  imagePath: string,
  context: 'ui-debug' | 'accessibility' | 'design-review',
  customPrompt?: string,
): Promise<VisionAnalysisResult> {
  const prompts = {
    'ui-debug':
      customPrompt ??
      'Analyze this UI screenshot for potential bugs, layout issues, alignment problems, or visual inconsistencies. ' +
        'Identify any elements that appear broken or incorrectly rendered.',

    accessibility:
      customPrompt ??
      'Review this screenshot for accessibility issues. Check for: ' +
        '- Sufficient color contrast\n' +
        '- Text readability\n' +
        '- Clickable element sizes\n' +
        '- Missing labels or alt text indicators\n' +
        'Provide actionable recommendations.',

    'design-review':
      customPrompt ??
      'Perform a design review of this screenshot. Evaluate: ' +
        '- Visual hierarchy\n' +
        '- Spacing and alignment\n' +
        '- Typography consistency\n' +
        '- Color scheme\n' +
        '- Overall aesthetic quality\n' +
        'Suggest improvements.',
  };

  return analyzeScreenshot(imagePath, {
    prompt: prompts[context],
    thinking: true, // Use thinking for thorough analysis
  });
}

/**
 * Extract text from screenshot using OCR-like capabilities
 */
export async function extractTextFromScreenshot(imagePath: string): Promise<string> {
  const result = await analyzeScreenshot(imagePath, {
    prompt:
      'Extract all visible text from this screenshot. ' +
      'Provide the text in the order it appears, preserving structure where possible.',
  });

  return result.analysis;
}

/**
 * Compare two screenshots and identify differences
 */
export async function compareScreenshots(
  beforePath: string,
  afterPath: string,
): Promise<VisionAnalysisResult> {
  // Read both images
  const beforeBase64 = await readImageAsBase64(beforePath);
  const afterBase64 = await readImageAsBase64(afterPath);

  const beforeMime = getMimeType(beforePath);
  const afterMime = getMimeType(afterPath);

  // Create combined prompt with both images described
  // Note: Kimi K2.5 handles single image per request, so we'll analyze sequentially
  const beforeDataUrl = `data:${beforeMime};base64,${beforeBase64}`;
  const afterDataUrl = `data:${afterMime};base64,${afterBase64}`;

  // Analyze BEFORE
  const beforeAnalysis = await analyzeImage(
    beforeDataUrl,
    'Describe this UI screenshot in detail. Note all visible elements, text, layout, and styling.',
    { thinking: false },
  );

  // Analyze AFTER with context of BEFORE
  const comparison = await analyzeImage(
    afterDataUrl,
    `Compare this screenshot to the previous state described below and identify all differences:\n\nPREVIOUS STATE:\n${beforeAnalysis}\n\nList all visual differences, changes in layout, text modifications, or any other variations.`,
    { thinking: true },
  );

  return {
    analysis: comparison,
    timestamp: Date.now(),
    model: 'kimi-k2.5',
  };
}
