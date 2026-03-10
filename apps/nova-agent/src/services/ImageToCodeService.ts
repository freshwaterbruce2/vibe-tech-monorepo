/**
 * Image to Code Service
 *
 * Converts UI mockups/screenshots to React components using Kimi K2.5 vision.
 * Uses Moonshot API directly (no proxy needed).
 */

import { analyzeImage, sendKimiMessage, type KimiChatOptions } from './moonshot';

export interface ImageData {
  base64: string;
  mimeType: string;
  url?: string;
}

export interface GeneratedComponent {
  code: string;
  componentName: string;
  dependencies: string[];
  metadata?: {
    responsive?: boolean;
    accessibility?: boolean;
    colors?: string[];
    suggestedComponents?: string[];
  };
}

export interface ComponentGenerationOptions {
  componentName?: string;
  typescript?: boolean;
  styling?: 'tailwind' | 'styled-components' | 'css-modules';
}

export interface DesignSystemAnalysis {
  commonComponents: string[];
  colorPalette: string[];
  typography: { fontFamilies: string[]; sizes: number[] };
  spacing: { scale: number[] };
}

export class ImageToCodeService {
  private cache: Map<string, GeneratedComponent>;
  private cacheExpiry: Map<string, number>;
  private cacheTTL: number;

  constructor(cacheTTL: number = 3600000) {
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.cacheTTL = cacheTTL;
  }

  async loadImage(pathOrUrl: string): Promise<ImageData> {
    if (pathOrUrl.startsWith('http')) {
      const response = await fetch(pathOrUrl);
      const buffer = await response.arrayBuffer();
      const base64 = this.arrayBufferToBase64(buffer);
      const mimeType = response.headers.get('content-type') ?? 'image/png';
      return { base64, mimeType, url: pathOrUrl };
    }

    // Use Tauri fs for local files
    const { readFile } = await import('@tauri-apps/plugin-fs');
    const content = await readFile(pathOrUrl);
    const base64 = this.uint8ArrayToBase64(content);
    const ext = pathOrUrl.split('.').pop()?.toLowerCase() ?? 'png';
    const mimeType = this.getMimeType(ext);
    return { base64, mimeType };
  }

  async generateComponent(
    imagePath: string,
    options: ComponentGenerationOptions = {},
  ): Promise<GeneratedComponent> {
    const cacheKey = `${imagePath}:${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    const expiry = this.cacheExpiry.get(cacheKey);

    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }

    const imageData = await this.loadImage(imagePath);
    const result = await this.callVisionAPI(imageData, options);

    this.cache.set(cacheKey, result);
    this.cacheExpiry.set(cacheKey, Date.now() + this.cacheTTL);

    return result;
  }

  async analyzeDesignSystem(imagePaths: string[]): Promise<DesignSystemAnalysis> {
    // Analyze each image and aggregate results
    const analyses: string[] = [];

    for (const path of imagePaths.slice(0, 5)) {
      // Limit to 5 images
      const imageData = await this.loadImage(path);
      const dataUrl = `data:${imageData.mimeType};base64,${imageData.base64}`;

      const analysis = await analyzeImage(
        dataUrl,
        'Analyze this UI screen. Identify: common UI components (buttons, cards, inputs, etc.), colors used (hex values), font sizes, and spacing patterns. Be specific.',
        { thinking: false },
      );

      analyses.push(analysis);
    }

    // Synthesize all analyses into design system
    const synthesisPrompt = `Based on these UI analyses, extract a unified design system:

${analyses.map((a, i) => `Screen ${i + 1}:\n${a}`).join('\n\n')}

Return a JSON object with:
{
  "commonComponents": ["list", "of", "component", "types"],
  "colorPalette": ["#hex1", "#hex2"],
  "typography": { "fontFamilies": ["fonts"], "sizes": [14, 16, 18] },
  "spacing": { "scale": [4, 8, 16, 24, 32] }
}`;

    const result = await sendKimiMessage(synthesisPrompt, {
      thinking: true,
      systemPrompt: 'You are a design system expert. Return only valid JSON.',
    });

    // Parse JSON from response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // Fall through to defaults
      }
    }

    return {
      commonComponents: [],
      colorPalette: [],
      typography: { fontFamilies: [], sizes: [] },
      spacing: { scale: [] },
    };
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  private async callVisionAPI(
    imageData: ImageData,
    options: ComponentGenerationOptions,
  ): Promise<GeneratedComponent> {
    const styling = options.styling ?? 'tailwind';
    const componentName = options.componentName ?? 'GeneratedComponent';
    const useTS = options.typescript !== false;

    const dataUrl = `data:${imageData.mimeType};base64,${imageData.base64}`;

    const prompt = `Convert this UI mockup to a production-ready React component.

Requirements:
- Component name: ${componentName}
- Language: ${useTS ? 'TypeScript' : 'JavaScript'}
- Styling: ${styling}
- Make it responsive
- Include accessibility attributes (aria-labels, roles)
- Use semantic HTML

Return a JSON object with this exact structure:
{
  "code": "// Full component code here",
  "componentName": "${componentName}",
  "dependencies": ["list", "of", "npm", "packages"],
  "metadata": {
    "responsive": true,
    "accessibility": true,
    "colors": ["#hex1", "#hex2"],
    "suggestedComponents": ["Button", "Card"]
  }
}`;

    const kimiOptions: KimiChatOptions = {
      thinking: true,
      maxTokens: 8192,
      systemPrompt:
        'You are an expert React developer. Generate clean, well-documented, production-ready code. Return only valid JSON.',
    };

    const result = await analyzeImage(dataUrl, prompt, kimiOptions);

    // Parse JSON from response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // Fall through to extract code manually
      }
    }

    // Fallback: extract code block if JSON parsing fails
    const codeMatch = result.match(/```(?:tsx?|jsx?)?\n([\s\S]*?)```/);
    return {
      code: codeMatch?.[1] ?? result,
      componentName,
      dependencies: ['react'],
    };
  }

  private getMimeType(ext: string): string {
    const mimeTypes: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
    };
    return mimeTypes[ext] ?? 'image/png';
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    return this.uint8ArrayToBase64(bytes);
  }

  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    return btoa(binary);
  }
}

// Export singleton for convenience
export const imageToCodeService = new ImageToCodeService();
