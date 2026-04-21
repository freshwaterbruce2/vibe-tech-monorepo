/**
 * Crypto Trading Memory Integration
 * Tracks trading decisions, market analysis, and strategy patterns
 */

import type { MemoryManager } from '../core/MemoryManager.js';

export interface TradeDecision {
  pair: string;
  action: 'buy' | 'sell' | 'hold';
  price: number;
  amount: number;
  reason: string;
  confidence: number; // 0-1
  timestamp: number;
  outcome?: 'profit' | 'loss' | 'pending';
  pnl?: number;
}

export interface MarketAnalysis {
  pair: string;
  timeframe: string;
  indicators: Record<string, number>;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  timestamp: number;
}

export interface TradingPattern {
  name: string;
  description: string;
  winRate: number;
  avgPnL: number;
  occurrences: number;
  lastSeen: number;
}

export class CryptoMemory {
  constructor(private memory: MemoryManager) {}

  /**
   * Track a trading decision
   */
  async trackTrade(decision: TradeDecision): Promise<number> {
    // Store as episodic memory
    const episodicId = this.memory.episodic.add({
      sourceId: 'crypto-enhanced',
      query: `Trade decision: ${decision.action} ${decision.amount} ${decision.pair} @ ${decision.price}`,
      response: decision.reason,
      timestamp: decision.timestamp,
      metadata: {
        type: 'trade_decision',
        pair: decision.pair,
        action: decision.action,
        price: decision.price,
        amount: decision.amount,
        confidence: decision.confidence,
        outcome: decision.outcome,
        pnl: decision.pnl,
      },
    });

    // Store high-confidence insights as semantic memory
    if (decision.confidence >= 0.8) {
      await this.memory.semantic.add({
        text: `Trading insight: ${decision.reason} (${decision.pair}, ${decision.action} @ ${decision.price})`,
        category: 'crypto-trading',
        importance: Math.round(decision.confidence * 10),
        metadata: {
          pair: decision.pair,
          action: decision.action,
          confidence: decision.confidence,
        },
      });
    }

    // Track as procedural pattern
    this.memory.procedural.upsert({
      pattern: `crypto_trade_${decision.pair}_${decision.action}`,
      context: `Trading ${decision.pair}: ${decision.action}`,
      successRate: decision.outcome === 'profit' ? 1.0 : decision.outcome === 'loss' ? 0.0 : 0.5,
      lastUsed: decision.timestamp,
      metadata: {
        pair: decision.pair,
        avgPrice: decision.price,
        avgAmount: decision.amount,
      },
    });

    return episodicId;
  }

  /**
   * Track market analysis
   */
  async trackAnalysis(analysis: MarketAnalysis): Promise<number> {
    // Store as semantic memory if high confidence
    if (analysis.confidence >= 0.7) {
      return await this.memory.semantic.add({
        text: `Market analysis for ${analysis.pair} (${analysis.timeframe}): ${analysis.sentiment} sentiment. Indicators: ${JSON.stringify(analysis.indicators)}`,
        category: 'market-analysis',
        importance: Math.round(analysis.confidence * 10),
        metadata: {
          pair: analysis.pair,
          timeframe: analysis.timeframe,
          sentiment: analysis.sentiment,
          indicators: analysis.indicators,
          timestamp: analysis.timestamp,
        },
      });
    }

    return 0;
  }

  /**
   * Get trading patterns (successful strategies)
   */
  getTradingPatterns(minWinRate = 0.6): TradingPattern[] {
    const patterns = this.memory.procedural.getMostSuccessful(50);

    return patterns
      .filter(p => p.pattern.startsWith('crypto_trade_') && p.successRate >= minWinRate)
      .map(p => ({
        name: p.pattern,
        description: p.context,
        winRate: p.successRate,
        avgPnL: (p.metadata?.avgPnL as number) ?? 0,
        occurrences: p.frequency,
        lastSeen: p.lastUsed ?? Date.now(),
      }));
  }

  /**
   * Get insights for specific trading pair
   */
  async getPairInsights(pair: string, limit = 10): Promise<Array<{ text: string; importance: number }>> {
    // Search semantic memories for this pair
    const results = await this.memory.semantic.search(`${pair} trading analysis`, limit);

    return results.map(r => ({
      text: r.item.text,
      importance: r.item.importance,
    }));
  }

