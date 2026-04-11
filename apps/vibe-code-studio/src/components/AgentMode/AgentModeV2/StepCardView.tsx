/**
 * StepCardView Component
 * Renders individual step cards with status, confidence, and result data
 */
import type { ReactNode } from 'react';
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    Code,
    Loader2,
    Shield,
    XCircle,
} from 'lucide-react';

import { vibeTheme } from '../../../styles/theme';
import type { AgentStep, EnhancedAgentStep, StepStatus } from '../../../types';
import {
    ApprovalActions,
    ApprovalDetails,
    ApprovalPrompt,
    ApprovalTitle,
    Button,
    ConfidenceBadge,
    ConfidenceFactors,
    FactorItem,
    FallbackIndicator,
    FallbackItem,
    StepCard,
    StepContent,
    StepDescription,
    StepHeader,
    StepMeta,
    StepNumber,
    StepTitle,
} from './styled';
import type { PendingApproval } from './types';

interface StepCardViewProps {
    step: AgentStep;
    index: number;
    pendingApproval: PendingApproval | null;
    onApprove: () => void;
    onReject: () => void;
}

const getStepIcon = (status: StepStatus): ReactNode => {
    switch (status) {
        case 'in_progress':
            return <Loader2 className="animate-spin" />;
        case 'completed':
            return <CheckCircle2 />;
        case 'failed':
            return <XCircle />;
        case 'awaiting_approval':
            return <Shield />;
        case 'skipped':
            return <AlertTriangle />;
        default:
            return null;
    }
};

