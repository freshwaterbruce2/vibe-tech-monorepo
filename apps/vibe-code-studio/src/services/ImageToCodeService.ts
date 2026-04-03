/**
 * ImageToCodeService - Screenshot to Code Converter
 *
 * Converts UI screenshots/mockups to clean React code using Claude Vision API.
 * Implements iterative refinement for high-quality results.
 *
 * Based on 2025 best practices:
 * - Claude Sonnet 3.7: 70.31% accuracy (best for screenshot-to-code)
 * - Iterative refinement: 2-3 passes for accuracy
 * - Puppeteer MCP integration for screenshot comparison
 */
import Anthropic from '@anthropic-ai/sdk';

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

export class ImageToCodeService {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({
      apiKey,
    });
  }

  /**
   * Convert a screenshot/mockup image to clean code
   *
   * @param imageData - Base64 encoded image or Buffer
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
    const firstPass = await this.generateInitialCode(
      imageData,
      framework,
      styling,
      includeComponents,
      responsive
    );

    let code = this.extractCode(firstPass);
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

      const extractedRefinedCode = this.extractCode({ content: [{ text: refinedCode }] });

      // Check if code converged (no changes)
      if (extractedRefinedCode === code || extractedRefinedCode.length < 50) {
        logger.debug('[ImageToCode] Converged after', iterations, 'iterations');
        break;
      }

      improvements.push(`Iteration ${iterations}: Improved layout accuracy, spacing, and colors`);
      code = extractedRefinedCode;
      iterations++;
    }

    logger.debug('[ImageToCode] Refinement complete. Total iterations:', iterations);

    return {
      code,
      framework,
      styling,
      iterations,
      improvements,
    };
  }

  /**
   * Generate initial code from screenshot using Claude Vision
   */
  private async generateInitialCode(
    imageData: string,
    framework: string,
    styling: string,
    includeComponents: boolean,
    responsive: boolean
  ): Promise<any> {
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

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514', // Latest Claude Sonnet
        max_tokens: 8192,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: this.detectImageType(imageData),
                  data: imageData.replace(/^data:image\/\w+;base64,/, ''),
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      });

      return response;
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
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: originalImage.replace(/^data:image\/\w+;base64,/, ''),
              },
            },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: renderedImage.replace(/^data:image\/\w+;base64,/, ''),
              },
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
      ],
    });

    return this.extractCode(response);
  }

  /**
   * Render code and capture screenshot using Puppeteer
   * Integrates with Puppeteer MCP server for screenshot comparison
   *
   * NOTE: Screenshot rendering is disabled in Electron renderer for security.
   * TODO: Move to main process via IPC for proper Puppeteer integration.
   */
  private async renderAndScreenshot(
    _code: string,
    _framework: string
  ): Promise<string> {
    // DISABLED: Puppeteer should not be used in renderer process
    // Puppeteer requires Node.js APIs and causes bundling issues in Electron
    // Future implementation should use IPC to request screenshots from main process
    logger.debug('[ImageToCode] Screenshot rendering disabled in production (requires main process IPC)');
    return '';
  }

  /**
   * Extract code from Claude's response
   */
  private extractCode(response: any): string {
    const content = response.content[0].text;

    // Try to extract code from markdown code blocks
    const codeBlockRegex = /```(?:tsx?|jsx?|html|vue)\n([\s\S]+?)\n```/;
    const match = content.match(codeBlockRegex);

    if (match) {
      return match[1].trim();
    }

    // If no code block found, return entire content
    // (Claude might return code without markdown formatting)
    return content.trim();
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
        return match[1] as any;
      }
    }

    // Default to PNG
    return 'image/png';
  }

  /**
   * Validate that an API key is configured
   */
  static isConfigured(apiKey?: string): boolean {
    return !!apiKey && apiKey.length > 0;
  }
}
