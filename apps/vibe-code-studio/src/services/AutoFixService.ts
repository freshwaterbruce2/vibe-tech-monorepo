/**
 * AutoFixService - Generate AI-powered fixes for errors
 * Updated Feb 3, 2026: Added Shadow Validation (Self-Healing)
 */
import type * as Monaco from 'monaco-editor';

import { logger } from '../services/Logger';

import { ModelRegistry } from './ModelRegistry';

export interface DetectedError {
  id: string;
  type: 'typescript' | 'eslint' | 'runtime';
  severity: 'error' | 'warning' | 'info';
  message: string;
  file: string;
  line: number;
  column: number;
  code?: string;
  stackTrace?: string;
  suggestion?: string;
}

export interface FixSuggestion {
  id: string;
  title: string;
  description: string;
  code: string;
  startLine: number;
  endLine: number;
  confidence: 'high' | 'medium' | 'low';
  modelUsed?: string;
  estimatedCost?: number;
  validated?: boolean; // Added: verification status
}

export interface GeneratedFix {
  error: DetectedError;
  suggestions: FixSuggestion[];
  context: string;
  explanation: string;
  modelUsed?: string;
  generationTime?: number;
}

export interface AutoFixConfig {
  preferredModel?: string;
  maxCostPerFix?: number;
  preferSpeed?: boolean;
}

export class AutoFixService {
  private cache: Map<string, GeneratedFix> = new Map();
  private codeVersions: Map<string, string> = new Map();
  private modelRegistry: ModelRegistry;
  private config: AutoFixConfig;

  constructor(private aiService: any, config?: AutoFixConfig) {
    if (!aiService) {
      throw new Error('AI service is required');
    }

    this.modelRegistry = new ModelRegistry();
    this.config = {
      maxCostPerFix: 0.01,
      preferSpeed: true,
      ...config
    };
  }

  private selectModelForError(error: DetectedError, contextSize: number): string {
    if (this.config.preferredModel) {
      return this.config.preferredModel;
    }

    const isSimpleError = this.isSimpleError(error);
    const isComplexRefactoring = contextSize > 50 || error.stackTrace !== undefined;

    if (isSimpleError) {
      return 'claude-haiku-4.5';
    } else if (isComplexRefactoring) {
      return 'claude-sonnet-4.5';
    } else if (this.config.preferSpeed) {
      return 'claude-haiku-4.5';
    } else {
      return 'claude-sonnet-4.5';
    }
  }

  private isSimpleError(error: DetectedError): boolean {
    const simpleErrorCodes = [
      'TS2304', 'TS2554', 'TS2551', 'TS2339', 'TS1005', 'TS1127',
    ];

    if (error.code && simpleErrorCodes.some(code => error.code?.includes(code))) {
      return true;
    }

    if (error.type === 'eslint') {
      return true;
    }

    if (error.message.length < 50) {
      return true;
    }

    return false;
  }

