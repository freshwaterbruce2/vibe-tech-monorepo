import { Clock, GripVertical, Plus, Save, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { createSchedule, deleteSchedule, updateSchedule } from '../../services/scheduleService';
import type { CreateSchedulePayload, DailySchedule, ScheduleStep, ScheduleType } from '../../types/schedule';

interface ScheduleEditorProps {
  scheduleType: ScheduleType;
  existingSchedule?: DailySchedule;
  onSave: () => void;
  onCancel: () => void;
}

const ScheduleEditor = ({
  scheduleType,
  existingSchedule,
  onSave,
  onCancel,
}: ScheduleEditorProps) => {
  const [title, setTitle] = useState(existingSchedule?.title ?? `${scheduleType === 'morning' ? 'Morning' : 'Evening'} Routine`);
  const [description, setDescription] = useState(existingSchedule?.description ?? '');
  const [steps, setSteps] = useState<Omit<ScheduleStep, 'status' | 'completedAt'>[]>(
    existingSchedule?.steps.map(s => ({
      id: s.id,
      title: s.title,
      description: s.description,
      estimatedMinutes: s.estimatedMinutes,
      microsteps: s.microsteps,
      order: s.order,
    })) ?? []
  );
  const [saving, setSaving] = useState(false);

  const addStep = () => {
    const newStep: Omit<ScheduleStep, 'status' | 'completedAt'> = {
      id: `step_${Date.now()}`,
      title: '',
      description: '',
      estimatedMinutes: 5,
      microsteps: [],
      order: steps.length,
    };
    setSteps([...steps, newStep]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: keyof Omit<ScheduleStep, 'id' | 'status' | 'completedAt'>, value: string | number | string[]) => {
    setSteps(steps.map((step, i) => (i === index ? { ...step, [field]: value } : step)));
  };

  const addMicrostep = (stepIndex: number) => {
    setSteps(
      steps.map((step, i) =>
        i === stepIndex
          ? { ...step, microsteps: [...(step.microsteps ?? []), ''] }
          : step
      )
    );
  };

  const updateMicrostep = (stepIndex: number, microstepIndex: number, value: string) => {
    setSteps(
      steps.map((step, i) =>
        i === stepIndex
          ? {
              ...step,
              microsteps: step.microsteps?.map((ms, mi) => (mi === microstepIndex ? value : ms)),
            }
          : step
      )
    );
  };

  const removeMicrostep = (stepIndex: number, microstepIndex: number) => {
    setSteps(
      steps.map((step, i) =>
        i === stepIndex
          ? {
              ...step,
              microsteps: step.microsteps?.filter((_, mi) => mi !== microstepIndex),
            }
          : step
      )
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter a title for the schedule.');
      return;
    }

    if (steps.length === 0) {
      alert('Please add at least one step.');
      return;
    }

    // Validate step titles
    const emptySteps = steps.filter(s => !s.title.trim());
    if (emptySteps.length > 0) {
      alert('All steps must have a title.');
      return;
    }

    setSaving(true);
    try {
      if (existingSchedule) {
        // Update existing
        await updateSchedule(existingSchedule.id, {
          title,
          description,
          steps: steps.map((s, idx) => ({
            ...s,
            order: idx,
            status: 'pending' as const,
          })),
        });
      } else {
        // Create new
        const payload: CreateSchedulePayload = {
          type: scheduleType,
          title,
          description,
          steps: steps.map((s, idx) => ({
            title: s.title,
            description: s.description,
            estimatedMinutes: s.estimatedMinutes,
            microsteps: s.microsteps,
            order: idx,
          })),
        };
        await createSchedule(payload);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save schedule:', error);
      alert('Failed to save schedule. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingSchedule) return;
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    setSaving(true);
    try {
      await deleteSchedule(existingSchedule.id);
      onSave();
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      alert('Failed to delete schedule. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="glass-card p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">
              {existingSchedule ? 'Edit' : 'Create'} {scheduleType === 'morning' ? 'Morning' : 'Evening'} Schedule
            </h2>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white/70" />
            </button>
          </div>

          {/* Schedule Info */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-white/80 mb-2">Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., Morning Routine"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white/80 mb-2">Description (optional)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                placeholder="e.g., Get ready for school"
              />
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Steps</h3>
              <button
                onClick={addStep}
                className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-purple-600 rounded-lg text-sm font-semibold hover:scale-105 transition-transform"
              >
                <Plus className="w-4 h-4" />
                Add Step
              </button>
            </div>

            {steps.length === 0 ? (
              <div className="text-center py-8 text-white/60">
                No steps yet. Click "Add Step" to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {steps.map((step, stepIndex) => (
                  <div key={step.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <GripVertical className="w-5 h-5 text-white/40 flex-shrink-0 mt-2 cursor-move" />
                      <div className="flex-1 space-y-3">
                        {/* Step title and time */}
                        <div className="flex gap-3">
                          <input
                            type="text"
                            value={step.title}
                            onChange={e => updateStep(stepIndex, 'title', e.target.value)}
                            className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            placeholder="Step title"
                          />
                          <div className="flex items-center gap-2 px-3 bg-white/10 border border-white/20 rounded">
                            <Clock className="w-4 h-4 text-white/60" />
                            <input
                              type="number"
                              value={step.estimatedMinutes ?? ''}
                              onChange={e =>
                                updateStep(stepIndex, 'estimatedMinutes', parseInt(e.target.value) || 0)
                              }
                              className="w-16 bg-transparent text-white text-center focus:outline-none"
                              placeholder="5"
                              min="1"
                            />
                            <span className="text-white/60 text-sm">min</span>
                          </div>
                        </div>

                        {/* Step description */}
                        <input
                          type="text"
                          value={step.description ?? ''}
                          onChange={e => updateStep(stepIndex, 'description', e.target.value)}
                          className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-white/80 placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                          placeholder="Optional description"
                        />

                        {/* Microsteps */}
                        {step.microsteps && step.microsteps.length > 0 && (
                          <div className="space-y-2 pl-4 border-l-2 border-purple-600/30">
                            {step.microsteps.map((microstep, microstepIndex) => (
                              <div key={microstepIndex} className="flex gap-2">
                                <span className="text-purple-400 flex-shrink-0">•</span>
                                <input
                                  type="text"
                                  value={microstep}
                                  onChange={e => updateMicrostep(stepIndex, microstepIndex, e.target.value)}
                                  className="flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                  placeholder="Sub-step"
                                />
                                <button
                                  onClick={() => removeMicrostep(stepIndex, microstepIndex)}
                                  className="p-1 hover:bg-red-600/20 rounded transition-colors"
                                >
                                  <X className="w-4 h-4 text-red-400" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <button
                          onClick={() => addMicrostep(stepIndex)}
                          className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                        >
                          + Add sub-step
                        </button>
                      </div>

                      <button
                        onClick={() => removeStep(stepIndex)}
                        className="p-2 hover:bg-red-600/20 rounded transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <div>
              {existingSchedule && (
                <button
                  onClick={() => { void handleDelete(); }}
                  disabled={saving}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg font-semibold transition-colors"
                >
                  Delete Schedule
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                disabled={saving}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { void handleSave(); }}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-purple-600 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 rounded-lg font-semibold transition-transform"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Schedule
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleEditor;
