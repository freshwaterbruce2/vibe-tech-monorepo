/**
 * AIChat StepCard Component
 * Memoized component for rendering agent task steps
 */
import { memo } from 'react';

import { vibeTheme } from '../../styles/theme';

import { getStepIcon } from './StepCard.helpers';
import {
  ApprovalButton,
  ApprovalPromptCompact,
  CompactStepCard,
  StepDescriptionCompact,
  StepHeaderCompact,
  StepIconCompact,
  StepTitleCompact,
} from './styled';
import type { MemoizedStepCardProps } from './types';

function StepCardComponent({
  messageId,
  step,
  pendingApproval,
  handleApproval,
}: MemoizedStepCardProps) {
  const approvalIdentity =
    pendingApproval?.taskId === step.taskId &&
    pendingApproval.stepId === step.id &&
    pendingApproval.proposalId
      ? {
          messageId,
          taskId: pendingApproval.taskId,
          stepId: pendingApproval.stepId,
          proposalId: pendingApproval.proposalId,
        }
      : null;

  return (
    <CompactStepCard
      $status={step.status}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      data-testid="step-card"
      data-status={step.status}
    >
      <StepHeaderCompact>
        <StepIconCompact $status={step.status} data-testid="step-status" data-status={step.status}>
          {getStepIcon(step.status)}
        </StepIconCompact>
        <StepTitleCompact>{step.title}</StepTitleCompact>
      </StepHeaderCompact>
      {step.description && <StepDescriptionCompact>{step.description}</StepDescriptionCompact>}
      {approvalIdentity && pendingApproval && handleApproval && (
        <ApprovalPromptCompact
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          aria-label={`Approval required for ${step.title}`}
        >
          <div style={{ fontSize: '12px', marginBottom: '8px', color: vibeTheme.colors.text }}>
            <strong>Approval Required</strong>
            <div style={{ marginTop: '4px' }}>
              Review the exact proposal, then approve or reject it before execution can continue.
            </div>
            <div style={{ marginTop: '4px' }}>
              Action: <code>{pendingApproval.action.type}</code>
            </div>
            <div style={{ marginTop: '4px' }}>{pendingApproval.reasoning}</div>
            <div style={{ marginTop: '4px' }}>
              Risk: {pendingApproval.impact.riskLevel} | Affected:{' '}
              {pendingApproval.impact.filesAffected.length} files
            </div>
            {pendingApproval.impact.filesAffected.length > 0 && (
              <ul aria-label="Affected paths" style={{ margin: '8px 0', paddingLeft: '20px' }}>
                {pendingApproval.impact.filesAffected.map(filePath => (
                  <li key={filePath}>
                    <code>{filePath}</code>
                  </li>
                ))}
              </ul>
            )}
            {pendingApproval.diff && (
              <pre
                aria-label="Proposed changes"
                style={{
                  margin: '8px 0',
                  padding: '8px',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {pendingApproval.diff}
              </pre>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <ApprovalButton
              type="button"
              onClick={() => handleApproval(approvalIdentity, true)}
              $variant="approve"
            >
              Approve
            </ApprovalButton>
            <ApprovalButton
              type="button"
              onClick={() => handleApproval(approvalIdentity, false)}
              $variant="reject"
            >
              Reject
            </ApprovalButton>
          </div>
        </ApprovalPromptCompact>
      )}
    </CompactStepCard>
  );
}

export const MemoizedStepCard = memo<MemoizedStepCardProps>(
  StepCardComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.messageId === nextProps.messageId &&
      prevProps.step === nextProps.step &&
      prevProps.pendingApproval === nextProps.pendingApproval &&
      prevProps.handleApproval === nextProps.handleApproval
    );
  }
);

MemoizedStepCard.displayName = 'MemoizedStepCard';
export default MemoizedStepCard;