export const StepCardView = ({
    step,
    index,
    pendingApproval,
    onApprove,
    onReject,
}: StepCardViewProps) => {
    const resultData = step.result?.data as Record<string, unknown>;
    const isSynthesis = resultData?.isSynthesis === true;
    const hasAIReview = resultData?.generatedCode && step.status === 'completed';

    const enhancedStep = step as EnhancedAgentStep;
    const hasConfidence = enhancedStep.confidence !== undefined;
    const hasFallbacks = enhancedStep.fallbackPlans && enhancedStep.fallbackPlans.length > 0;

    return (
        <StepCard
            $status={step.status}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            style={isSynthesis ? {
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.15))',
                border: '2px solid rgba(139, 92, 246, 0.6)',
                boxShadow: '0 8px 32px rgba(139, 92, 246, 0.3)'
            } : hasAIReview ? {
                borderLeft: '4px solid rgba(139, 92, 246, 0.4)'
            } : undefined}
        >
            <StepHeader>
                <StepNumber $status={step.status}>
                    {getStepIcon(step.status) || step.order}
                </StepNumber>
                <StepContent>
                    <StepTitle>{step.title}</StepTitle>
                    <StepDescription>{step.description}</StepDescription>

                    {hasConfidence && enhancedStep.confidence && (
                        <div style={{ marginTop: '8px', marginBottom: '8px' }}>
                            <ConfidenceBadge $riskLevel={enhancedStep.confidence.riskLevel}>
                                {enhancedStep.confidence.riskLevel === 'low' && '✓'}
                                {enhancedStep.confidence.riskLevel === 'medium' && '⚠'}
                                {enhancedStep.confidence.riskLevel === 'high' && '⚠'}
                                {Math.round(enhancedStep.confidence.score)}% confidence
                                {enhancedStep.confidence.memoryBacked && ' • Memory-backed'}
                            </ConfidenceBadge>
                        </div>
                    )}

                    <StepMeta>
                        <div className="meta-item">
                            <Code />
                            {step.action.type.replace('_', ' ')}
                        </div>
                        {step.requiresApproval && (
                            <div className="meta-item">
                                <Shield />
                                Requires approval
                            </div>
                        )}
                        {step.retryCount > 0 && step.status !== 'failed' && (
                            <div className="meta-item" style={{ color: '#fb923c' }}>
                                <AlertTriangle />
                                Self-correcting (attempt {step.retryCount + 1})
                            </div>
                        )}
                        {step.result && (
                            <div className="meta-item">
                                {step.result.success ? <CheckCircle2 /> : <XCircle />}
                                {step.result.message}
                            </div>
                        )}
                    </StepMeta>
                </StepContent>
            </StepHeader>

            {hasConfidence && enhancedStep.confidence && enhancedStep.confidence.factors.length > 0 && (
                <ConfidenceFactors>
                    <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '8px', color: vibeTheme.colors.purple }}>
                        Confidence Factors
                    </div>
                    {enhancedStep.confidence.factors.map((factor, idx) => (
                        <FactorItem key={idx} $positive={factor.impact > 0}>
                            <span className="factor-icon">
                                {factor.impact > 0 ? '+' : ''}
                            </span>
                            <span className="factor-text">{factor.description}</span>
                            <span className="factor-impact">
                                {factor.impact > 0 ? '+' : ''}{factor.impact}
                            </span>
                        </FactorItem>
                    ))}
                </ConfidenceFactors>
            )}

            {hasFallbacks && enhancedStep.fallbackPlans && (
                <FallbackIndicator>
                    <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '8px', color: vibeTheme.colors.cyan }}>
                        {enhancedStep.fallbackPlans.length} Fallback Plan{enhancedStep.fallbackPlans.length > 1 ? 's' : ''} Available
                    </div>
                    {enhancedStep.fallbackPlans.map((fallback, idx) => (
                        <FallbackItem key={fallback.id}>
                            <div className="fallback-number">{idx + 1}</div>
                            <div className="fallback-content">
                                <div className="fallback-trigger">{fallback.trigger}</div>
                                <div>{fallback.reasoning}</div>
                                <div style={{ marginTop: '4px' }}>
                                    <span className="fallback-confidence">
                                        {fallback.confidence}% confidence
                                    </span>
                                </div>
                            </div>
                        </FallbackItem>
                    ))}
                </FallbackIndicator>
            )}

            {!!step.result?.data && step.status === 'completed' && (
                <ResultDataDisplay data={resultData} stepId={step.id} isSynthesis={isSynthesis} />
            )}

            {pendingApproval?.step.id === step.id && (
                <ApprovalPrompt
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                >
                    <ApprovalTitle>
                        <AlertCircle />
                        Approval Required
                    </ApprovalTitle>
                    <ApprovalDetails>
                        <div className="detail-label">Risk Level:</div>
                        {pendingApproval.request.impact.riskLevel.toUpperCase()}

                        <div className="detail-label" style={{ marginTop: 8 }}>Files Affected:</div>
                        {pendingApproval.request.impact.filesAffected.join(', ') || 'None'}

                        <div className="detail-label" style={{ marginTop: 8 }}>Reversible:</div>
                        {pendingApproval.request.impact.reversible ? 'Yes' : 'No'}
                    </ApprovalDetails>
                    <ApprovalActions>
                        <Button
                            $variant="success"
                            onClick={onApprove}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                        >
                            <CheckCircle2 />
                            Approve
                        </Button>
                        <Button
                            $variant="danger"
                            onClick={onReject}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                        >
                            <XCircle />
                            Reject
                        </Button>
                    </ApprovalActions>
                </ApprovalPrompt>
            )}
        </StepCard>
    );
};

interface ResultDataDisplayProps {
    data: Record<string, unknown>;
    stepId: string;
    isSynthesis: boolean;
}

