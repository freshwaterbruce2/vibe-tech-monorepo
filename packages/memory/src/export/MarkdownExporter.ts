/**
 * Export memories to Markdown reports
 * Generate human-readable memory dumps and analysis reports
 */

import type { MemoryManager } from '../core/MemoryManager.js';
import type { PatternAnalyzer } from '../analysis/PatternAnalyzer.js';

export interface ExportOptions {
  /** Include episodic memories */
  includeEpisodic?: boolean;
  /** Include semantic memories */
  includeSemantic?: boolean;
  /** Include procedural patterns */
  includeProcedural?: boolean;
  /** Include suggestions */
  includeSuggestions?: boolean;
  /** Time range for episodic (Unix ms) */
  startTime?: number;
  endTime?: number;
  /** Category filter for semantic */
  category?: string;
  /** Limit per section */
  limit?: number;
}

export class MarkdownExporter {
  constructor(
    private memory: MemoryManager,
    private analyzer?: PatternAnalyzer
  ) {}

  /**
   * Generate complete memory report
   */
  async generateReport(options: ExportOptions = {}): Promise<string> {
    const {
      includeEpisodic = true,
      includeSemantic = true,
      includeProcedural = true,
      includeSuggestions = true,
      limit = 50,
    } = options;

    const sections: string[] = [];

    // Header
    sections.push(this.generateHeader());

    // System stats
    sections.push(await this.generateStats());

    // Suggestions (if enabled and analyzer available)
    if (includeSuggestions && this.analyzer) {
      sections.push(await this.generateSuggestions());
    }

    // Semantic memories
    if (includeSemantic) {
      sections.push(await this.generateSemanticSection(options.category, limit));
    }

    // Procedural patterns
    if (includeProcedural) {
      sections.push(this.generateProceduralSection(limit));
    }

    // Episodic memories
    if (includeEpisodic) {
      sections.push(this.generateEpisodicSection(options.startTime, options.endTime, limit));
    }

    return sections.join('\n\n---\n\n');
  }

  /**
   * Generate session summary
   */
  generateSessionSummary(sessionId: string): string {
    const memories = this.memory.episodic.getBySession(sessionId);

    if (memories.length === 0) {
      return `# Session Report: ${sessionId}\n\nNo memories found for this session.`;
    }

    const first = memories[0];
    const last = memories[memories.length - 1];
    const duration = last.timestamp - first.timestamp;
    const durationMin = Math.round(duration / 60000);

    const sections: string[] = [];

    // Header
    sections.push(`# Session Report: ${sessionId}`);
    sections.push(`**Source:** ${first.sourceId}`);
    sections.push(`**Started:** ${new Date(first.timestamp).toISOString()}`);
    sections.push(`**Duration:** ${durationMin} minutes`);
    sections.push(`**Events:** ${memories.length}`);
    sections.push('');

    // Timeline
    sections.push('## Timeline\n');
    for (const memory of memories) {
      const time = new Date(memory.timestamp).toLocaleTimeString();
      sections.push(`### ${time}\n`);
      sections.push(`**Q:** ${memory.query}\n`);
      sections.push(`**R:** ${memory.response}\n`);
      if (memory.metadata) {
        sections.push(`*Metadata:* \`${JSON.stringify(memory.metadata)}\`\n`);
      }
    }

    return sections.join('\n');
  }

  /**
   * Generate knowledge base export (semantic only)
   */
  async generateKnowledgeBase(category?: string): Promise<string> {
    const sections: string[] = [];

    sections.push('# Knowledge Base');
    sections.push(`*Generated:* ${new Date().toISOString()}`);
    sections.push('');

    // Get all semantic memories
    const stmt = this.memory.semantic['db'].prepare(`
      SELECT id, text, category, importance, created, access_count, metadata
      FROM semantic_memory
      ${category ? 'WHERE category = ?' : ''}
      ORDER BY importance DESC, created DESC
    `);

    const rows = category ? stmt.all(category) : stmt.all();

    // Group by category
    const byCategory = new Map<string, any[]>();
    for (const row of rows as any[]) {
      const cat = row.category || 'uncategorized';
      if (!byCategory.has(cat)) {
        byCategory.set(cat, []);
      }
      byCategory.get(cat)!.push(row);
    }

    // Generate sections per category
    for (const [cat, items] of byCategory.entries()) {
      sections.push(`## ${cat.charAt(0).toUpperCase() + cat.slice(1)}\n`);

      for (const item of items) {
        const created = new Date(item.created).toLocaleDateString();
        const stars = '★'.repeat(Math.min(item.importance, 5));

        sections.push(`### ${stars} ${item.text.substring(0, 100)}${item.text.length > 100 ? '...' : ''}`);
        sections.push('');
        sections.push(item.text);
        sections.push('');
        sections.push(`*Created:* ${created} | *Accessed:* ${item.access_count} times | *Importance:* ${item.importance}/10`);
        if (item.metadata) {
          try {
            const meta = JSON.parse(item.metadata);
            sections.push(`*Metadata:* ${JSON.stringify(meta, null, 2)}`);
          } catch {}
        }
        sections.push('');
      }
    }

    return sections.join('\n');
  }

