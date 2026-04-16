/**
 * MultiFileEditDetector - Detects and parses multi-file edit suggestions from AI responses
 *
 * Supports multiple formats:
 * - XML tags: <multi_file_edit>...</multi_file_edit>
 * - JSON blocks: { "type": "multi_file_edit", ... }
 * - Markdown: Multiple file code blocks with file paths
 */

import type { FileChange, MultiFileEditPlan } from '@vibetech/types/multifile';
import { logger } from '../Logger';

export interface DetectionResult {
  detected: boolean;
  plan?: MultiFileEditPlan;
  changes?: FileChange[];
}

export class MultiFileEditDetector {
  /**
   * Main detection method - checks if AI response contains multi-file edit suggestion
   */
  detect(aiResponse: string): DetectionResult {
    // Try each pattern in order of reliability
    const xmlResult = this.detectXMLPattern(aiResponse);
    if (xmlResult.detected) return xmlResult;

    const jsonResult = this.detectJSONPattern(aiResponse);
    if (jsonResult.detected) return jsonResult;

    const markdownResult = this.detectMarkdownPattern(aiResponse);
    if (markdownResult.detected) return markdownResult;

    return { detected: false };
  }

  /**
   * Pattern 1: XML Tags (most explicit)
   * Format: <multi_file_edit>...</multi_file_edit>
   */
  private detectXMLPattern(response: string): DetectionResult {
    const xmlMatch = response.match(/<multi_file_edit>([\s\S]*?)<\/multi_file_edit>/i);
    if (!xmlMatch) return { detected: false };

    try {
      const xmlContent = xmlMatch[1];
      if (!xmlContent) return { detected: false };
      const fileMatches = xmlContent.matchAll(/<file\s+path="([^"]+)"[^>]*>([\s\S]*?)<\/file>/gi);

      const changes: FileChange[] = [];
      let description = 'Multi-file edit';

      // Extract description if present
      const descMatch = xmlContent.match(/<description>([^<]+)<\/description>/i);
      if (descMatch?.[1]) description = descMatch[1].trim();

      for (const fileMatch of fileMatches) {
        const path = fileMatch[1];
        const content = fileMatch[2];
        if (!path || !content) continue;

        // Extract change details
        const changeMatch = content.match(/<change[^>]*type="([^"]+)"[^>]*reason="([^"]*)"[^>]*>([\s\S]*?)<\/change>/i);
        if (!changeMatch) continue;

        const changeType = changeMatch[1] as 'create' | 'modify' | 'delete';
        const reason = changeMatch[2] ?? '';
        const newContent = this.cleanCodeContent(changeMatch[3] ?? '');

        changes.push({
          path,
          originalContent: '', // Will be filled when applied
          newContent,
          diff: '', // Will be generated when original content is known
          changeType,
          reason,
        });
      }

      if (changes.length === 0) return { detected: false };

      const plan: MultiFileEditPlan = {
        id: Date.now().toString(),
        description,
        files: changes,
        dependencies: [],
        estimatedImpact: changes.length <= 2 ? 'low' : changes.length <= 5 ? 'medium' : 'high',
        createdAt: new Date(),
      };

      logger.info(`[MultiFileEditDetector] Detected XML pattern with ${changes.length} files`);
      return { detected: true, plan, changes };
    } catch (error) {
      logger.error('[MultiFileEditDetector] Failed to parse XML pattern:', error);
      return { detected: false };
    }
  }

  /**
   * Pattern 2: JSON Block (structured)
   * Format: { "type": "multi_file_edit", "files": [...] }
   */
  private detectJSONPattern(response: string): DetectionResult {
    try {
      // Look for JSON blocks
      const jsonMatch = response.match(/```json\s*\n([\s\S]*?)\n```/i) ||
                       response.match(/\{[\s\S]*?"type"\s*:\s*"multi_file_edit"[\s\S]*?\}/i);

      if (!jsonMatch) return { detected: false };

      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr);

      if (parsed.type !== 'multi_file_edit' || !Array.isArray(parsed.files)) {
        return { detected: false };
      }

      interface ParsedFile { path: string; content?: string; changeType?: string; reason?: string; }
      const changes: FileChange[] = parsed.files.map((file: ParsedFile) => ({
        path: file.path,
        originalContent: '',
        newContent: file.content || '',
        diff: '',
        changeType: file.changeType || 'modify',
        reason: file.reason,
      }));

      const plan: MultiFileEditPlan = {
        id: Date.now().toString(),
        description: parsed.description || 'Multi-file edit',
        files: changes,
        dependencies: parsed.dependencies || [],
        estimatedImpact: changes.length <= 2 ? 'low' : changes.length <= 5 ? 'medium' : 'high',
        createdAt: new Date(),
      };

      logger.info(`[MultiFileEditDetector] Detected JSON pattern with ${changes.length} files`);
      return { detected: true, plan, changes };
    } catch (error) {
      return { detected: false };
    }
  }

  /**
   * Pattern 3: Markdown with multiple file code blocks
   * Format: **File: path/to/file.ts**\n```typescript\n...\n```
   */
  private detectMarkdownPattern(response: string): DetectionResult {
    // Look for multiple file indicators
    const fileHeaders = response.match(/\*\*File:\s*([^\*\n]+)\*\*/gi);
    if (!fileHeaders || fileHeaders.length < 2) return { detected: false };

    try {
      const changes: FileChange[] = [];

      // Split response by file headers
      const sections = response.split(/\*\*File:\s*([^\*\n]+)\*\*/gi);

      for (let i = 1; i < sections.length; i += 2) {
        const pathSection = sections[i];
        const contentSection = sections[i + 1];
        if (!pathSection || !contentSection) continue;
        const path = pathSection.trim();

        // Extract code block
        const codeMatch = contentSection.match(/```(?:\w+)?\n([\s\S]*?)\n```/);
        if (!codeMatch?.[1]) continue;

        const newContent = codeMatch[1].trim();

        changes.push({
          path,
          originalContent: '',
          newContent,
          diff: '',
          changeType: 'modify',
          reason: 'Part of multi-file refactoring',
        });
      }

      if (changes.length < 2) return { detected: false };

      const plan: MultiFileEditPlan = {
        id: Date.now().toString(),
        description: 'Multi-file edit',
        files: changes,
        dependencies: [],
        estimatedImpact: changes.length <= 2 ? 'low' : changes.length <= 5 ? 'medium' : 'high',
        createdAt: new Date(),
      };

      logger.info(`[MultiFileEditDetector] Detected Markdown pattern with ${changes.length} files`);
      return { detected: true, plan, changes };
    } catch (error) {
      logger.error('[MultiFileEditDetector] Failed to parse Markdown pattern:', error);
      return { detected: false };
    }
  }

  /**
   * Clean code content by removing extra whitespace and XML/HTML artifacts
   */
  private cleanCodeContent(content: string): string {
    return content
      .trim()
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"');
  }
}
