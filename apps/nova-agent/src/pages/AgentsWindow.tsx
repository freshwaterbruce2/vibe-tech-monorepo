import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Command } from '@tauri-apps/plugin-shell';
import { 
  Bot, 
  GitPullRequest, 
  GitMerge, 
  X, 
  RefreshCw, 
  Layers, 
  Cpu, 
  Eye, 
  Play, 
  Terminal,
  AlertTriangle
} from 'lucide-react';
// eslint-disable-next-line @nx/enforce-module-boundaries -- same-app import via the '@/' alias; the rule misreads it as cross-app
import { Button } from '@/components/ui/button';
// eslint-disable-next-line @nx/enforce-module-boundaries -- same-app import via the '@/' alias; the rule misreads it as cross-app
import { Card } from '@/components/ui/card';
// eslint-disable-next-line @nx/enforce-module-boundaries -- same-app import via the '@/' alias; the rule misreads it as cross-app
import { Input } from '@/components/ui/input';

interface SubtaskStatus {
  id: string;
  title: string;
  description: string;
  assigned_agent: string;
  dependencies: string[];
  status: string; // "pending", "running", "completed", "failed"
  log: string;
  worktree_path: string | null;
  branch_name: string | null;
}

interface MultitaskStatus {
  task_id: string;
  prompt: string;
  subtasks: SubtaskStatus[];
  overall_status: string; // "running", "completed", "failed"
}

