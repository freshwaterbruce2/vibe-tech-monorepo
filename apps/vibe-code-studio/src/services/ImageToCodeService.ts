/**
 * ImageToCodeService - Screenshot to Code Converter
 *
 * Converts UI screenshots/mockups to clean React code using Claude Vision via OpenRouter.
 * Implements iterative refinement for high-quality results.
 *
 * Based on 2025 best practices:
 * - Claude Sonnet 4.6: vision-capable, accessed via OpenRouter
 * - Iterative refinement: 2-3 passes for accuracy
 * - Puppeteer MCP integration for screenshot comparison
 */
import { logger } from '../services/Logger';

export interface ImageToCodeOptions {
  framework: 'react' | 'html' | 'vue';
  styling: 'tailwind' | 'css' | 'styled-components';
  maxIterations?: number;
  includeComponents?: boolean; // Use shadcn/ui components
  responsive?: boolean;
}

export interface ImageToCodeResult {
  code: string;
  framework: string;
  styling: string;
  iterations: number;
  accuracy?: number;
  screenshots?: {
    original: string;
    rendered: string;
  };
  improvements?: string[];
}

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const VISION_MODEL = 'anthropic/claude-sonnet-4.6';

export class ImageToCodeService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Convert a screenshot/mockup image to clean code
   *
   * @param imageData - Base64 encoded image (with or without data URL prefix)
   * @param options - Conversion options
   * @returns Generated code with metadata
   */
  async convertScreenshotToCode(
    imageData: string,
    options: ImageToCodeOptions = {
      framework: 'react',
      styling: 'tailwind',
      maxIterations: 3,
      includeComponents: true,
      responsive: true,
    }
  ): Promise<ImageToCodeResult> {
    const {
      framework,
      styling,
      maxIterations = 3,
      includeComponents = true,
      responsive = true,
    } = options;

    logger.debug('[ImageToCode] Starting conversion...', { framework, styling });

    // Step 1: Initial code generation from image
    let code = await this.generateInitialCode(
      imageData,
      framework,
      styling,
      includeComponents,
      responsive
    );

    let iterations = 1;
    const improvements: string[] = [];

    logger.debug('[ImageToCode] Initial code generated, length:', code.length);

    // Step 2: Iterative refinement with screenshot comparison
    while (iterations < maxIterations) {
      logger.debug(`[ImageToCode] Starting refinement iteration ${iterations}/${maxIterations}`);

      const renderedScreenshot = await this.renderAndScreenshot(code, framework);

      // If screenshot capture failed, skip refinement
      if (!renderedScreenshot) {
        logger.debug('[ImageToCode] Screenshot capture failed, skipping refinement');
        break;
      }

      const refinedCode = await this.refineCode(
        imageData,
        renderedScreenshot,
        code,
        framework,
        styling
      );

      // Check if code converged (no changes)
      if (refinedCode === code || refinedCode.length < 50) {
        logger.debug('[ImageToCode] Converged after', iterations, 'iterations');
        break;
      }

      improvements.push(`Iteration ${iterations}: Improved layout accuracy, spacing, and colors`);
      code = refinedCode;
      iterations++;
    }

    return {
      code,
      framework,
      styling,
      iterations,
      improvements,
    };
  }

  /**
   * Call OpenRouter chat completions API with vision support
   */
  private async callOpenRouter(messages: object[]): Promise<string> {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://vibe-code-studio.local',
        'X-Title': 'Vibe Code Studio',
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        max_tokens: 8192,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error ${response.status}: ${error}`);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0]?.message?.content ?? '';
  }

  /**
   * Generate initial code from screenshot using Claude Vision via OpenRouter
   */
  private async generateInitialCode(
    imageData: string,
    framework: string,
    styling: string,
    includeComponents: boolean,
    responsive: boolean
  ): Promise<string> {
    const componentLibrary = includeComponents
      ? framework === 'react'
        ? '\n- Use shadcn/ui components where appropriate (Button, Card, Input, etc.)'
        : ''
      : '';

    const responsiveNote = responsive
      ? '\n- Make it fully responsive (mobile, tablet, desktop)'
      : '';

    const stylingInstructions = this.getStylingInstructions(styling, framework);

    const prompt = `Convert this UI design to clean, production-ready ${framework} code.

Requirements:
- Use modern ${framework} ${framework === 'react' ? '19' : ''} best practices
${stylingInstructions}${componentLibrary}${responsiveNote}
- Pixel-perfect layout matching the design
- Clean, maintainable code structure
- Proper component hierarchy
- Semantic HTML
- Accessibility (ARIA labels, keyboard navigation)

Please provide ONLY the code, no explanations. Use proper syntax highlighting.`;

    const mediaType = this.detectImageType(imageData);
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');

    try {
      const text = await this.callOpenRouter([
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mediaType};base64,${base64Data}` },
            },
            { type: 'text', text: prompt },
          ],
        },
      ]);
      return this.extractCode(text);
    } catch (error: any) {
      logger.error('[ImageToCode] Error generating code:', error.message);
      throw new Error(`Failed to generate code: ${error.message}`);
    }
  }

  /**
   * Refine code by comparing rendered output with original
   * (Requires Puppeteer MCP integration)
   */
  private async refineCode(
    originalImage: string,
    renderedImage: string,
    currentCode: string,
    framework: string,
    _styling: string
  ): Promise<string> {
    const originalBase64 = originalImage.replace(/^data:image\/\w+;base64,/, '');
    const renderedBase64 = renderedImage.replace(/^data:image\/\w+;base64,/, '');

    const text = await this.callOpenRouter([
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${originalBase64}` },
          },
          {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${renderedBase64}` },
          },
          {
            type: 'text',
            text: `Compare the original design (first image) with the rendered result (second image).

Improve the code to match the original more closely. Focus on:
- Layout accuracy (positioning, alignment, spacing)
- Element sizes (width, height, padding, margins)
- Colors and typography (fonts, sizes, weights, colors)
- Border radii and shadows
- Component positioning

Current code:
\`\`\`${framework === 'react' ? 'tsx' : framework === 'vue' ? 'vue' : 'html'}
${currentCode}
\`\`\`

Provide the improved code. ONLY code, no explanations.`,
          },
        ],
      },
    ]);

    return this.extractCode(text);
  }

  /**
   * Render code as HTML and capture a screenshot via Tauri IPC.
   * Uses a headless Chromium browser (Edge/Chrome) on the host system.
   * Returns base64-encoded PNG, or empty string if unavailable.
   */
  private async renderAndScreenshot(
    code: string,
    framework: string
  ): Promise<string> {
    // Only available in Tauri runtime
    if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
      logger.debug('[ImageToCode] Screenshot rendering unavailable (not in Tauri)');
      return '';
    }

    try {
      const { invoke } = await import('@tauri-apps/api/core');

      // Wrap the generated code in a self-contained HTML document
      const html = this.wrapCodeAsHtml(code, framework);

      const base64: string = await invoke('render_html_screenshot', {
        html,
        width: 1280,
        height: 720,
      });

      logger.debug('[ImageToCode] Screenshot captured via Tauri IPC, size:', base64.length);
      return base64;
    } catch (error) {
      logger.warn('[ImageToCode] Screenshot capture failed:', String(error));
      return '';
    }
  }

  /**
   * Wrap generated component code in a standalone HTML page for rendering.
   */
  private wrapCodeAsHtml(code: string, framework: string): string {
    if (framework === 'html' || code.trim().startsWith('<!DOCTYPE') || code.trim().startsWith('<html')) {
      return code;
    }

    // For React/Vue, wrap in minimal HTML that renders the raw markup
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }</style>
</head>
<body>
${this.extractJsxMarkup(code)}
</body>
</html>`;
  }

  /**
   * Extract the JSX return markup from a React component for static preview.
   * Falls back to rendering the raw code inside a container.
   */
  private extractJsxMarkup(code: string): string {
    // Try to extract JSX between return ( ... )
    const returnMatch = code.match(/return\s*\(\s*([\s\S]*?)\s*\)\s*;?\s*}/);
    if (returnMatch) {
      // Strip React-specific attributes (className→class, onClick→removed, etc.)
      return returnMatch[1]!
        .replace(/className=/g, 'class=')
        .replace(/\s+on[A-Z]\w+={[^}]*}/g, '')
        .replace(/{\/\*.*?\*\/}/g, '');
    }
    // Fallback: wrap raw code in a container
    return `<div style="padding:16px">${code}</div>`;
  }

  /**
   * Extract code from a text response (strips markdown code fences)
   */
  private extractCode(text: string): string {
    // Try to extract code from markdown code blocks
    const codeBlockRegex = /```(?:tsx?|jsx?|html|vue)\n([\s\S]+?)\n```/;
    const match = text.match(codeBlockRegex);
    if (match) {
      return match[1]!.trim();
    }
    return text.trim();
  }

  /**
   * Get styling-specific instructions
   */
  private getStylingInstructions(styling: string, framework: string): string {
    switch (styling) {
      case 'tailwind':
        return '\n- Use Tailwind CSS utility classes for all styling';
      case 'styled-components':
        return framework === 'react'
          ? '\n- Use styled-components for styling'
          : '\n- Use inline styles';
      case 'css':
        return '\n- Use CSS modules or scoped styles';
      default:
        return '';
    }
  }

  /**
   * Detect image MIME type from base64 data
   */
  private detectImageType(imageData: string): 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif' {
    if (imageData.startsWith('data:image/')) {
      const match = imageData.match(/^data:(image\/\w+);base64,/);
      if (match) {
        return match[1] as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
      }
    }
    return 'image/png';
  }

  /**
   * Validate that an API key is configured
   */
  static isConfigured(apiKey?: string): boolean {
    return !!apiKey && apiKey.length > 0;
  }
}
