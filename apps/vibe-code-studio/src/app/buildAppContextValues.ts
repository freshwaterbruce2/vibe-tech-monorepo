/**
 * Pure builders for App context provider values (keeps App.tsx under soft limit).
 */

import type {
  AppExtrasContextValue,
  ServicesContextValue,
  UIPanelContextValue,
  WorkspaceContextValue,
} from './contexts';

export function buildServicesContextValue(value: ServicesContextValue): ServicesContextValue {
  return value;
}

export function buildUiPanelContextValue(value: UIPanelContextValue): UIPanelContextValue {
  return value;
}

export function buildWorkspaceContextValue(value: WorkspaceContextValue): WorkspaceContextValue {
  return value;
}

export function buildAppExtrasContextValue(value: AppExtrasContextValue): AppExtrasContextValue {
  return value;
}
