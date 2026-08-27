/**
 * CreateScheduleForm — two-step schedule creation: edit → preview → confirm.
 * The preview step (spec AC #12) shows exactly what
 * BackgroundAgentSystem.submit will be called with before anything persists.
 * Spec: FEATURE_SPECS/competitive-gaps/16-AGENT-SCHEDULING.md
 */
import { useState } from 'react';
import { describeCadence, validateCadence } from '../../services/scheduling/cadence';
import { buildSubmitPreview } from '../../services/scheduling/schedulerIntegration';
import type { MissedRunPolicy, ScheduleDraft } from '../../services/scheduling/types';
import { cadenceFromFields, DAY_OPTIONS, DEFAULT_CADENCE_FIELDS } from './cadenceFields';
import type { CadenceFields, ScheduleFormInitial } from './cadenceFields';
import * as S from './styled';

export interface CreateScheduleFormProps {
  workspaceRoot: string;
  /** Prefill (create-from-chat) or existing values (edit) */
  initial?: Partial<ScheduleFormInitial>;
  /** Confirm-button label; defaults to the create wording */
  submitLabel?: string;
  onSubmit: (draft: ScheduleDraft) => void;
  onCancel: () => void;
}

export const CreateScheduleForm = ({
  workspaceRoot,
  initial,
  submitLabel = 'Create schedule',
  onSubmit,
  onCancel,
}: CreateScheduleFormProps) => {
  const [agentId, setAgentId] = useState(initial?.agentId ?? 'general');
  const [userRequest, setUserRequest] = useState(initial?.userRequest ?? '');
  const [missedRunPolicy, setMissedRunPolicy] = useState<MissedRunPolicy>(
    initial?.missedRunPolicy ?? 'run-on-launch'
  );
  const [fields, setFields] = useState<CadenceFields>(initial?.fields ?? DEFAULT_CADENCE_FIELDS);
  const [error, setError] = useState<string | null>(null);
  const [previewDraft, setPreviewDraft] = useState<ScheduleDraft | null>(null);

  const buildDraft = (): ScheduleDraft | null => {
    if (!userRequest.trim()) {
      setError('Task description is required');
      return null;
    }
    if (fields.type === 'once' && !fields.runAt) {
      setError('Pick a run time');
      return null;
    }
    const cadence = cadenceFromFields(fields);
    const cadenceError = validateCadence(cadence, Date.now());
    if (cadenceError) {
      setError(cadenceError);
      return null;
    }
    setError(null);
    return {
      agentId: agentId.trim() || 'general',
      userRequest: userRequest.trim(),
      workspaceRoot,
      cadence,
      missedRunPolicy,
    };
  };

  const handlePreview = (): void => {
    const draft = buildDraft();
    if (draft) setPreviewDraft(draft);
  };

  if (previewDraft) {
    return (
      <S.FormSection data-testid="schedule-preview">
        <S.FieldLabel>
          This schedule will call ({describeCadence(previewDraft.cadence)}):
        </S.FieldLabel>
        <S.PreviewBlock>{buildSubmitPreview(previewDraft)}</S.PreviewBlock>
        <S.ButtonRow>
          <S.SecondaryButton onClick={() => setPreviewDraft(null)}>Back</S.SecondaryButton>
          <S.PrimaryButton onClick={() => onSubmit(previewDraft)}>{submitLabel}</S.PrimaryButton>
        </S.ButtonRow>
      </S.FormSection>
    );
  }

  return (
    <S.FormSection data-testid="schedule-form">
      <S.FieldLabel>
        Task description
        <S.TextArea
          value={userRequest}
          onChange={e => setUserRequest(e.target.value)}
          placeholder="e.g. Run the dependency audit and summarize findings"
          data-testid="schedule-request"
        />
      </S.FieldLabel>
      <S.FieldRow>
        <S.FieldLabel>
          Agent
          <S.TextInput
            value={agentId}
            onChange={e => setAgentId(e.target.value)}
            data-testid="schedule-agent"
          />
        </S.FieldLabel>
        <S.FieldLabel>
          If missed while closed
          <S.Select
            value={missedRunPolicy}
            onChange={e => setMissedRunPolicy(e.target.value as MissedRunPolicy)}
            data-testid="schedule-policy"
          >
            <option value="run-on-launch">Run on next launch</option>
            <option value="skip">Skip to next occurrence</option>
          </S.Select>
        </S.FieldLabel>
      </S.FieldRow>
      <S.FieldRow>
        <S.FieldLabel>
          Repeat
          <S.Select
            value={fields.type}
            onChange={e => setFields({ ...fields, type: e.target.value as CadenceFields['type'] })}
            data-testid="schedule-cadence-type"
          >
            <option value="once">Once</option>
            <option value="interval">Every N minutes</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </S.Select>
        </S.FieldLabel>
        {fields.type === 'once' && (
          <S.FieldLabel>
            Run at
            <S.TextInput
              type="datetime-local"
              value={fields.runAt}
              onChange={e => setFields({ ...fields, runAt: e.target.value })}
              data-testid="schedule-runat"
            />
          </S.FieldLabel>
        )}
        {fields.type === 'interval' && (
          <S.FieldLabel>
            Minutes
            <S.TextInput
              type="number"
              min={1}
              value={fields.everyMinutes}
              onChange={e => setFields({ ...fields, everyMinutes: e.target.value })}
              data-testid="schedule-interval"
            />
          </S.FieldLabel>
        )}
        {(fields.type === 'daily' || fields.type === 'weekly') && (
          <S.FieldLabel>
            Time
            <S.TextInput
              type="time"
              value={fields.time}
              onChange={e => setFields({ ...fields, time: e.target.value })}
              data-testid="schedule-time"
            />
          </S.FieldLabel>
        )}
        {fields.type === 'weekly' && (
          <S.FieldLabel>
            Day
            <S.Select
              value={fields.dayOfWeek}
              onChange={e => setFields({ ...fields, dayOfWeek: e.target.value })}
              data-testid="schedule-day"
            >
              {DAY_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </S.Select>
          </S.FieldLabel>
        )}
      </S.FieldRow>
      {error && <S.ErrorText data-testid="schedule-error">{error}</S.ErrorText>}
      <S.ButtonRow>
        <S.SecondaryButton onClick={onCancel}>Cancel</S.SecondaryButton>
        <S.PrimaryButton onClick={handlePreview} data-testid="schedule-preview-button">
          Preview
        </S.PrimaryButton>
      </S.ButtonRow>
    </S.FormSection>
  );
};
