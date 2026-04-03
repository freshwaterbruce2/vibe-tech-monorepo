/**
 * Confidence Calculator
 *
 * Calculates confidence scores for execution steps and generates fallback plans.
 * Part of Phase 6: Confidence-Based Planning with Memory Strategy.
 */
import { logger } from '../../../services/Logger';

import type { AgentStep, ConfidenceFactor, FallbackPlan, StepConfidence } from './types';

/**
 * Calculate confidence score for a step (0-100)
 *
 * Scoring breakdown:
 * - Baseline: 50
 * - Memory match: +40
 * - File existence: +20
 * - Complex action: -15
 */
export function calculateStepConfidence(
    step: AgentStep,
    strategyMemoryMatch: boolean | any
): StepConfidence {
    let score = 50; // Baseline confidence
    const factors: ConfidenceFactor[] = [];

    // Factor 1: Memory Match (40 points)
    if (strategyMemoryMatch) {
        score += 40;
        factors.push({
            name: 'strategy_memory_match',
            impact: 40,
            description: 'This action pattern has been successful before',
        });
    }

    // Factor 2: File Existence (20 points)
    if (step.action.type === 'read_file' || step.action.type === 'write_file') {
        const filePath = step.action.params['filePath'];
        if (filePath && typeof filePath === 'string') {
            const exists = estimateFileExistence(filePath);
            if (exists) {
                score += 20;
                factors.push({
                    name: 'file_exists',
                    impact: 20,
                    description: 'Target file likely exists',
                });
            }
        }
    }

    // Factor 3: Action Complexity (-15 points for complex actions)
    const complexActions = ['refactor_code', 'generate_code', 'analyze_code'];
    if (complexActions.includes(step.action.type)) {
        score -= 15;
        factors.push({
            name: 'complex_action',
            impact: -15,
            description: 'Complex action with higher uncertainty',
        });
    }

    // Clamp score to 0-100
    score = Math.max(0, Math.min(100, score));

    // Determine risk level
    const riskLevel: 'low' | 'medium' | 'high' =
        score >= 70 ? 'low' : score >= 40 ? 'medium' : 'high';

    const memoryBacked = strategyMemoryMatch;

    return {
        score,
        factors,
        memoryBacked,
        riskLevel,
    };
}

/**
 * Estimate if a file likely exists based on common patterns
 */
function estimateFileExistence(filePath: string): boolean {
    // Common file paths that usually exist
    const commonPaths = [
        'package.json',
        'tsconfig.json',
        'README.md',
        'src/index.ts',
        'src/App.tsx',
        'vite.config.ts',
    ];

    return commonPaths.some((path) => filePath.endsWith(path));
}

/**
 * Generate fallback plans for a step based on its action type and confidence
 */
export function generateFallbackPlans(step: AgentStep, confidence: StepConfidence): FallbackPlan[] {
    const fallbacks: FallbackPlan[] = [];

    // Low confidence steps need fallback plans
    if (confidence.score < 60) {
        // Fallback 1: Search before read
        if (step.action.type === 'read_file') {
            const filePath = step.action.params['filePath'] as string;
            if (filePath) {
                const fileName = filePath.split('/').pop() ?? filePath.split('\\').pop() ?? filePath;
                fallbacks.push({
                    id: `fallback_${step.id}_1`,
                    stepId: step.id,
                    trigger: 'If file not found',
                    alternativeAction: {
                        type: 'search_codebase',
                        params: {
                            searchQuery: `*${fileName}`,
                        },
                    },
                    confidence: 75,
                    reasoning: 'Search workspace for file instead of direct read',
                });
            }
        }

        // Fallback 2: Create with default template
        const configFilePath = step.action.params['filePath'] as string | undefined;
        if (step.action.type === 'read_file' && step.description.toLowerCase().includes('config') && configFilePath) {
            fallbacks.push({
                id: `fallback_${step.id}_2`,
                stepId: step.id,
                trigger: 'If file not found after search',
                alternativeAction: {
                    type: 'write_file',
                    params: {
                        filePath: configFilePath,
                        content: '{}', // Default empty config
                    },
                },
                confidence: 60,
                reasoning: 'Create default config if none exists',
            });
        }

        // Fallback 3: Request user input for critical actions
        if (confidence.riskLevel === 'high') {
            fallbacks.push({
                id: `fallback_${step.id}_3`,
                stepId: step.id,
                trigger: 'If action fails after all attempts',
                alternativeAction: {
                    type: 'custom',
                    params: {
                        action: 'request_user_input',
                        reason: 'High risk action failed, need human guidance',
                    },
                },
                confidence: 90, // User input is always high confidence
                reasoning: 'Request human input for critical decision',
            });
        }
    }

    logger.debug(`[ConfidenceCalculator] Generated ${fallbacks.length} fallback plans for step ${step.id}`);
    return fallbacks;
}

/**
 * Determine execution strategy based on confidence
 */
export function determineExecutionStrategy(confidence: StepConfidence): 'execute' | 'validate' | 'skip' {
    if (confidence.score >= 70) {
        return 'execute';
    } else if (confidence.score >= 40) {
        return 'validate';
    } else {
        return 'skip';
    }
}

/**
 * Estimate time for task execution
 */
export function estimateTime(stepCount: number): string {
    const minutes = stepCount * 2; // Rough estimate: 2 mins per step
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
}

/**
 * Estimate success rate based on confidence and memory
 */
export function estimateSuccessRate(confidenceScore: number, memoryBackedRatio: number): number {
    // Base rate is confidence
    let rate = confidenceScore;

    // Boost by memory backing
    if (memoryBackedRatio > 0.5) rate += 10;
    if (memoryBackedRatio > 0.8) rate += 5;

    return Math.min(99, Math.max(1, rate));
}