  // Private helper methods

  private generateHeader(): string {
    return `# Memory System Report\n\n*Generated:* ${new Date().toISOString()}`;
  }

  private async generateStats(): Promise<string> {
    const stats = this.memory.getStats();
    const health = await this.memory.healthCheck();

    return [
      '## System Status',
      '',
      `- **Health:** ${health.healthy ? '✅ HEALTHY' : '⚠️ DEGRADED'}`,
      `- **Episodic Memories:** ${stats.database.episodicCount}`,
      `- **Semantic Memories:** ${stats.database.semanticCount}`,
      `- **Procedural Patterns:** ${stats.database.proceduralCount}`,
      `- **Database Size:** ${(stats.database.dbSizeBytes / 1024).toFixed(2)} KB`,
      `- **Embedding:** ${stats.embedding.provider} (${stats.embedding.dimension}d)`,
    ].join('\n');
  }

  private async generateSuggestions(): Promise<string> {
    if (!this.analyzer) return '';

    const suggestions = await this.analyzer.suggestNextActions(10);

    if (suggestions.length === 0) {
      return '## Smart Suggestions\n\n*No suggestions available yet. Keep using the system to build pattern history.*';
    }

    const lines = ['## Smart Suggestions', ''];

    for (const sug of suggestions) {
      const icon = {
        workflow: '🔄',
        optimization: '⚡',
        reminder: '💡',
        pattern: '🎯',
      }[sug.type];

      const confidence = Math.round(sug.confidence * 100);

      lines.push(`### ${icon} ${sug.title} (${confidence}% confidence)`);
      lines.push('');
      lines.push(sug.description);
      lines.push('');
      lines.push('**Evidence:**');
      for (const evidence of sug.evidence) {
        lines.push(`- ${evidence}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private async generateSemanticSection(category?: string, limit = 50): Promise<string> {
    const stmt = this.memory.semantic['db'].prepare(`
      SELECT text, category, importance, created
      FROM semantic_memory
      ${category ? 'WHERE category = ?' : ''}
      ORDER BY importance DESC, created DESC
      LIMIT ?
    `);

    const rows = category
      ? (stmt.all(category, limit) as any[])
      : (stmt.all(limit) as any[]);

    const lines = ['## Semantic Memories (Knowledge)', ''];

    for (const row of rows) {
      const date = new Date(row.created).toLocaleDateString();
      const stars = '⭐'.repeat(Math.min(row.importance, 5));

      lines.push(`- **[${row.category || 'general'}]** ${stars}`);
      lines.push(`  ${row.text}`);
      lines.push(`  *${date}*`);
      lines.push('');
    }

    return lines.join('\n');
  }

  private generateProceduralSection(limit = 50): string {
    const patterns = this.memory.procedural.getMostFrequent(limit);

    const lines = ['## Procedural Patterns (Commands)', ''];

    for (const pattern of patterns) {
      const successRate = Math.round(pattern.successRate * 100);
      const icon = successRate >= 80 ? '✅' : successRate >= 50 ? '⚠️' : '❌';

      lines.push(`### ${icon} \`${pattern.pattern}\``);
      lines.push('');
      lines.push(`**Context:** ${pattern.context}`);
      lines.push(`**Usage:** ${pattern.frequency}x | **Success:** ${successRate}%`);
      lines.push('');
    }

    return lines.join('\n');
  }

  private generateEpisodicSection(
    startTime?: number,
    endTime?: number,
    limit = 50
  ): string {
    const memories = startTime && endTime
      ? this.memory.episodic.getTimeRange(startTime, endTime, limit)
      : this.memory.episodic.getRecent(limit);

    const lines = ['## Recent Activity (Episodic)', ''];

    for (const memory of memories) {
      const date = new Date(memory.timestamp).toLocaleString();

      lines.push(`### ${date}`);
      lines.push(`**Source:** ${memory.sourceId}${memory.sessionId ? ` (${memory.sessionId})` : ''}`);
      lines.push(`**Q:** ${memory.query}`);
      lines.push(`**R:** ${memory.response}`);
      lines.push('');
    }

    return lines.join('\n');
  }
}
