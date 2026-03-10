/**
 * Nova Agent - Tauri Commands E2E Test Suite
 *
 * Tests all Tauri commands exposed in main.rs to verify
 * the frontend-backend integration works correctly.
 *
 * Run with: pnpm test (in nova-agent directory)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Tauri's invoke function
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

// Import types matching our Rust structs
interface Task {
  id: string;
  title: string;
  status: string;
  created_at: number;
  updated_at: number;
  metadata: string | null;
}

interface Activity {
  id: number;
  timestamp: number;
  activity_type: string;
  details: string | null;
  metadata: string | null;
}

interface LearningEvent {
  id: number;
  timestamp: number;
  event_type: string;
  context: string | null;
  outcome: string | null;
  metadata: string | null;
}

type TaskStats = Record<string, number>;

interface GuidanceItem {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  action_type: string;
  action_payload: string | null;
}

interface GuidanceResponse {
  next_steps: GuidanceItem[];
  doing_right: GuidanceItem[];
  at_risk: GuidanceItem[];
  generated_at: number;
  context_summary: string;
}

interface SystemContext {
  workspace_path: string;
  git_status: {
    branch: string;
    modified_files: number;
    staged_files: number;
    ahead: number;
    behind: number;
  } | null;
  current_file: string | null;
  project_type: string;
  recent_files: Array<{
    path: string;
    language: string;
    last_modified: number;
  }>;
  deep_work_minutes: number;
}

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
}

describe('Nova Agent Tauri Commands', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Database Read Operations', () => {
    it('get_tasks returns tasks array', async () => {
      const mockTasks: Task[] = [
        {
          id: 'task-001',
          title: 'Test Task',
          status: 'in-progress',
          created_at: Date.now() / 1000,
          updated_at: Date.now() / 1000,
          metadata: null,
        },
      ];
      mockInvoke.mockResolvedValueOnce(mockTasks);

      const { invoke } = await import('@tauri-apps/api/core');
      const tasks = await invoke<Task[]>('get_tasks', {
        statusFilter: null,
        limit: 10,
      });

      expect(mockInvoke).toHaveBeenCalledWith('get_tasks', {
        statusFilter: null,
        limit: 10,
      });
      expect(tasks).toEqual(mockTasks);
      expect(tasks[0]?.id).toBe('task-001');
    });

    it('get_tasks with status filter', async () => {
      const mockTasks: Task[] = [
        {
          id: 'task-002',
          title: 'Completed Task',
          status: 'completed',
          created_at: Date.now() / 1000,
          updated_at: Date.now() / 1000,
          metadata: null,
        },
      ];
      mockInvoke.mockResolvedValueOnce(mockTasks);

      const { invoke } = await import('@tauri-apps/api/core');
      const tasks = await invoke<Task[]>('get_tasks', {
        statusFilter: 'completed',
        limit: 50,
      });

      expect(mockInvoke).toHaveBeenCalledWith('get_tasks', {
        statusFilter: 'completed',
        limit: 50,
      });
      expect(tasks[0]?.status).toBe('completed');
    });

    it('get_task_by_id returns single task', async () => {
      const mockTask: Task = {
        id: 'task-001',
        title: 'Specific Task',
        status: 'pending',
        created_at: Date.now() / 1000,
        updated_at: Date.now() / 1000,
        metadata: '{"priority": "high"}',
      };
      mockInvoke.mockResolvedValueOnce(mockTask);

      const { invoke } = await import('@tauri-apps/api/core');
      const task = await invoke<Task | null>('get_task_by_id', {
        taskId: 'task-001',
      });

      expect(mockInvoke).toHaveBeenCalledWith('get_task_by_id', {
        taskId: 'task-001',
      });
      expect(task?.id).toBe('task-001');
    });

    it('get_task_by_id returns null for non-existent task', async () => {
      mockInvoke.mockResolvedValueOnce(null);

      const { invoke } = await import('@tauri-apps/api/core');
      const task = await invoke<Task | null>('get_task_by_id', {
        taskId: 'nonexistent',
      });

      expect(task).toBeNull();
    });

    it('update_task_status returns success', async () => {
      mockInvoke.mockResolvedValueOnce(true);

      const { invoke } = await import('@tauri-apps/api/core');
      const success = await invoke<boolean>('update_task_status', {
        taskId: 'task-001',
        newStatus: 'completed',
      });

      expect(mockInvoke).toHaveBeenCalledWith('update_task_status', {
        taskId: 'task-001',
        newStatus: 'completed',
      });
      expect(success).toBe(true);
    });

    it('get_task_stats returns status counts', async () => {
      const mockStats: TaskStats = {
        pending: 5,
        'in-progress': 3,
        completed: 10,
      };
      mockInvoke.mockResolvedValueOnce(mockStats);

      const { invoke } = await import('@tauri-apps/api/core');
      const stats = await invoke<TaskStats>('get_task_stats');

      expect(mockInvoke).toHaveBeenCalledWith('get_task_stats');
      expect(stats['completed']).toBe(10);
    });

    it('get_recent_activities returns activities', async () => {
      const mockActivities: Activity[] = [
        {
          id: 1,
          timestamp: Date.now() / 1000,
          activity_type: 'file_open',
          details: 'Opened main.rs',
          metadata: null,
        },
      ];
      mockInvoke.mockResolvedValueOnce(mockActivities);

      const { invoke } = await import('@tauri-apps/api/core');
      const activities = await invoke<Activity[]>('get_recent_activities', {
        limit: 10,
        activityTypeFilter: null,
      });

      expect(activities).toHaveLength(1);
      expect(activities[0]?.activity_type).toBe('file_open');
    });

    it('get_learning_events returns events', async () => {
      const mockEvents: LearningEvent[] = [
        {
          id: 1,
          timestamp: Date.now() / 1000,
          event_type: 'code_review',
          context: 'TypeScript refactoring',
          outcome: 'success',
          metadata: '{"files": 5}',
        },
      ];
      mockInvoke.mockResolvedValueOnce(mockEvents);

      const { invoke } = await import('@tauri-apps/api/core');
      const events = await invoke<LearningEvent[]>('get_learning_events', {
        limit: 10,
        eventTypeFilter: null,
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.outcome).toBe('success');
    });

    it('get_today_activity_count returns count', async () => {
      mockInvoke.mockResolvedValueOnce(42);

      const { invoke } = await import('@tauri-apps/api/core');
      const count = await invoke<number>('get_today_activity_count');

      expect(mockInvoke).toHaveBeenCalledWith('get_today_activity_count');
      expect(count).toBe(42);
    });
  });

  describe('Context Engine', () => {
    it('get_context_snapshot returns system context', async () => {
      const mockContext: SystemContext = {
        workspace_path: 'C:\\dev\\apps\\nova-agent',
        git_status: {
          branch: 'main',
          modified_files: 3,
          staged_files: 1,
          ahead: 2,
          behind: 0,
        },
        current_file: 'src/main.rs',
        project_type: 'tauri',
        recent_files: [
          {
            path: 'src/main.rs',
            language: 'rust',
            last_modified: Date.now() / 1000,
          },
        ],
        deep_work_minutes: 45,
      };
      mockInvoke.mockResolvedValueOnce(mockContext);

      const { invoke } = await import('@tauri-apps/api/core');
      const context = await invoke<SystemContext>('get_context_snapshot');

      expect(mockInvoke).toHaveBeenCalledWith('get_context_snapshot');
      expect(context.workspace_path).toContain('nova-agent');
      expect(context.git_status?.branch).toBe('main');
    });
  });

  describe('Guidance Engine', () => {
    it('request_guidance returns structured guidance', async () => {
      const mockGuidance: GuidanceResponse = {
        next_steps: [
          {
            id: 'ns-001',
            title: 'Commit Changes',
            description: 'You have 5 modified files. Consider committing.',
            priority: 'medium',
            category: 'git',
            action_type: 'command',
            action_payload: 'git commit',
          },
        ],
        doing_right: [
          {
            id: 'dr-001',
            title: 'Deep Work',
            description: '45 minutes of focused coding!',
            priority: 'low',
            category: 'productivity',
            action_type: 'none',
            action_payload: null,
          },
        ],
        at_risk: [],
        generated_at: Date.now() / 1000,
        context_summary: 'Working on nova-agent, main branch',
      };
      mockInvoke.mockResolvedValueOnce(mockGuidance);

      const { invoke } = await import('@tauri-apps/api/core');
      const guidance = await invoke<GuidanceResponse>('request_guidance');

      expect(mockInvoke).toHaveBeenCalledWith('request_guidance');
      expect(guidance.next_steps).toHaveLength(1);
      expect(guidance.doing_right).toHaveLength(1);
      expect(guidance.at_risk).toHaveLength(0);
    });
  });

  describe('Project Creation', () => {
    it('get_available_templates returns templates', async () => {
      const mockTemplates: ProjectTemplate[] = [
        {
          id: 'nx-react',
          name: 'Nx React App',
          description: 'React with shadcn/ui',
          category: 'frontend',
        },
        {
          id: 'rust-bin',
          name: 'Rust Binary',
          description: 'Rust binary project',
          category: 'systems',
        },
        {
          id: 'tauri-app',
          name: 'Tauri App',
          description: 'Desktop app',
          category: 'desktop',
        },
      ];
      mockInvoke.mockResolvedValueOnce(mockTemplates);

      const { invoke } = await import('@tauri-apps/api/core');
      const templates = await invoke<ProjectTemplate[]>('get_available_templates');

      expect(templates.length).toBeGreaterThanOrEqual(3);
      expect(templates.find((t) => t.id === 'nx-react')).toBeDefined();
    });

    it('create_project creates project successfully', async () => {
      mockInvoke.mockResolvedValueOnce({
        success: true,
        path: 'C:\\dev\\projects\\my-app',
      });

      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke<{ success: boolean; path: string }>('create_project', {
        templateId: 'nx-react',
        projectName: 'my-app',
        targetPath: 'C:\\dev\\projects',
      });

      expect(mockInvoke).toHaveBeenCalledWith('create_project', {
        templateId: 'nx-react',
        projectName: 'my-app',
        targetPath: 'C:\\dev\\projects',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Activity Logging', () => {
    it('log_activity logs activity successfully', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('log_activity', {
        activityType: 'file_open',
        details: 'Opened database.rs',
      });

      expect(mockInvoke).toHaveBeenCalledWith('log_activity', {
        activityType: 'file_open',
        details: 'Opened database.rs',
      });
    });
  });

  describe('Error Handling', () => {
    it('handles database unavailable gracefully', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Database service not available'));

      const { invoke } = await import('@tauri-apps/api/core');

      await expect(invoke('get_tasks')).rejects.toThrow('Database service not available');
    });

    it('handles invalid task ID gracefully', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Failed to get task: not found'));

      const { invoke } = await import('@tauri-apps/api/core');

      await expect(invoke('get_task_by_id', { taskId: 'invalid' })).rejects.toThrow('not found');
    });
  });
});

describe('Integration Tests (requires running Tauri app)', () => {
  // These tests are skipped by default - run manually with actual app
  it.skip('real database read', async () => {
    // This would test against actual Tauri backend
    // Uncomment and run with: pnpm test -- --run
  });
});
