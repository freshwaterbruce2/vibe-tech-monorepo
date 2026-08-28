/**
 * Nova-Agent Context Persistence
 * Store active project context, task progress, and file references
 */

import type { MemoryManager } from '../core/MemoryManager.js';

export interface ProjectContext {
  name: string;
  path: string;
  currentFile?: string;
  currentTask?: string;
  recentFiles: string[];
  recentTasks: string[];
  lastActive: number;
}

export interface TaskInfo {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created: number;
  updated: number;
  completedAt?: number;
}

export interface FileReference {
  path: string;
  purpose: string;
  importance: number;
  lastAccessed: number;
  accessCount: number;
}

export class NovaMemory {
  constructor(private memory: MemoryManager) {}

  /**
   * Set current project context
   */
  async setContext(context: ProjectContext): Promise<void> {
    // Store as semantic memory (latest context)
    await this.memory.semantic.add({
      text: `Active project: ${context.name} at ${context.path}. Current task: ${context.currentTask ?? 'none'}. Recent files: ${context.recentFiles.join(', ')}`,
      category: 'nova-context',
      importance: 10, // Always high importance for current context
      metadata: {
        type: 'current_context',
        projectName: context.name,
        projectPath: context.path,
        currentFile: context.currentFile,
        currentTask: context.currentTask,
        recentFiles: context.recentFiles,
        recentTasks: context.recentTasks,
      },
    });

    // Track context switch as procedural pattern
    this.memory.procedural.upsert({
      pattern: `nova_project_${context.name}`,
      context: `Working on ${context.name}`,
      successRate: 1.0,
      lastUsed: context.lastActive,
      metadata: {
        projectPath: context.path,
      },
    });
  }

  /**
   * Get current project context
   */
  async getContext(): Promise<ProjectContext | null> {
    // Search for most recent context
    const results = await this.memory.semantic.search('nova-context current project', 1);

    if (results.length === 0 || !results[0].item.metadata?.type || results[0].item.metadata.type !== 'current_context') {
      return null;
    }

    const metadata = results[0].item.metadata;
    return {
      name: (metadata.projectName as string) ?? 'unknown',
      path: (metadata.projectPath as string) ?? '',
      currentFile: metadata.currentFile as string | undefined,
      currentTask: metadata.currentTask as string | undefined,
      recentFiles: (metadata.recentFiles as string[]) ?? [],
      recentTasks: (metadata.recentTasks as string[]) ?? [],
      lastActive: results[0].item.created,
    };
  }

  /**
   * Track task completion
   */
  async trackTask(task: TaskInfo): Promise<number> {
    // Store as episodic memory
    const episodicId = this.memory.episodic.add({
      sourceId: 'nova-agent',
      query: `Task: ${task.title}`,
      response: task.description,
      timestamp: task.updated,
      metadata: {
        type: 'task',
        taskId: task.id,
        status: task.status,
        priority: task.priority,
        created: task.created,
        completedAt: task.completedAt,
      },
    });

    // Store completed high-priority tasks as semantic memory
    if (task.status === 'completed' && (task.priority === 'high' || task.priority === 'urgent')) {
      await this.memory.semantic.add({
        text: `Completed task: ${task.title}. ${task.description}`,
        category: 'nova-tasks',
        importance: task.priority === 'urgent' ? 10 : 8,
        metadata: {
          taskId: task.id,
          priority: task.priority,
          duration: task.completedAt ? task.completedAt - task.created : undefined,
        },
      });
    }

    // Track task completion rate as procedural pattern
    if (task.status === 'completed') {
      this.memory.procedural.upsert({
        pattern: `nova_task_completed`,
        context: 'Task completion tracking',
        successRate: 1.0,
        lastUsed: task.updated,
        metadata: {
          avgDuration: task.completedAt ? task.completedAt - task.created : undefined,
        },
      });
    }

    return episodicId;
  }

  /**
   * Track file reference
   */
  async trackFileReference(file: FileReference): Promise<void> {
    // Store important files as semantic memory
    if (file.importance >= 7) {
      await this.memory.semantic.add({
        text: `Important file: ${file.path}. Purpose: ${file.purpose}`,
        category: 'nova-files',
        importance: file.importance,
        metadata: {
          filePath: file.path,
          accessCount: file.accessCount,
        },
      });
    }

    // Track file access as procedural pattern
    this.memory.procedural.upsert({
      pattern: `nova_file_${file.path}`,
      context: file.purpose,
      successRate: 1.0,
      lastUsed: file.lastAccessed,
      metadata: {
        accessCount: file.accessCount,
      },
    });
  }

