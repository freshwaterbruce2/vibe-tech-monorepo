import { describe, expect, it } from 'vitest';

import {
  buildAppExtrasContextValue,
  buildServicesContextValue,
  buildUiPanelContextValue,
  buildWorkspaceContextValue,
} from '../buildAppContextValues';
import type {
  AppExtrasContextValue,
  ServicesContextValue,
  UIPanelContextValue,
  WorkspaceContextValue,
} from '../contexts';

describe('buildAppContextValues', () => {
  it('returns the services bag unchanged', () => {
    const value = {
      aiService: {} as ServicesContextValue['aiService'],
      fileSystemService: {} as ServicesContextValue['fileSystemService'],
      taskPlanner: {} as ServicesContextValue['taskPlanner'],
      liveStream: {} as ServicesContextValue['liveStream'],
      executionEngine: {} as ServicesContextValue['executionEngine'],
      agentRuntime: {} as ServicesContextValue['agentRuntime'],
      backgroundAgentSystem: {} as ServicesContextValue['backgroundAgentSystem'],
      orchestrator: {} as ServicesContextValue['orchestrator'],
      performanceOptimizer: {} as ServicesContextValue['performanceOptimizer'],
    };
    expect(buildServicesContextValue(value)).toBe(value);
  });

  it('returns ui/workspace/extras bags unchanged', () => {
    const ui = { settingsOpen: true } as UIPanelContextValue;
    const ws = { workspaceFolder: '/tmp' } as WorkspaceContextValue;
    const extras = { currentModel: 'x' } as AppExtrasContextValue;

    expect(buildUiPanelContextValue(ui)).toBe(ui);
    expect(buildWorkspaceContextValue(ws)).toBe(ws);
    expect(buildAppExtrasContextValue(extras)).toBe(extras);
  });
});