const ResultDataDisplay = ({ data, stepId, isSynthesis }: ResultDataDisplayProps) => {
    return (
        <ApprovalPrompt
            key={`result-${stepId}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
        >
            <ApprovalTitle>
                <CheckCircle2 />
                Result Data
            </ApprovalTitle>
            <ApprovalDetails style={{ maxHeight: '400px', overflow: 'auto' }}>
                {!!data.thought && <ReActDisplay data={data} />}
                {!!data.content && (
                    <div>
                        <div style={{ marginBottom: '8px', fontWeight: 600, color: '#10b981' }}>
                            📄 File Content ({String(data.filePath ?? 'file')})
                        </div>
                        <pre style={{
                            fontSize: '12px',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            background: 'rgba(0,0,0,0.1)',
                            padding: '12px',
                            borderRadius: '4px',
                            margin: 0,
                            maxHeight: '300px',
                            overflow: 'auto'
                        }}>
                            {typeof data.content === 'string' ? data.content.slice(0, 5000) : String(JSON.stringify(data.content)).slice(0, 5000)}
                            {(typeof data.content === 'string' ? data.content.length : String(JSON.stringify(data.content)).length) > 5000 && '\n... (truncated)'}
                        </pre>
                    </div>
                )}
                {!!data.analysis && <AnalysisDisplay analysis={data.analysis as Record<string, unknown>} />}
                {!!data.generatedCode && (
                    <GeneratedCodeDisplay
                        generatedCode={data.generatedCode as string}
                        isSynthesis={isSynthesis || (data.isSynthesis as boolean)}
                    />
                )}
                {!!data.results && <SearchResultsDisplay results={data.results as unknown[]} />}
                {!data.content && !data.results && !data.analysis && !data.generatedCode && !data.thought ? (
                    <pre style={{ fontSize: '12px' }}>
                        {JSON.stringify(data, null, 2)}
                    </pre>
                ) : null}
            </ApprovalDetails>
        </ApprovalPrompt>
    );
};

interface ReActDisplayProps {
    data: Record<string, unknown>;
}

const ReActDisplay = ({ data }: ReActDisplayProps) => {
    const thought = data.thought as Record<string, unknown>;
    const reflection = data.reflection as Record<string, unknown> | undefined;
    const reActCycle = data.reActCycle as Record<string, unknown> | undefined;

    return (
        <div style={{ marginBottom: '16px', borderLeft: '3px solid #8b5cf6', paddingLeft: '12px' }}>
            <div style={{ marginBottom: '12px', fontWeight: 600, color: '#8b5cf6', fontSize: '13px' }}>
                💭 Chain-of-Thought Reasoning
            </div>
            <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#a78bfa', marginBottom: '4px' }}>
                    🧠 Thought
                </div>
                <div style={{ fontSize: '12px', marginBottom: '6px' }}>
                    <strong>Approach:</strong> {thought.approach as string}
                </div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '6px' }}>
                    {thought.reasoning as string}
                </div>
                <div style={{ fontSize: '11px' }}>
                    <span style={{ color: '#10b981' }}>Confidence: {thought.confidence as number}%</span>
                    {(thought.risks as string[])?.length > 0 && (
                        <span style={{ marginLeft: '12px', color: '#f59e0b' }}>
                            ⚠️ {(thought.risks as string[]).length} risk(s) identified
                        </span>
                    )}
                </div>
            </div>
            {reflection && (
                <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#a78bfa', marginBottom: '4px' }}>
                        🤔 Reflection
                    </div>
                    <div style={{ fontSize: '11px', marginBottom: '4px' }}>
                        <strong>Knowledge Gained:</strong> {reflection.knowledgeGained as string}
                    </div>
                    {(reflection.whatWorked as string[])?.length > 0 && (
                        <div style={{ fontSize: '11px', color: '#10b981', marginBottom: '2px' }}>
                            ✅ Worked: {(reflection.whatWorked as string[]).join(', ')}
                        </div>
                    )}
                    {(reflection.whatFailed as string[])?.length > 0 && (
                        <div style={{ fontSize: '11px', color: '#ef4444', marginBottom: '2px' }}>
                            ❌ Failed: {(reflection.whatFailed as string[]).join(', ')}
                        </div>
                    )}
                    {!!reflection.rootCause && (
                        <div style={{ fontSize: '11px', color: '#f59e0b', fontStyle: 'italic' }}>
                            Root Cause: {String(reflection.rootCause)}
                        </div>
                    )}
                </div>
            )}
            {reActCycle && (
                <details style={{ marginTop: '8px' }}>
                    <summary style={{ fontSize: '11px', cursor: 'pointer', color: '#6366f1' }}>
                        View Full ReAct Cycle (Cycle #{reActCycle.cycleNumber as number})
                    </summary>
                    <pre style={{
                        fontSize: '10px',
                        whiteSpace: 'pre-wrap',
                        background: 'rgba(139, 92, 246, 0.1)',
                        padding: '8px',
                        borderRadius: '4px',
                        marginTop: '8px',
                        maxHeight: '200px',
                        overflow: 'auto'
                    }}>
                        {JSON.stringify(reActCycle, null, 2)}
                    </pre>
                </details>
            )}
        </div>
    );
};

interface AnalysisDisplayProps {
    analysis: Record<string, unknown>;
}

const AnalysisDisplay = ({ analysis }: AnalysisDisplayProps) => (
    <div>
        <div style={{ marginBottom: '8px', fontWeight: 600, color: '#3b82f6' }}>
            📊 Code Analysis
        </div>
        <div style={{ fontSize: '12px', marginBottom: '8px' }}>
            <div>Path: {String(analysis.filePath ?? '')}</div>
            <div>Lines: {String(analysis.lines ?? 0)}</div>
            <div>Size: {String(analysis.size ?? 0)} bytes</div>
        </div>
        {!!analysis.content && (
            <pre style={{
                fontSize: '11px',
                whiteSpace: 'pre-wrap',
                background: 'rgba(0,0,0,0.1)',
                padding: '8px',
                borderRadius: '4px',
                maxHeight: '200px',
                overflow: 'auto'
            }}>
                {String(analysis.content).slice(0, 3000)}
                {String(analysis.content).length > 3000 && '\n... (truncated)'}
            </pre>
        )}
    </div>
);

interface GeneratedCodeDisplayProps {
    generatedCode: string;
    isSynthesis: boolean;
}

const GeneratedCodeDisplay = ({ generatedCode, isSynthesis }: GeneratedCodeDisplayProps) => (
    <div>
        <div style={{
            marginBottom: '8px',
            fontWeight: 700,
            fontSize: isSynthesis ? '16px' : '14px',
            color: isSynthesis ? '#a78bfa' : '#8b5cf6',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        }}>
            {isSynthesis ? '✨ Comprehensive Review Summary' : '🤖 AI Review/Analysis'}
            {isSynthesis && (
                <span style={{
                    background: 'rgba(139, 92, 246, 0.3)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 500
                }}>
                    AUTO-GENERATED
                </span>
            )}
        </div>
        <pre style={{
            fontSize: isSynthesis ? '14px' : '13px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            background: isSynthesis ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)',
            padding: isSynthesis ? '16px' : '12px',
            borderRadius: '4px',
            margin: 0,
            lineHeight: '1.7',
            border: isSynthesis ? '2px solid rgba(139, 92, 246, 0.5)' : '1px solid rgba(139, 92, 246, 0.3)',
            boxShadow: isSynthesis ? '0 4px 16px rgba(139, 92, 246, 0.2)' : 'none'
        }}>
            {generatedCode}
        </pre>
    </div>
);

interface SearchResultsDisplayProps {
    results: unknown[];
}

const SearchResultsDisplay = ({ results }: SearchResultsDisplayProps) => (
    <div>
        <div style={{ marginBottom: '8px', fontWeight: 600 }}>
            🔍 Found {results.length} matches
        </div>
        {results.slice(0, 10).map((result, idx) => (
            <div key={idx} style={{ marginBottom: '4px', fontSize: '12px' }}>
                {typeof result === 'string' ? result : JSON.stringify(result)}
            </div>
        ))}
        {results.length > 10 && (
            <div style={{ marginTop: '8px', fontStyle: 'italic' }}>
                ... and {results.length - 10} more
            </div>
        )}
    </div>
);