  async generateFix(
    error: DetectedError,
    editor: Monaco.editor.IStandaloneCodeEditor
  ): Promise<GeneratedFix> {
    const startTime = Date.now();
    const model = editor.getModel();
    if (!model) {
      throw new Error('Editor model not found');
    }

    const fileContent = model.getValue();
    const filePath = model.uri.path;
    const languageId = model.getLanguageId();

    const cacheKey = this.getCacheKey(error);
    const cachedVersion = this.codeVersions.get(cacheKey);

    if (cachedVersion === fileContent && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const context = this.extractContext(fileContent, error.line);
    const contextLines = context.split('\n').length;

    const selectedModel = this.selectModelForError(error, contextLines);
    logger.debug(`[AutoFix] Selected model: ${selectedModel}`);

    const prompt = this.buildFixPrompt(error, context, { filePath, languageId });
    const promptTokens = Math.ceil(prompt.length / 4);
    const estimatedOutputTokens = 500;

    const modelInfo = this.modelRegistry.getModel(selectedModel);
    const estimatedCost = modelInfo
      ? this.modelRegistry.calculateCost(selectedModel, promptTokens, estimatedOutputTokens)
      : 0;

    let response: string;
    try {
      this.aiService.setModel?.('moonshotai/kimi-k2:free');

      const aiResponse = await this.aiService.sendContextualMessage({
        userQuery: prompt,
        relatedFiles: [],
        workspaceContext: {
          projectName: 'unknown',
          projectType: 'unknown',
          frameworks: [],
          dependencies: [],
          fileTree: []
        },
        conversationHistory: []
      });
      response = aiResponse.content;
    } catch (err) {
      throw new Error(`AI service error: ${(err as Error).message}`);
    }

    const generationTime = Date.now() - startTime;
    const suggestions = this.parseResponse(response, error, selectedModel, estimatedCost);

    // --- SHADOW VALIDATION LOOP ---
    // Apply fixes to a hidden model and check if they resolve the error
    const validatedSuggestions: FixSuggestion[] = [];
    
    for (const suggestion of suggestions) {
      const isValid = await this.validateSuggestion(suggestion, fileContent, languageId, error);
      if (isValid) {
        suggestion.validated = true;
        suggestion.confidence = 'high'; // Boost confidence if validated
        validatedSuggestions.push(suggestion);
      } else {
        // Keep it but mark as unvalidated/low confidence
        suggestion.validated = false;
        suggestion.confidence = 'low';
        validatedSuggestions.push(suggestion);
      }
    }

    // Re-rank suggestions: Validated first
    validatedSuggestions.sort((a, b) => (a.validated === b.validated ? 0 : a.validated ? -1 : 1));

    const explanation = this.extractExplanation(response);

    const fix: GeneratedFix = {
      error,
      suggestions: validatedSuggestions,
      context,
      explanation,
      modelUsed: selectedModel,
      generationTime
    };

    logger.debug(`[AutoFix] Validation complete. ${validatedSuggestions.filter(s => s.validated).length} valid fixes.`);

    this.cache.set(cacheKey, fix);
    this.codeVersions.set(cacheKey, fileContent);

    return fix;
  }

  /**
   * Validate a suggestion using a Shadow Model
   */
  private async validateSuggestion(
    suggestion: FixSuggestion,
    originalContent: string,
    languageId: string,
    targetError: DetectedError
  ): Promise<boolean> {
    // 1. Create Shadow Model (Hidden)
    const monaco = await import('monaco-editor');
    const shadowUri = monaco.Uri.parse(`inmemory://shadow-validation/${randomUUID()}.${languageId === 'typescript' ? 'ts' : 'js'}`);
    const shadowModel = monaco.editor.createModel(originalContent, languageId, shadowUri);

    try {
      // 2. Apply Patch
      const lines = originalContent.split('\n');
      const startLine = suggestion.startLine - 1;
      const endLine = suggestion.endLine - 1;
      
      // Simple line replacement logic (naive patch)
      // In production, use Monaco.Range for precise edits
      const newLines = [...lines];
      newLines.splice(startLine, endLine - startLine + 1, suggestion.code);
      const newContent = newLines.join('\n');
      
      shadowModel.setValue(newContent);

      // 3. Check for Errors (Wait for language service)
      // We need to give the worker a moment to process
      await new Promise(resolve => setTimeout(resolve, 50));

      const markers = monaco.editor.getModelMarkers({ resource: shadowUri });
      
      // 4. Verify: Is the original error gone?
      const errorStillExists = markers.some(m => 
        m.startLineNumber >= suggestion.startLine && 
        m.message === targetError.message
      );

      // 5. Verify: Did we introduce NEW errors?
      // (Ignoring the original error for this check)
      const newErrorCount = markers.filter(m => m.message !== targetError.message).length;
      const originalErrorCount = monaco.editor.getModelMarkers({ resource: monaco.Uri.parse(targetError.file) }).length;

      if (errorStillExists) {
        logger.debug(`[AutoFix] Validation Failed: Fix did not resolve error.`);
        return false;
      }

      if (newErrorCount > originalErrorCount) {
        logger.debug(`[AutoFix] Validation Failed: Fix introduced new errors.`);
        return false;
      }

      return true;

    } catch (e) {
      logger.error('[AutoFix] Validation Error', e);
      return false;
    } finally {
      shadowModel.dispose();
    }
  }

  private inferCodeFence(
    filePath: string,
    languageId: string
  ): { codeFence: 'javascript' | 'typescript' | 'jsx' | 'tsx'; languageName: string; disallowTypeScriptSyntax: boolean } {
    const lowerPath = (filePath || '').toLowerCase();
    const lowerLang = (languageId || '').toLowerCase();

    const isTs =
      lowerLang === 'typescript' ||
      lowerLang === 'ts' ||
      lowerLang === 'typescriptreact' ||
      lowerPath.endsWith('.ts') ||
      lowerPath.endsWith('.tsx');

    const isJs =
      lowerLang === 'javascript' ||
      lowerLang === 'js' ||
      lowerLang === 'javascriptreact' ||
      lowerPath.endsWith('.js') ||
      lowerPath.endsWith('.cjs') ||
      lowerPath.endsWith('.mjs') ||
      lowerPath.endsWith('.jsx');

    if (isTs) {
      if (lowerLang.includes('react') || lowerPath.endsWith('.tsx')) {
        return { codeFence: 'tsx', languageName: 'TypeScript (TSX)', disallowTypeScriptSyntax: false };
      }
      return { codeFence: 'typescript', languageName: 'TypeScript', disallowTypeScriptSyntax: false };
    }

    if (isJs) {
      if (lowerLang.includes('react') || lowerPath.endsWith('.jsx')) {
        return { codeFence: 'jsx', languageName: 'JavaScript (JSX)', disallowTypeScriptSyntax: true };
      }
      return { codeFence: 'javascript', languageName: 'JavaScript', disallowTypeScriptSyntax: true };
    }

    return { codeFence: 'typescript', languageName: 'TypeScript', disallowTypeScriptSyntax: false };
  }

  private extractContext(fileContent: string, errorLine: number, contextLines: number = 10): string {
    const lines = fileContent.split('\n');
    const startLine = Math.max(0, errorLine - contextLines);
    const endLine = Math.min(lines.length, errorLine + contextLines);

    return lines.slice(startLine, endLine).join('\n');
  }

  private formatErrorType(type: string): string {
    const typeMap: Record<string, string> = {
      'typescript': 'TypeScript',
      'eslint': 'ESLint',
      'runtime': 'Runtime'
    };
    return typeMap[type] ?? type.charAt(0).toUpperCase() + type.slice(1);
  }

  private buildFixPrompt(
    error: DetectedError,
    context: string,
    fileInfo?: { filePath?: string; languageId?: string }
  ): string {
    const errorTypeCapitalized = this.formatErrorType(error.type);
    const filePath = fileInfo?.filePath ?? error.file ?? 'unknown';
    const languageId = fileInfo?.languageId ?? '';
    const { codeFence, languageName, disallowTypeScriptSyntax } = this.inferCodeFence(filePath, languageId);
    let prompt = `You are an expert code fixer. Analyze this ${errorTypeCapitalized} error and suggest fixes.\n\n`;

    prompt += `File: ${filePath}\n`;
    if (languageId) {
      prompt += `Editor Language ID: ${languageId}\n`;
    }
    prompt += `Target Language: ${languageName}\n\n`;

    if (disallowTypeScriptSyntax) {
      prompt +=
        `IMPORTANT: This is a JavaScript file. Do NOT use TypeScript-only syntax like "interface", "type", enums, or type annotations.\n` +
        `If types are helpful, use JSDoc comments instead. Only suggest renaming to .ts/.tsx as an optional alternative.\n\n`;
    }

    prompt += `Error Type: ${errorTypeCapitalized}\n`;
    prompt += `Severity: ${error.severity}\n`;
    prompt += `Message: ${error.message}\n`;
    if (error.code) {
      prompt += `Error Code: ${error.code}\n`;
    }
    prompt += `Location: line ${error.line}, column ${error.column}\n\n`;

    if (error.stackTrace) {
      prompt += `stack trace:\n${error.stackTrace}\n\n`;
    }

    prompt += `Code Context:\n\`\`\`${codeFence}\n${context}\n\`\`\`\n\n`;

    prompt += `Please provide:\n`;
    prompt += `1. Multiple fix suggestions (if applicable)\n`;
    prompt += `2. Fixed code in code blocks\n`;
    prompt += `3. Brief explanation of each fix\n\n`;

    prompt += `Format your response with numbered suggestions and code blocks.`;

    return prompt;
  }

  private parseResponse(
    response: string,
    error: DetectedError,
    modelUsed: string,
    estimatedCost: number
  ): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];
    const codeBlockRegex = /```(?:typescript|javascript|tsx|jsx|ts|js)?\n?([\s\S]*?)```/g;
    const matches = Array.from(response.matchAll(codeBlockRegex));

