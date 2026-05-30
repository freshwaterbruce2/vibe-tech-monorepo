import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Eye, EyeOff, Plus, Check, AlertTriangle, Search, Filter } from 'lucide-react';
import { Panel } from '@renderer/components/Panel';
import { useEnvConfigs, useUpdateEnvConfig } from '@renderer/hooks';

export function EnvConfigPanel() {
  const queryClient = useQueryClient();
  const { data: configs = [], isFetching, error } = useEnvConfigs();
  const updateMutation = useUpdateEnvConfig();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterMissingOnly, setFilterMissingOnly] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  // For adding/editing an env var
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [targetFile, setTargetFile] = useState<'.env' | '.env.local'>('.env.local');
  const [writeError, setWriteError] = useState<string | null>(null);
  const [writeSuccess, setWriteSuccess] = useState<boolean>(false);

  // Control masking of secret values
  const [maskedKeys, setMaskedKeys] = useState<Record<string, boolean>>({});

  const filteredConfigs = useMemo(() => {
    return configs.filter((c) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = c.projectName.toLowerCase().includes(searchLower) ||
                            c.projectRoot.toLowerCase().includes(searchLower) ||
                            Object.keys(c.values).some((k) => k.toLowerCase().includes(searchLower)) ||
                            Object.values(c.values).some((v) => v.resolvedValue?.toLowerCase().includes(searchLower));
      const matchesMissing = !filterMissingOnly || c.missingKeys.length > 0;
      return matchesSearch && matchesMissing;
    });
  }, [configs, searchTerm, filterMissingOnly]);

  const activeProject = useMemo(() => {
    return configs.find((c) => c.projectRoot === selectedProject) ?? null;
  }, [configs, selectedProject]);

  const isEditingExisting = useMemo(() => {
    if (!activeProject || !newKey.trim()) return false;
    return Object.prototype.hasOwnProperty.call(activeProject.values, newKey.trim());
  }, [activeProject, newKey]);

  const toggleMask = (key: string) => {
    setMaskedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleUpdateVar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newKey.trim()) return;

    setWriteError(null);
    setWriteSuccess(false);

    try {
      await updateMutation.mutateAsync({
        projectRoot: selectedProject,
        file: targetFile,
        key: newKey.trim(),
        value: newValue,
      });

      setWriteSuccess(true);
      setNewKey('');
      setNewValue('');
      await queryClient.invalidateQueries({ queryKey: ['env', 'configs'] });
    } catch (err: unknown) {
      setWriteError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleQuickFix = async (projectRoot: string, key: string, defaultValue: string) => {
    try {
      await updateMutation.mutateAsync({
        projectRoot,
        file: '.env.local',
        key,
        value: defaultValue,
      });
      await queryClient.invalidateQueries({ queryKey: ['env', 'configs'] });
    } catch (err) {
      console.error('Quick fix failed', err);
    }
  };

  const startEdit = (key: string, currentValue: string | null, preferFile?: '.env' | '.env.local') => {
    setNewKey(key);
    setNewValue(currentValue ?? '');
    if (preferFile) {
      setTargetFile(preferFile);
    }
    setWriteSuccess(false);
    setWriteError(null);
  };

  return (
    <Panel
      title="Secrets & Env Manager"
      loading={isFetching}
      error={error instanceof Error ? error.message : null}
      onRefresh={() => {
        void queryClient.invalidateQueries({ queryKey: ['env', 'configs'] });
      }}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        {/* Left Side: Projects Grid */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 bg-bg-elev border border-bg-line p-3 rounded-lg">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter apps, keys or values..."
                className="w-full bg-bg-panel border border-bg-line rounded pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-pulse-cyan-700"
              />
            </div>

            <button
              onClick={() => setFilterMissingOnly(!filterMissingOnly)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border transition-colors',
                filterMissingOnly
                  ? 'border-status-warn/30 bg-status-warn/10 text-status-warn'
                  : 'border-bg-line bg-bg-panel text-slate-400 hover:border-pulse-cyan-700'
              )}
            >
              <Filter size={12} />
              <span>Missing Keys Only</span>
            </button>
          </div>

          {configs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-bg-line p-8 text-center text-sm text-slate-500 bg-bg-elev/40">
              No applications found in the monorepo.
            </div>
          ) : filteredConfigs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-bg-line p-8 text-center text-sm text-slate-500 bg-bg-elev/40">
              No applications match your search or filter criteria.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredConfigs.map((project) => {
                const isSelected = selectedProject === project.projectRoot;
                return (
                  <div
                    key={project.projectRoot}
                    onClick={() => setSelectedProject(project.projectRoot)}
                    className={clsx(
                      'p-4 rounded-xl border cursor-pointer transition-all duration-200',
                      isSelected
                        ? 'border-pulse-cyan bg-pulse-cyan-900/10 shadow-glow-cyan/5'
                        : 'border-bg-line bg-bg-elev hover:border-pulse-cyan-700/50'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-200">{project.projectName}</h3>
                        <p className="font-mono text-[10px] text-slate-500">{project.projectRoot}</p>
                      </div>
                      {project.missingKeys.length > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-status-warn bg-status-warn/10 border border-status-warn/20 px-2 py-0.5 rounded-full">
                          <AlertTriangle size={10} />
                          {project.missingKeys.length} missing
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex gap-2 text-[10px] text-slate-400">
                      <span className={clsx('px-1.5 py-0.5 rounded', project.envExists ? 'bg-indigo-950/40 text-indigo-400 border border-indigo-900/30' : 'bg-slate-900 text-slate-600')}>.env</span>
                      <span className={clsx('px-1.5 py-0.5 rounded', project.envLocalExists ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' : 'bg-slate-900 text-slate-600')}>.env.local</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right Side: Environment Variables Editor */}
        <section className="space-y-4">
          {activeProject ? (
            <div className="rounded-xl border border-bg-line bg-bg-elev p-5 space-y-5">
              <div>
                <h2 className="text-base font-semibold text-slate-100">{activeProject.projectName}</h2>
                <p className="font-mono text-xs text-slate-500 mt-1">{activeProject.projectRoot}</p>
              </div>

              {/* Missing Keys Warnings */}
              {activeProject.missingKeys.length > 0 && (
                <div className="border border-status-warn/20 bg-status-warn/5 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-status-warn">
                    <AlertTriangle size={14} />
                    <span>Required values missing from `.env.local` / `.env`</span>
                  </div>
                  <div className="space-y-1.5">
                    {activeProject.missingKeys.map((key) => (
                      <div key={key} className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-mono text-slate-300">{key}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(key, '', '.env.local')}
                            className="text-[10px] text-pulse-cyan hover:underline font-semibold"
                          >
                            Configure
                          </button>
                          <button
                            onClick={() => handleQuickFix(activeProject.projectRoot, key, 'placeholder_change_me')}
                            className="text-[10px] text-slate-500 hover:text-slate-300 hover:underline"
                          >
                            Quick scaffold
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Set/Edit variable Form */}
              <form onSubmit={handleUpdateVar} className="border-t border-bg-line pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-300">
                    {isEditingExisting ? 'Edit Environment Variable' : 'Set Environment Variable'}
                  </div>
                  {newKey.trim() !== '' && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewKey('');
                        setNewValue('');
                      }}
                      className="text-[10px] text-slate-500 hover:text-slate-300"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="grid gap-2">
                  <input
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="KEY (e.g. STRIPE_SECRET_KEY)"
                    className="w-full bg-bg-panel border border-bg-line rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-pulse-cyan animate-transition"
                    required
                  />
                  <input
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder="VALUE"
                    type="text"
                    className="w-full bg-bg-panel border border-bg-line rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-pulse-cyan animate-transition"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTargetFile('.env.local')}
                      className={clsx(
                        'px-2 py-1 rounded text-[10px] border transition-colors',
                        targetFile === '.env.local'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : 'border-bg-line bg-bg-panel text-slate-400'
                      )}
                    >
                      .env.local (override)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetFile('.env')}
                      className={clsx(
                        'px-2 py-1 rounded text-[10px] border transition-colors',
                        targetFile === '.env'
                          ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400'
                          : 'border-bg-line bg-bg-panel text-slate-400'
                      )}
                    >
                      .env (base)
                    </button>
                  </div>

                  <button type="submit" className="btn btn-primary text-xs py-1 px-3">
                    {isEditingExisting ? <Check size={12} /> : <Plus size={12} />}
                    <span>{isEditingExisting ? 'Update key' : 'Save key'}</span>
                  </button>
                </div>

                {writeSuccess && (
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                    <Check size={12} />
                    <span>Variable saved successfully!</span>
                  </div>
                )}
                {writeError && (
                  <div className="text-[10px] text-status-error">
                    {writeError}
                  </div>
                )}
              </form>

              {/* Variables List */}
              <div className="border-t border-bg-line pt-4 space-y-2">
                <div className="text-xs font-semibold text-slate-300">Active Configurations</div>
                {Object.keys(activeProject.values).length === 0 ? (
                  <div className="text-xs text-slate-500 py-4 italic text-center bg-bg-panel/40 rounded-lg border border-bg-line/50">
                    No environment variables defined. Add a new key using the form above.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/40 max-h-64 overflow-y-auto pr-1">
                    {Object.entries(activeProject.values).map(([key, item]) => {
                      const isMasked = maskedKeys[key] !== false;
                      const displayVal = item.resolvedValue
                        ? isMasked
                          ? '••••••••••••••••'
                          : item.resolvedValue
                        : '(empty)';

                      return (
                        <div key={key} className="py-2.5 space-y-1 hover:bg-bg-panel/30 px-2 rounded-lg transition-colors group">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-mono font-semibold text-slate-200">{key}</span>
                            <div className="flex items-center gap-1">
                              {item.isPlaceholder && (
                                <span className="text-[9px] uppercase tracking-wider text-status-warn bg-status-warn/5 border border-status-warn/20 px-1 rounded">
                                  placeholder
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => toggleMask(key)}
                                className="p-1 text-slate-500 hover:text-slate-300"
                                title={isMasked ? 'Show value' : 'Hide value'}
                              >
                                {isMasked ? <Eye size={12} /> : <EyeOff size={12} />}
                              </button>
                              <button
                                type="button"
                                onClick={() => startEdit(key, item.resolvedValue, item.envLocalValue ? '.env.local' : '.env')}
                                className="text-[10px] text-pulse-cyan opacity-0 group-hover:opacity-100 hover:underline px-1 transition-opacity"
                              >
                                Edit
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1 text-[10px] text-slate-400">
                            <div className="font-mono break-all text-slate-300">{displayVal}</div>
                            <div className="flex gap-2 text-[9px] text-slate-500">
                              {item.envLocalValue && <span>local: {item.envLocalValue}</span>}
                              {item.envValue && <span>base: {item.envValue}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-bg-line p-8 text-center text-sm text-slate-500">
              Select an application on the left to manage its environment secrets.
            </div>
          )}
        </section>
      </div>
    </Panel>
  );
}
