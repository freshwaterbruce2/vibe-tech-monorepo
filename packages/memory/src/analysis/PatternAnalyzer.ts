/**
 * Pattern Analysis for Smart Suggestions
 * Analyzes memory patterns to suggest workflows and optimizations
 */

import type { MemoryManager } from '../core/MemoryManager.js';
import type { EpisodicMemory, ProceduralMemory } from '../types/index.js';

export interface Suggestion {
  type: 'workflow' | 'optimization' | 'reminder' | 'pattern';
  title: string;
  description: string;
  confidence: number; // 0-1
  evidence: string[];
  actionable: boolean;
  metadata?: Record<string, any>;
}

export interface PatternInsight {
  pattern: string;
  frequency: number;
  successRate: number;
  avgDuration?: number;
  lastUsed: number;
  relatedPatterns: string[];
}

export class PatternAnalyzer {
  constructor(private memory: MemoryManager) {}

  /**
   * Analyze current context and suggest next actions
   */
  async suggestNextActions(limit = 5): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    // Get recent activity
    const recentMemories = this.memory.episodic.getRecent(20);
    const topPatterns = this.memory.procedural.getMostFrequent(10);

    // Analyze time-based patterns
    const timeBasedSuggestions = this.analyzeTimePatterns(recentMemories, topPatterns);
    suggestions.push(...timeBasedSuggestions);

    // Analyze failure patterns (things to avoid)
    const failurePatterns = this.analyzeFailurePatterns(topPatterns);
    suggestions.push(...failurePatterns);

    // Analyze workflow sequences
    const workflowSuggestions = this.analyzeWorkflowSequences(recentMemories, topPatterns);
    suggestions.push(...workflowSuggestions);

    // Analyze knowledge gaps
    const knowledgeGaps = await this.analyzeKnowledgeGaps(recentMemories);
    suggestions.push(...knowledgeGaps);