    if (matches.length === 0) {
      return [{
        id: `fix-${error.id}-1`,
        title: 'AI Suggestion',
        description: 'AI-generated fix suggestion',
        code: response.trim(),
        startLine: error.line,
        endLine: error.line,
        confidence: 'low',
        modelUsed,
        estimatedCost
      }];
    }

    const costPerSuggestion = estimatedCost / matches.length;

    matches.forEach((match, index) => {
      const codeMatch = match[1];
      if (!codeMatch) return;
      const code = codeMatch.trim();
      const confidence = this.determineConfidence(index, error);
      const beforeCode = response.substring(0, match.index).split('\n').pop() ?? '';
      const title = this.extractTitle(beforeCode, index + 1);

      suggestions.push({
        id: `fix-${error.id}-${index + 1}`,
        title,
        description: this.extractDescription(response, match.index, code),
        code,
        startLine: error.line,
        endLine: error.line,
        confidence,
        modelUsed,
        estimatedCost: costPerSuggestion
      });
    });

    return suggestions;
  }

  private determineConfidence(index: number, error: DetectedError): 'high' | 'medium' | 'low' {
    if (index === 0) {
      if (error.code?.includes('TS2304') ||
          error.code?.includes('TS2345') ||
          error.code?.includes('TS2322') ||
          error.code?.includes('semi')) {
        return 'high';
      }

      if (error.type === 'typescript' || error.type === 'eslint') {
        return 'medium';
      }
    }
    return index === 1 ? 'medium' : 'low';
  }

  private extractTitle(text: string, suggestionNumber: number): string {
    const numbered = text.match(/\d+\.\s*(.+)/);
    if (numbered?.[1]) {
      return numbered[1].trim();
    }
    const prefixed = text.match(/(?:Fix|Solution|Approach):\s*(.+)/i);
    if (prefixed?.[1]) {
      return prefixed[1].trim();
    }
    return `Fix Suggestion ${suggestionNumber}`;
  }

  private extractDescription(response: string, codeBlockStart: number, _code: string): string {
    const beforeCode = response.substring(Math.max(0, codeBlockStart - 200), codeBlockStart);
    const lines = beforeCode.split('\n').filter(l => l.trim().length > 0);

    if (lines.length > 0) {
      const lastLine = lines[lines.length - 1];
      return lastLine?.trim() ?? 'Apply this fix to resolve the error';
    }
    return 'Apply this fix to resolve the error';
  }

  private extractExplanation(response: string): string {
    const firstCodeBlock = response.indexOf('```');
    if (firstCodeBlock > 0) {
      const explanation = response.substring(0, firstCodeBlock).trim();
      if (explanation.length > 20) {
        return explanation;
      }
    }
    const lastCodeBlock = response.lastIndexOf('```');
    if (lastCodeBlock > 0) {
      const afterLast = response.indexOf('\n', lastCodeBlock + 3);
      if (afterLast > 0) {
        const explanation = response.substring(afterLast).trim();
        if (explanation.length > 20) {
          return explanation;
        }
      }
    }
    return 'AI-generated fix based on error analysis';
  }

  private getCacheKey(error: DetectedError): string {
    return `${error.file}:${error.line}:${error.column}:${error.message}`;
  }
}

function randomUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