  /**
   * Get recent tasks
   */
  getRecentTasks(limit = 20): TaskInfo[] {
    const recent = this.memory.episodic.getRecent(100, 'nova-agent');

    return recent
      .filter(m => m.metadata?.type === 'task')
      .slice(0, limit)
      .map(m => {
        const meta = m.metadata;
        if (!meta) {
          throw new Error('NovaMemory.getRecentTasks: metadata lost after filter');
        }
        return {
          id: (meta.taskId as string) ?? '',
          title: m.query.replace('Task: ', ''),
          description: m.response,
          status: (meta.status as TaskInfo['status']) ?? 'pending',
          priority: (meta.priority as TaskInfo['priority']) ?? 'medium',
          created: (meta.created as number) ?? m.timestamp,
          updated: m.timestamp,
          completedAt: meta.completedAt as number | undefined,
        };
      });
  }

  /**
   * Get frequently accessed files
   */
  getFrequentFiles(limit = 20): FileReference[] {
    const patterns = this.memory.procedural
      .getMostFrequent(100)
      .filter(p => p.pattern.startsWith('nova_file_'));

    return patterns.slice(0, limit).map(p => ({
      path: p.pattern.replace('nova_file_', ''),
      purpose: p.context,
      importance: 7, // Default importance
      lastAccessed: p.lastUsed ?? Date.now(),
      accessCount: p.frequency,
    }));
  }

  /**
   * Suggest next task based on patterns
   */
  async suggestNextTask(): Promise<{
    title: string;
    reason: string;
    confidence: number;
  } | null> {
    // Get recent incomplete tasks
    const recentTasks = this.getRecentTasks(50);
    const incompleteTasks = recentTasks.filter(
      t => t.status === 'pending' || t.status === 'in_progress'
    );

    if (incompleteTasks.length === 0) {
      return null;
    }

    // Sort by priority and age
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    incompleteTasks.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.created - b.created; // Older first
    });

    const nextTask = incompleteTasks[0];
    const age = Date.now() - nextTask.created;
    const ageDays = Math.floor(age / (1000 * 60 * 60 * 24));

    return {
      title: nextTask.title,
      reason: `${nextTask.priority} priority task${ageDays > 0 ? ` from ${ageDays} days ago` : ''}`,
      confidence: nextTask.priority === 'urgent' ? 0.9 : 0.7,
    };
  }

  /**
   * Get project statistics
   */
  async getProjectStats(): Promise<{
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    avgTaskDuration: number;
    mostActiveProject: string;
    mostAccessedFile: string;
  }> {
    const tasks = this.getRecentTasks(500);
    const completedTasks = tasks.filter(t => t.status === 'completed');

    // Calculate completion rate
    const completionRate = tasks.length > 0 ? completedTasks.length / tasks.length : 0;

    // Calculate average task duration
    const durations = completedTasks.flatMap(t =>
      t.completedAt !== undefined ? [t.completedAt - t.created] : [],
    );
    const avgTaskDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

    // Find most active project
    const projectPatterns = this.memory.procedural
      .getMostFrequent(50)
      .filter(p => p.pattern.startsWith('nova_project_'));
    const mostActiveProject = projectPatterns.length > 0
      ? projectPatterns[0].pattern.replace('nova_project_', '')
      : 'none';

    // Find most accessed file
    const filePatterns = this.getFrequentFiles(1);
    const mostAccessedFile = filePatterns.length > 0 ? filePatterns[0].path : 'none';

    return {
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      completionRate,
      avgTaskDuration,
      mostActiveProject,
      mostAccessedFile,
    };
  }

  /**
   * Search task history
   */
  async searchTasks(query: string, limit = 10): Promise<TaskInfo[]> {
    const results = this.memory.episodic.search(query, limit * 2);

    return results
      .filter(r => r.item.sourceId === 'nova-agent' && r.item.metadata?.type === 'task')
      .slice(0, limit)
      .map(r => {
        const meta = r.item.metadata;
        if (!meta) {
          throw new Error('NovaMemory.searchTasks: metadata lost after filter');
        }
        return {
          id: (meta.taskId as string) ?? '',
          title: r.item.query.replace('Task: ', ''),
          description: r.item.response,
          status: (meta.status as TaskInfo['status']) ?? 'pending',
          priority: (meta.priority as TaskInfo['priority']) ?? 'medium',
          created: (meta.created as number) ?? r.item.timestamp,
          updated: r.item.timestamp,
          completedAt: meta.completedAt as number | undefined,
        };
      });
  }
}