export default function AgentsWindow() {
  const [multitasks, setMultitasks] = useState<MultitaskStatus[]>([]);
  const [selectedTask, setSelectedTask] = useState<MultitaskStatus | null>(null);
  const [newPrompt, setNewPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Diff viewer state
  const [selectedSubtask, setSelectedSubtask] = useState<SubtaskStatus | null>(null);
  const [activeDiff, setActiveDiff] = useState<string>('');
  const [isViewingDiff, setIsViewingDiff] = useState(false);

  // Load all multitasks at startup
  const loadMultitasks = useCallback(async () => {
    try {
      const list = await invoke<MultitaskStatus[]>('list_active_multitasks');
      setMultitasks(list);
      // Update selected task if it is open
      if (selectedTask) {
        const updated = list.find(t => t.task_id === selectedTask.task_id);
        if (updated) {
          setSelectedTask(updated);
        }
      }
    } catch (e) {
      console.error('Failed to load multitasks:', e);
    }
  }, [selectedTask]);

  useEffect(() => {
    void loadMultitasks();

    // Listen to real-time status updates from the Rust backend
    const unlistenPromise = listen<MultitaskStatus>('multitask-status', (event) => {
      const updatedTask = event.payload;
      setMultitasks((prev) => {
        const index = prev.findIndex(t => t.task_id === updatedTask.task_id);
        if (index !== -1) {
          const next = [...prev];
          next[index] = updatedTask;
          return next;
        } else {
          return [...prev, updatedTask];
        }
      });

      setSelectedTask((current) => {
        if (current?.task_id === updatedTask.task_id) {
          return updatedTask;
        }
        return current;
      });
    });

    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [loadMultitasks]);

  const handleStartMultitask = async () => {
    if (!newPrompt.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const taskId = await invoke<string>('start_multitask', { prompt: newPrompt });
      setNewPrompt('');
      // Force reload list immediately
      await loadMultitasks();
      // Select the newly created task
      const list = await invoke<MultitaskStatus[]>('list_active_multitasks');
      const newTask = list.find(t => t.task_id === taskId);
      if (newTask) {
        setSelectedTask(newTask);
      }
    } catch (e) {
      console.error('Error starting multitask swarm:', e);
      alert(`Error starting multitask: ${e}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDiff = async (sub: SubtaskStatus) => {
    let targetBranch = sub.branch_name;

    // Auto-healing fallback: If branch_name is missing from the payload, query git worktrees
    if (!targetBranch) {
      try {
        const cmd = Command.create('git', ['worktree', 'list']);
        const result = await cmd.execute();

        if (result.code === 0) {
          // Parse the output. Example 'git worktree list' output:
          // V:/monorepo                   1234abc [main]
          // V:/monorepo/tmp/worker-1      5678def [auto-fix-branch]
          const lines = result.stdout.trim().split('\n');
          const lastLine = lines[lines.length - 1]; // The most recently created worktree
          if (lastLine) {
            // Extract the branch name from within the brackets
            const branchMatch = lastLine.match(/\[(.*?)\]/);
            if (branchMatch?.[1]) {
              targetBranch = branchMatch[1];
              console.log(`Auto-resolved missing branchName to: ${targetBranch}`);
            }
          }
        }
      } catch (error) {
        console.error("Failed to query git worktrees:", error);
      }
    }

    // If we still don't have a branch name, safely exit or show a readable UI error
    if (!targetBranch) {
      alert("Missing required key branchName, and auto-discovery failed.");
      return;
    }

    try {
      const diff = await invoke<string>('get_worktree_diff', { branch_name: targetBranch });
      setActiveDiff(diff || 'No file changes detected (clean worktree).');
      setSelectedSubtask(sub);
      setIsViewingDiff(true);
    } catch (e) {
      console.error('Failed to fetch worktree diff:', e);
      alert(`Failed to load diff: ${e}`);
    }
  };

  const handleApproveMerge = async (sub: SubtaskStatus) => {
    if (!sub.branch_name || !sub.worktree_path) return;
    try {
      await invoke('approve_and_merge_worktree', {
        branchName: sub.branch_name,
        worktreePath: sub.worktree_path,
      });
      setIsViewingDiff(false);
      setSelectedSubtask(null);
      await loadMultitasks();
    } catch (e) {
      console.error('Merge failed:', e);
      alert(`Merge failed: ${e}`);
    }
  };

  const handleReject = async (sub: SubtaskStatus) => {
    if (!sub.branch_name || !sub.worktree_path) return;
    if (!confirm('Are you sure you want to reject this subagent\'s changes? This will delete the isolated branch and worktree.')) return;
    try {
      await invoke('reject_worktree', {
        branchName: sub.branch_name,
        worktreePath: sub.worktree_path,
      });
      setIsViewingDiff(false);
      setSelectedSubtask(null);
      await loadMultitasks();
    } catch (e) {
      console.error('Rejection failed:', e);
      alert(`Failed to discard changes: ${e}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 border-green-500/30 bg-green-500/10';
      case 'running': return 'text-blue-400 border-blue-500/30 bg-blue-500/10 animate-pulse';
      case 'failed': return 'text-red-400 border-red-500/30 bg-red-500/10';
      default: return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
    }
  };

  return (
    <div className="container mx-auto px-6 py-24 min-h-screen text-white bg-[rgba(10,8,20,0.4)]">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Title */}
        <div className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-[#b026ff]/30 bg-[#b026ff]/10 shadow-[0_0_20px_rgba(176,38,255,0.2)]">
              <Cpu className="w-6 h-6 text-[#b026ff]" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-[#00ffff] to-[#b026ff] bg-clip-text text-transparent">
                Multi-Agent Swarm Orchestrator
              </h1>
              <p className="text-white/60 text-sm mt-1">
                Asynchronous task decomposition, semantic routing, and Git worktree-isolated parallel executions.
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => { void loadMultitasks(); }}
            className="text-white/70 hover:text-white border border-white/15 bg-white/5 hover:bg-white/10 rounded-lg h-10 w-10"
          >
            <RefreshCw className="w-5 h-5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Swarm Launching and Active Tasks List */}
          <div className="space-y-6 lg:col-span-1">
            <Card className="p-6 bg-black/40 border-white/10 backdrop-blur-xl shadow-xl flex flex-col gap-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Play className="w-5 h-5 text-[#b026ff]" />
                Spawn Swarm
              </h2>
              <div className="flex flex-col gap-2">
                <Input
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  placeholder="e.g. Add validation schemas and generate tests for the auth repo..."
                  className="bg-black/40 border-white/15 text-white"
                  onKeyDown={(e) => { if (e.key === 'Enter') { void handleStartMultitask(); } }}
                />
                <Button 
                  onClick={() => { void handleStartMultitask(); }} 
                  disabled={isLoading || !newPrompt.trim()}
                  className="bg-gradient-to-r from-[#b026ff] to-[#ff2d95] hover:opacity-90 text-white font-bold"
                >
                  {isLoading ? 'Decomposing Tasks...' : 'Launch Swarm'}
                </Button>
              </div>
            </Card>

            <Card className="p-6 bg-black/40 border-white/10 backdrop-blur-xl shadow-xl space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#00ffff]" />
                Active Swarms
              </h2>
              {multitasks.length === 0 ? (
                <p className="text-sm text-white/40">No multi-agent swarms currently active.</p>
              ) : (
                <div className="space-y-3">
                  {multitasks.map((t) => (
                    <div 
                      key={t.task_id}
                      onClick={() => setSelectedTask(t)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        selectedTask?.task_id === t.task_id 
                          ? 'border-[#b026ff] bg-[#b026ff]/5' 
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono text-white/50">{t.task_id.substring(0, 8)}...</span>
                        <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border ${getStatusColor(t.overall_status)}`}>
                          {t.overall_status}
                        </span>
                      </div>
                      <p className="text-sm font-semibold line-clamp-2">{t.prompt}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* DAG Visualizer and Subtask Monitoring */}
          <div className="lg:col-span-2 space-y-6">
            {selectedTask ? (
              <Card className="p-6 bg-black/40 border-white/10 backdrop-blur-xl shadow-xl space-y-6">
                <div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                    <h2 className="text-xl font-extrabold flex items-center gap-2">
                      <Bot className="w-6 h-6 text-[#b026ff]" />
                      Swarm Execution Plan (DAG)
                    </h2>
                    <span className={`text-xs uppercase font-mono px-2 py-1 rounded border ${getStatusColor(selectedTask.overall_status)}`}>
                      {selectedTask.overall_status}
                    </span>
                  </div>
                  <p className="text-white/80 font-medium bg-white/5 p-4 rounded-xl border border-white/5">
                    <span className="text-xs text-[#00ffff] font-mono block mb-1">PROMPT:</span>
                    {selectedTask.prompt}
                  </p>
                </div>

                {/* Subtasks DAG Workflow display */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">Subagent DAG List</h3>
                  <div className="space-y-4">
                    {selectedTask.subtasks.map((sub) => (
                      <div 
                        key={sub.id}
                        className="p-5 rounded-xl border border-white/10 bg-black/30 space-y-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-white/15 bg-white/5 font-mono text-sm text-[#00ffff]">
                              {sub.assigned_agent.substring(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-sm">{sub.title}</h4>
                              <div className="flex items-center gap-2 text-xs text-white/50 mt-0.5">
                                <span className="font-mono text-[#ff2d95]">{sub.assigned_agent}</span>
                                <span>·</span>
                                <span>ID: {sub.id}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] uppercase font-mono px-2.5 py-0.5 rounded border ${getStatusColor(sub.status)}`}>
                              {sub.status}
                            </span>
                            {sub.status === 'completed' && sub.branch_name && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => { void handleViewDiff(sub); }}
                                className="text-xs border-[#b026ff] text-[#b026ff] hover:bg-[#b026ff]/10 h-7"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" />
                                Reconcile Diff
                              </Button>
                            )}
                          </div>
                        </div>

                        <p className="text-sm text-white/70 pl-11">{sub.description}</p>
                        
                        {sub.dependencies.length > 0 && (
                          <div className="flex items-center gap-2 text-xs text-white/40 pl-11">
                            <span>Dependencies:</span>
                            {sub.dependencies.map(dep => (
                              <span key={dep} className="font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10">
                                {dep}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Stdio/Execution logs */}
                        {sub.log && (
                          <div className="mt-3 pl-11">
                            <div className="flex items-center gap-2 text-xs text-white/50 mb-1">
                              <Terminal className="w-3.5 h-3.5" />
                              <span>Worker Logs:</span>
                            </div>
                            <pre className="p-3 bg-black/60 rounded-lg text-xs font-mono text-green-400 overflow-x-auto max-h-36 border border-white/5">
                              {sub.log}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-12 text-center bg-black/40 border-white/10 backdrop-blur-xl shadow-xl flex flex-col items-center justify-center gap-4">
                <Bot className="w-16 h-16 text-[#b026ff]/40 animate-pulse" />
                <div>
                  <h3 className="text-lg font-bold text-white">Select a Swarm execution</h3>
                  <p className="text-white/40 text-sm mt-1">Select an active swarm from the sidebar or launch a new prompt to visualize the worker DAG.</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Diff / Reconciliation Sidebar Modal */}
      {isViewingDiff && selectedSubtask && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-4xl h-screen bg-[#0e0c18] border-l border-white/15 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <GitPullRequest className="w-6 h-6 text-[#00ffff]" />
                <div>
                  <h3 className="font-extrabold text-lg text-white">Reconciliation: {selectedSubtask.title}</h3>
                  <p className="text-xs text-white/50">Branch: {selectedSubtask.branch_name} | Target: V:\monorepo</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsViewingDiff(false)}
                className="text-white/60 hover:text-white hover:bg-white/10 rounded-lg"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Warning Message */}
            <div className="m-6 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 flex gap-3 text-sm text-yellow-300">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <div>
                <span className="font-bold block">Review isolated Git worktree changes</span>
                Verify the diff below matches instructions. Approving will merge the changes cleanly into the primary working directory.
              </div>
            </div>

            {/* Diff content box */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <pre className="p-4 bg-black/60 border border-white/5 rounded-xl font-mono text-xs text-white/90 overflow-x-auto whitespace-pre-wrap max-h-full">
                {activeDiff.split('\n').map((line, idx) => {
                  let color = 'text-white/70';
                  if (line.startsWith('+') && !line.startsWith('+++')) color = 'text-green-400 bg-green-950/20';
                  else if (line.startsWith('-') && !line.startsWith('---')) color = 'text-red-400 bg-red-950/20';
                  else if (line.startsWith('@@')) color = 'text-cyan-400 font-bold';
                  else if (line.startsWith('diff')) color = 'text-yellow-400 font-bold';

                  return (
                    <div key={idx} className={`py-0.5 px-1 rounded ${color}`}>
                      {line}
                    </div>
                  );
                })}
              </pre>
            </div>

            {/* Modal Actions */}
            <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => { void handleReject(selectedSubtask); }}
                className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300 font-bold"
              >
                <X className="w-4 h-4 mr-2" />
                Reject & Discard
              </Button>
              <Button 
                onClick={() => { void handleApproveMerge(selectedSubtask); }}
                className="bg-gradient-to-r from-[#22c55e] to-[#00ffff] hover:opacity-90 text-black font-extrabold"
              >
                <GitMerge className="w-4 h-4 mr-2" />
                Approve & Merge
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