    // Sort by confidence and return top N
    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, limit);
  }

  /**
   * Analyze patterns based on time of day/week
   */
  private analyzeTimePatterns(
    memories: EpisodicMemory[],
    _patterns: ProceduralMemory[],
  ): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const now = new Date();
    const currentHour = now.getHours();

    // Check if there's a pattern for current time
    const timePatterns = new Map<number, string[]>();

    for (const memory of memories) {
      const hour = new Date(memory.timestamp).getHours();
      if (!timePatterns.has(hour)) {
        timePatterns.set(hour, []);
      }
      timePatterns.get(hour)!.push(memory.query);
    }

    // If current hour has historical patterns
    const currentHourPatterns = timePatterns.get(currentHour);
    if (currentHourPatterns && currentHourPatterns.length >= 3) {
      const mostCommon = this.findMostCommon(currentHourPatterns);
      suggestions.push({
        type: 'pattern',
        title: 'Time-based workflow detected',
        description: `You typically work on "${mostCommon}" around this time`,
        confidence: 0.7,
        evidence: [`${currentHourPatterns.length} similar activities at ${currentHour}:00`],
        actionable: true,
        metadata: { hour: currentHour, pattern: mostCommon },
      });
    }

    return suggestions;
  }

  /**
   * Analyze patterns with low success rates
   */
  private analyzeFailurePatterns(patterns: ProceduralMemory[]): Suggestion[] {
    const suggestions: Suggestion[] = [];

    for (const pattern of patterns) {
      if (pattern.successRate < 0.5 && pattern.frequency >= 3) {
        suggestions.push({
          type: 'optimization',
          title: `Low success rate: ${pattern.pattern}`,
          description: `This command fails ${Math.round((1 - pattern.successRate) * 100)}% of the time. Consider alternative approach.`,
          confidence: 0.8,
          evidence: [
            `${pattern.frequency} attempts`,
            `${Math.round(pattern.successRate * 100)}% success rate`,
          ],
          actionable: true,
          metadata: { pattern: pattern.pattern, successRate: pattern.successRate },
        });
      }
    }

    return suggestions;
  }

  /**
   * Detect common workflow sequences
   */
  private analyzeWorkflowSequences(
    memories: EpisodicMemory[],
    _patterns: ProceduralMemory[],
  ): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Look for sequential patterns (A followed by B)
    const sequences = new Map<string, string[]>();

    for (let i = 0; i < memories.length - 1; i++) {
      const current = this.extractCommand(memories[i].query);
      const next = this.extractCommand(memories[i + 1].query);

      if (current && next) {
        const key = current;
        if (!sequences.has(key)) {
          sequences.set(key, []);
        }
        sequences.get(key)!.push(next);
      }
    }

    // Find strong sequences (A → B happens often)
    for (const [command, nextCommands] of sequences.entries()) {
      if (nextCommands.length >= 3) {
        const mostCommonNext = this.findMostCommon(nextCommands);
        const frequency = nextCommands.filter((c) => c === mostCommonNext).length;

        if (frequency >= 2) {
          suggestions.push({
            type: 'workflow',
            title: 'Workflow sequence detected',
            description: `After "${command}", you usually run "${mostCommonNext}"`,
            confidence: frequency / nextCommands.length,
            evidence: [`${frequency}/${nextCommands.length} times`],
            actionable: true,
            metadata: { from: command, to: mostCommonNext, frequency },
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Detect questions asked multiple times (knowledge gaps)
   */
  private async analyzeKnowledgeGaps(memories: EpisodicMemory[]): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    // Find similar queries (repeated questions)
    const queries = memories.map((m) => m.query.toLowerCase());
    const queryCounts = new Map<string, number>();

    for (const query of queries) {
      const normalized = this.normalizeQuery(query);
      queryCounts.set(normalized, (queryCounts.get(normalized) || 0) + 1);
    }

    // Queries asked 3+ times might indicate knowledge gaps
    for (const [query, count] of queryCounts.entries()) {
      if (count >= 3) {
        // Search if we have semantic memory about this
        const results = await this.memory.semantic.search(query, 1);
        const hasKnowledge = results.length > 0 && results[0].score > 0.7;

        if (!hasKnowledge) {
          suggestions.push({
            type: 'reminder',
            title: 'Repeated question detected',
            description: `You've asked about "${query}" ${count} times. Consider storing this as semantic knowledge.`,
            confidence: 0.6,
            evidence: [`Asked ${count} times`, 'No semantic memory found'],
            actionable: true,
            metadata: { query, count },
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Get insights about a specific pattern
   */
  getPatternInsights(patternName: string): PatternInsight | null {
    const patterns = this.memory.procedural.getMostFrequent(100);
    const pattern = patterns.find((p) => p.pattern === patternName);

    if (!pattern) return null;

    // Find related patterns (patterns used around the same time)
    const recentMemories = this.memory.episodic.getRecent(50);
    const relatedPatterns = this.findRelatedPatterns(patternName, recentMemories, patterns);

    return {
      pattern: pattern.pattern,
      frequency: pattern.frequency,
      successRate: pattern.successRate,
      lastUsed: pattern.lastUsed || Date.now(),
      relatedPatterns,
    };
  }

  /**
   * Get workflow recommendations for current context
   */
  async getWorkflowRecommendations(context: string): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    // Search for similar past contexts
    const similarMemories = await this.memory.semantic.search(context, 5);

    if (similarMemories.length > 0) {
      const topMatch = similarMemories[0];
      suggestions.push({
        type: 'workflow',
        title: 'Similar context found',
        description: `Based on similar work: "${topMatch.item.text.substring(0, 100)}..."`,
        confidence: topMatch.score,
        evidence: [`${(topMatch.score * 100).toFixed(0)}% similarity`],
        actionable: true,
        metadata: {
          matchId: topMatch.item.id,
          category: topMatch.item.category,
        },
      });
    }

    return suggestions;
  }

  // Helper methods

  private findMostCommon(items: string[]): string {
    const counts = new Map<string, number>();
    for (const item of items) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }
    let max = 0;
    let mostCommon = '';
    for (const [item, count] of counts.entries()) {
      if (count > max) {
        max = count;
        mostCommon = item;
      }
    }
    return mostCommon;
  }

  private extractCommand(text: string): string | null {
    // Extract command from query (e.g., "Tool used: memory_add_semantic" -> "memory_add_semantic")
    const match = text.match(/Tool used: (\S+)/i) || text.match(/^(\S+)/);
    return match ? match[1] : null;
  }

  private normalizeQuery(query: string): string {
    // Remove common variations to detect similar queries
    return query.toLowerCase().replace(/[?!.]/g, '').replace(/\s+/g, ' ').trim().substring(0, 100);
  }

  private findRelatedPatterns(
    targetPattern: string,
    memories: EpisodicMemory[],
    allPatterns: ProceduralMemory[],
  ): string[] {
    const related = new Map<string, number>();

    // Find patterns mentioned in same session as target
    for (const memory of memories) {
      if (memory.query.includes(targetPattern)) {
        // Check what other patterns appear nearby
        const sessionMemories = memories.filter(
          (m) => Math.abs(m.timestamp - memory.timestamp) < 5 * 60 * 1000, // 5 min window
        );

        for (const nearby of sessionMemories) {
          for (const pattern of allPatterns) {
            if (nearby.query.includes(pattern.pattern) && pattern.pattern !== targetPattern) {
              related.set(pattern.pattern, (related.get(pattern.pattern) || 0) + 1);
            }
          }
        }
      }
    }

    // Return top 5 most frequently co-occurring patterns
    return Array.from(related.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pattern]) => pattern);
  }
}
