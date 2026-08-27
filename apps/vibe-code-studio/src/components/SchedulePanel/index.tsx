/**
 * SchedulePanel — list of agent schedules with pause/resume/delete, run
 * history, and the create-with-preview flow. Reads the schedules zustand
 * store; mutations go through schedulerIntegration.
 * Spec: FEATURE_SPECS/competitive-gaps/16-AGENT-SCHEDULING.md
 */
import { CalendarClock, Pause, Pencil, Play, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { describeCadence } from '../../services/scheduling/cadence';
import type { ScheduleDefinition, ScheduleDraft } from '../../services/scheduling/types';
import { useSchedulesStore } from '../../stores/schedulesStore';
import { initialFromSchedule } from './cadenceFields';
import { CreateScheduleForm } from './CreateScheduleForm';
import * as S from './styled';

export interface SchedulePanelProps {
  isOpen: boolean;
  workspaceRoot: string | null;
  onClose: () => void;
  onCreate: (draft: ScheduleDraft) => void;
  onEdit: (id: string, draft: ScheduleDraft) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
}

const STATUS_COLOR: Record<ScheduleDefinition['status'], string> = {
  active: '#10b981',
  paused: '#f59e0b',
  completed: '#6b7280',
};

const RUN_COLOR: Record<string, string> = {
  running: '#3b82f6',
  completed: '#10b981',
  failed: '#ef4444',
  skipped: '#f59e0b',
};

const formatNextRun = (schedule: ScheduleDefinition): string => {
  if (schedule.status === 'paused') return 'paused';
  if (schedule.nextRunAtMs === null) return '—';
  return new Date(schedule.nextRunAtMs).toLocaleString();
};

export const SchedulePanel = ({
  isOpen,
  workspaceRoot,
  onClose,
  onCreate,
  onEdit,
  onPause,
  onResume,
  onDelete,
}: SchedulePanelProps) => {
  const schedules = useSchedulesStore(state => state.schedules);
  const createPrefill = useSchedulesStore(state => state.createPrefill);
  const clearCreatePrefill = useSchedulesStore(state => state.actions.clearCreatePrefill);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const showCreateForm = (creating || createPrefill !== null) && !!workspaceRoot;
  const closeCreateForm = (): void => {
    setCreating(false);
    clearCreatePrefill();
  };

  return (
    <S.PanelContainer data-testid="schedule-panel">
      <S.PanelHeader>
        <S.HeaderTitle>
          <CalendarClock size={16} />
          Scheduled Agent Tasks
        </S.HeaderTitle>
        <S.HeaderActions>
          <S.IconButton
            onClick={() => setCreating(open => !open)}
            title={workspaceRoot ? 'New schedule' : 'Open a workspace first'}
            aria-label="New schedule"
            disabled={!workspaceRoot}
          >
            <Plus size={16} />
          </S.IconButton>
          <S.IconButton onClick={onClose} title="Close panel" aria-label="Close schedule panel">
            <X size={16} />
          </S.IconButton>
        </S.HeaderActions>
      </S.PanelHeader>

      {showCreateForm && workspaceRoot && (
        <CreateScheduleForm
          key={createPrefill ?? 'new-schedule'}
          workspaceRoot={workspaceRoot}
          initial={createPrefill ? { userRequest: createPrefill } : undefined}
          onSubmit={draft => {
            onCreate(draft);
            closeCreateForm();
          }}
          onCancel={closeCreateForm}
        />
      )}

      <S.ScheduleList>
        {schedules.length === 0 ? (
          <S.EmptyState>
            <CalendarClock size={32} />
            No schedules yet. Create one to run agent tasks later or on a cadence.
          </S.EmptyState>
        ) : (
          schedules.map(schedule => (
            <S.ScheduleCard key={schedule.id} data-testid={`schedule-card-${schedule.id}`}>
              <S.CardHeader>
                <S.StatusBadge $color={STATUS_COLOR[schedule.status]}>
                  {schedule.status}
                </S.StatusBadge>
                <S.CardActions>
                  {schedule.status === 'active' && (
                    <S.IconButton
                      onClick={() => onPause(schedule.id)}
                      title="Pause"
                      aria-label={`Pause ${schedule.userRequest}`}
                    >
                      <Pause size={14} />
                    </S.IconButton>
                  )}
                  {schedule.status === 'paused' && (
                    <S.IconButton
                      onClick={() => onResume(schedule.id)}
                      title="Resume"
                      aria-label={`Resume ${schedule.userRequest}`}
                    >
                      <Play size={14} />
                    </S.IconButton>
                  )}
                  <S.IconButton
                    onClick={() => setEditingId(id => (id === schedule.id ? null : schedule.id))}
                    title="Edit"
                    aria-label={`Edit ${schedule.userRequest}`}
                  >
                    <Pencil size={14} />
                  </S.IconButton>
                  <S.IconButton
                    onClick={() => onDelete(schedule.id)}
                    title="Delete"
                    aria-label={`Delete ${schedule.userRequest}`}
                  >
                    <Trash2 size={14} />
                  </S.IconButton>
                </S.CardActions>
              </S.CardHeader>
              {editingId === schedule.id ? (
                <CreateScheduleForm
                  workspaceRoot={schedule.workspaceRoot}
                  initial={initialFromSchedule(schedule)}
                  submitLabel="Save changes"
                  onSubmit={draft => {
                    onEdit(schedule.id, draft);
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <>
                  <S.CardTitle>{schedule.userRequest}</S.CardTitle>
                  <S.CardMeta>
                    <span>{describeCadence(schedule.cadence)}</span>
                    <span>Agent: {schedule.agentId}</span>
                    <span>Next: {formatNextRun(schedule)}</span>
                  </S.CardMeta>
                </>
              )}
              {editingId !== schedule.id && schedule.runs.length > 0 && (
                <S.RunHistory>
                  {schedule.runs.map(run => (
                    <S.RunRow key={run.id}>
                      <S.StatusBadge $color={RUN_COLOR[run.status] ?? '#888'}>
                        {run.status}
                      </S.StatusBadge>
                      <span>{new Date(run.startedAt).toLocaleString()}</span>
                      {run.durationMs !== undefined && (
                        <span>{Math.round(run.durationMs / 1000)}s</span>
                      )}
                      {run.error && <span title={run.error}>⚠ {run.error}</span>}
                    </S.RunRow>
                  ))}
                </S.RunHistory>
              )}
            </S.ScheduleCard>
          ))
        )}
      </S.ScheduleList>
    </S.PanelContainer>
  );
};
