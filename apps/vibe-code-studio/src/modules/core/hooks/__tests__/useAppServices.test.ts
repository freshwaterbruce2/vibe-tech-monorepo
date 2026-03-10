import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAppServices } from '../useAppServices';

// Mock all services
vi.mock('../../../services/ai/UnifiedAIService');
vi.mock('../../../services/FileSystemService');
vi.mock('../../../services/WorkspaceService');
vi.mock('../../../services/GitService');
vi.mock('../../../services/MultiFileEditor');
vi.mock('../../../services/ai/TaskPlanner');
vi.mock('../../../services/LiveEditorStream');
vi.mock('../../../services/ai/ExecutionEngine');
vi.mock('../../../services/BackgroundAgentSystem');

describe('useAppServices', () => {
  it('initializes all services', () => {
    const { result } = renderHook(() => useAppServices());

    expect(result.current.aiService).toBeDefined();
    expect(result.current.fileSystemService).toBeDefined();
    expect(result.current.workspaceService).toBeDefined();
    expect(result.current.gitService).toBeDefined();
    expect(result.current.multiFileEditor).toBeDefined();
    expect(result.current.taskPlanner).toBeDefined();
    expect(result.current.liveStream).toBeDefined();
    expect(result.current.executionEngine).toBeDefined();
    expect(result.current.backgroundAgentSystem).toBeDefined();
  });
});
