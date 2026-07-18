/**
 * App context provider values (keeps App.tsx under soft line limits).
 *
 * Memoization lives at the call site's field-level deps historically; these
 * builders are identity transforms so the Provider receives typed bags.
 */

import {
  buildAppExtrasContextValue,
  buildServicesContextValue,
  buildUiPanelContextValue,
  buildWorkspaceContextValue,
} from './buildAppContextValues';
import type {
  AppExtrasContextValue,
  ServicesContextValue,
  UIPanelContextValue,
  WorkspaceContextValue,
} from './contexts';

export type AppContextValuesInput = {
  services: ServicesContextValue;
  uiPanel: UIPanelContextValue;
  workspace: WorkspaceContextValue;
  extras: AppExtrasContextValue;
};

export function useAppContextValues(input: AppContextValuesInput) {
  return {
    servicesContextValue: buildServicesContextValue(input.services),
    uiPanelContextValue: buildUiPanelContextValue(input.uiPanel),
    workspaceContextValue: buildWorkspaceContextValue(input.workspace),
    appExtrasContextValue: buildAppExtrasContextValue(input.extras),
  };
}