  /**
   * Get recent trading decisions
   */
  getRecentTrades(limit = 20): Array<{
    pair: string;
    action: string;
    price: number;
    reason: string;
    outcome?: string;
    timestamp: number;
  }> {
    const recent = this.memory.episodic.getRecent(100, 'crypto-enhanced');

    return recent
      .filter(m => m.metadata?.type === 'trade_decision')
      .slice(0, limit)
      .map(m => {
        // `metadata` was filtered to defined above, but TS doesn't carry that
        // narrowing through .filter → .map, so capture + guard here.
        const meta = m.metadata;
        if (!meta) {
          throw new Error('CryptoMemory.getRecentTrades: metadata lost after filter');
        }
        return {
          pair: meta.pair as string,
          action: meta.action as string,
          price: meta.price as number,
          reason: m.response,
          outcome: meta.outcome as string | undefined,
          timestamp: m.timestamp,
        };
      });
  }

  /**
   * Analyze trading performance
   */
  async analyzePerformance(): Promise<{
    totalTrades: number;
    winRate: number;
    avgPnL: number;
    bestPair: string;
    worstPair: string;
    mostActiveHour: number;
  }> {
    const trades = this.getRecentTrades(1000);
    const patterns = this.getTradingPatterns(0);

    // Calculate win rate
    const completedTrades = trades.filter(t => t.outcome && t.outcome !== 'pending');
    const wins = completedTrades.filter(t => t.outcome === 'profit').length;
    const winRate = completedTrades.length > 0 ? wins / completedTrades.length : 0;

    // Find best/worst pairs
    const pairStats = new Map<string, { wins: number; losses: number }>();
    completedTrades.forEach(t => {
      let stats = pairStats.get(t.pair);
      if (!stats) {
        stats = { wins: 0, losses: 0 };
        pairStats.set(t.pair, stats);
      }
      if (t.outcome === 'profit') stats.wins++;
      else stats.losses++;
    });

    let bestPair = '';
    let bestRate = 0;
    let worstPair = '';
    let worstRate = 1;

    pairStats.forEach((stats, pair) => {
      const rate = stats.wins / (stats.wins + stats.losses);
      if (rate > bestRate) {
        bestRate = rate;
        bestPair = pair;
      }
      if (rate < worstRate) {
        worstRate = rate;
        worstPair = pair;
      }
    });

    // Find most active hour
    const hourCounts = new Map<number, number>();
    trades.forEach(t => {
      const hour = new Date(t.timestamp).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
    });

    let mostActiveHour = 0;
    let maxCount = 0;
    hourCounts.forEach((count, hour) => {
      if (count > maxCount) {
        maxCount = count;
        mostActiveHour = hour;
      }
    });

    return {
      totalTrades: trades.length,
      winRate,
      avgPnL:
        patterns.length === 0
          ? 0
          : patterns.reduce((sum, p) => sum + p.avgPnL, 0) / patterns.length,
      bestPair,
      worstPair,
      mostActiveHour,
    };
  }

  /**
   * Get trading suggestions based on historical patterns
   */
  async getSuggestions(pair?: string): Promise<Array<{
    type: 'opportunity' | 'warning' | 'insight';
    title: string;
    description: string;
    confidence: number;
  }>> {
    const suggestions: Array<{
      type: 'opportunity' | 'warning' | 'insight';
      title: string;
      description: string;
      confidence: number;
    }> = [];

    // Get successful patterns for this pair
    const patterns = this.getTradingPatterns(0.7);
    const pairPatterns = pair ? patterns.filter(p => p.name.includes(pair)) : patterns;

    pairPatterns.slice(0, 3).forEach(p => {
      suggestions.push({
        type: 'opportunity',
        title: `High win rate strategy: ${p.name}`,
        description: `${p.description} has ${(p.winRate * 100).toFixed(1)}% win rate over ${p.occurrences} trades`,
        confidence: p.winRate,
      });
    });

    // Check for recent losses
    const recentTrades = this.getRecentTrades(10);
    const recentLosses = recentTrades.filter(t => t.outcome === 'loss');
    if (recentLosses.length >= 3) {
      suggestions.push({
        type: 'warning',
        title: 'Recent losing streak detected',
        description: `${recentLosses.length} losses in last 10 trades. Consider reducing position sizes or reviewing strategy.`,
        confidence: 0.8,
      });
    }

    // Time-based insight
    const performance = await this.analyzePerformance();
    if (performance.totalTrades > 50) {
      suggestions.push({
        type: 'insight',
        title: `Most active trading hour: ${performance.mostActiveHour}:00`,
        description: `You trade most frequently at ${performance.mostActiveHour}:00. Overall win rate: ${(performance.winRate * 100).toFixed(1)}%`,
        confidence: 0.7,
      });
    }

    return suggestions;
  }
}
