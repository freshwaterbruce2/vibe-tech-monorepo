/**
 * Autonomous post-edit verification loop — spec 11 Phase 2. Registered as
 * artifactCapture's pre-walkthrough hook: when a completed task's change-set
 * touched frontend files, it offers a verification pass via Phase 1's
 * permission prompt (the gate IS the offer — nothing launches on deny),
 * starts the workspace dev server through TerminalService, points the
 * approved /browser session at the changed surface, captures a screenshot
 * (spec-09 artifact → walkthrough Verification section) and reads the
 * console for errors. Every failure path degrades to a text note.
 * Spec: FEATURE_SPECS/competitive-gaps/11-BROWSER-VERIFICATION.md
 */
import { setWalkthroughVerificationHook } from '../artifacts/artifactCapture';
import type { WalkthroughVerificationContext } from '../artifacts/types';
import { terminalService } from '../TerminalService';
import { useEditorStore } from '../../stores/useEditorStore';
import { getBrowserSessionService } from './BrowserSessionService';
import { DevServerOrchestrator, resolveDevCommand } from './devServerOrchestrator';
import { collectChangedPaths, deriveRoutePath, filterUiPaths } from './uiChangeHeuristic';
import type { BrowserActionResult } from './types';
import type { VerificationDeps } from './verification.types';

/** Cap on console-error lines surfaced into the walkthrough */
export const MAX_CONSOLE_ERROR_NOTES = 5;

const skipped = (reason: string): string[] => [`Browser verification skipped — ${reason}`];
const failed = (reason: string): string[] => [`Browser verification failed — ${reason}`];

function verificationIntent(command: string, uiFileCount: number, route: string): string {
  return (
    `Post-edit verification: start the dev server ("${command}"), open route "${route}" ` +
    `to check ${uiFileCount} changed UI file${uiFileCount === 1 ? '' : 's'}, ` +
    'capture a screenshot, and read the console for errors.'
  );
}

/** Join the detected dev-server URL with the derived route */
export function joinUrl(baseUrl: string, route: string): string {
  try {
    return new URL(route, baseUrl).toString();
  } catch {
    return `${baseUrl.replace(/\/+$/, '')}${route.startsWith('/') ? route : `/${route}`}`;
  }
}

function consoleErrorNotes(url: string, consoleResult: BrowserActionResult): string[] {
  if (!consoleResult.ok) {
    return [
      `Verified ${url} — page rendered; console state unavailable ` +
        `(${consoleResult.error?.message ?? 'unknown error'}).`,
    ];
  }
  const errors = (consoleResult.consoleMessages ?? []).filter(m => m.level === 'error');
  if (errors.length === 0) {
    return [`✅ Verified ${url} — page rendered with no console errors.`];
  }
  const notes = [`⚠️ Verified ${url} — ${errors.length} console error(s) detected:`];
  for (const message of errors.slice(0, MAX_CONSOLE_ERROR_NOTES)) {
    notes.push(`- ${message.text}`);
  }
  if (errors.length > MAX_CONSOLE_ERROR_NOTES) {
    notes.push(`- …and ${errors.length - MAX_CONSOLE_ERROR_NOTES} more`);
  }
  return notes;
}

/** Drive the approved session: navigate → screenshot → read console */
async function driveVerification(
  taskId: string,
  url: string,
  deps: VerificationDeps
): Promise<string[]> {
  const nav = await deps.session.performAction(taskId, { browserAction: 'navigate', url });
  if (!nav.ok) {
    return failed(`could not navigate to ${url}: ${nav.error?.message ?? 'unknown error'}.`);
  }
  const shot = await deps.session.performAction(taskId, {
    browserAction: 'screenshot',
    fullPage: true,
  });
  const consoleResult = await deps.session.performAction(taskId, {
    browserAction: 'read_console',
  });
  const notes = consoleErrorNotes(url, consoleResult);
  if (!shot.ok) {
    notes.push(`Screenshot capture failed: ${shot.error?.message ?? 'unknown error'}.`);
  }
  return notes;
}

/**
 * Run one verification pass for a settled task. Returns walkthrough
 * Verification notes for every outcome (skip/deny/failure/success) and
 * never throws: the artifactCapture hook wrapper is the last-resort catch.
 */
export async function runVerificationPass(
  context: WalkthroughVerificationContext,
  deps: VerificationDeps
): Promise<string[]> {
  const uiPaths = filterUiPaths(collectChangedPaths(context.diffs));
  if (uiPaths.length === 0) {
    return skipped('the change-set touched no UI-affecting files (*.tsx/*.css/src code).');
  }
  const workspaceRoot = deps.getWorkspaceRoot();
  if (!workspaceRoot) {
    return skipped('no workspace folder is open to run a dev server in.');
  }
  const command = await deps.resolveCommand(workspaceRoot);
  if (!command) {
    return skipped('no dev/start script was found in the workspace package.json.');
  }
  const route = deriveRoutePath(uiPaths);
  const ensured = await deps.session.ensureSession(
    context.taskId,
    verificationIntent(command, uiPaths.length, route)
  );
  if (!ensured.ok) {
    return skipped(`${ensured.error.message} (${ensured.error.code}).`);
  }
  const server = deps.createServer();
  try {
    const started = await server.start({ command, cwd: workspaceRoot });
    if (!started.ok) {
      return failed(`dev server did not become ready: ${started.reason}.`);
    }
    return await driveVerification(context.taskId, joinUrl(started.url, route), deps);
  } finally {
    server.stop();
    deps.session.endSessionsForTask(context.taskId, 'task_settled');
  }
}

/** Default collaborators: real session service, editor store, TerminalService */
export function buildDefaultVerificationDeps(
  readFile: (path: string) => Promise<string>
): VerificationDeps {
  return {
    session: getBrowserSessionService(),
    getWorkspaceRoot: () => useEditorStore.getState().workspaceFolder,
    resolveCommand: workspaceRoot => resolveDevCommand(readFile, workspaceRoot),
    createServer: () => new DevServerOrchestrator(terminalService),
  };
}

/**
 * Wire the loop into artifactCapture (idempotent — re-registering replaces
 * the hook). Only completed tasks are verified; failed tasks return null so
 * their walkthrough keeps the default Verification fallback text.
 */
export function initBrowserVerificationLoop(readFile: (path: string) => Promise<string>): void {
  setWalkthroughVerificationHook(async context => {
    if (context.outcome !== 'completed') return null;
    return runVerificationPass(context, buildDefaultVerificationDeps(readFile));
  });
}
