import type { StructuredAgentPlan } from '../../agent-runtime/contracts/AgentPlan';
import { assertWorkspacePath } from '../execution/utils';
import type { FileSystemService } from '../../FileSystemService';

const INSPECTION_ACTIONS = new Set(['read_file', 'analyze_code']);
const FILE_CREATING_ACTIONS = new Set(['write_file', 'generate_code']);
const MAX_PARENT_FILE_NAMES = 20;
const MAX_FEEDBACK_VALUE_LENGTH = 180;

/**
 * Rejects plans that would try to inspect a missing file at execution time.
 *
 * This deliberately runs after the structured plan has decoded but before a
 * task is accepted, so the provider can correct an assumed artifact on the
 * existing structured-output retry rather than failing part-way through work.
 */
export async function validatePlanInspectionTargets(
  plan: StructuredAgentPlan,
  workspaceRoot: string,
  fileSystemService?: FileSystemService
): Promise<void> {
  // TaskPlanner also supports browser-only callers without filesystem access.
  // The desktop Agent Task runtime always supplies this service and is the
  // boundary where exact targets can be verified safely.
  if (!fileSystemService) return;

  if (!workspaceRoot.trim()) {
    throw new Error('Cannot validate planned inspection targets without an active workspace root');
  }

  const pathsCreatedEarlier = new Set<string>();
  for (const step of plan.steps) {
    const { type, params } = step.action;

    if (INSPECTION_ACTIONS.has(type)) {
      const target = resolveTargetPath(type, params['filePath'], workspaceRoot, fileSystemService);
      if (!pathsCreatedEarlier.has(comparablePath(target))) {
        const exists = await fileSystemService.exists(target);
        if (!exists) {
          throw await missingTargetError(type, target, fileSystemService);
        }
      }
    }

    if (FILE_CREATING_ACTIONS.has(type) && typeof params['filePath'] === 'string') {
      const filePath = params['filePath'].trim();
      if (filePath) {
        const target = resolveTargetPath(type, filePath, workspaceRoot, fileSystemService);
        pathsCreatedEarlier.add(comparablePath(target));
      }
    }
  }
}

function resolveTargetPath(
  actionType: string,
  value: unknown,
  workspaceRoot: string,
  fileSystemService: FileSystemService
): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${actionType} requires a non-empty filePath`);
  }

  const targetPath = value.trim();
  if (workspaceRoot.startsWith('demo://')) {
    return resolveDemoWorkspacePath(targetPath, workspaceRoot);
  }

  const resolvedPath = fileSystemService.resolveWorkspacePath(targetPath, workspaceRoot);
  assertWorkspacePath(resolvedPath, workspaceRoot);
  return resolvedPath;
}

function resolveDemoWorkspacePath(targetPath: string, workspaceRoot: string): string {
  const root = workspaceRoot.replace(/\\/g, '/').replace(/\/+$/, '');
  const target = targetPath.replace(/\\/g, '/');
  const resolved = target.startsWith('demo://') ? target : `${root}/${target}`;
  const normalized = canonicalizePath(resolved);
  const normalizedRoot = canonicalizePath(root);
  if (normalized !== normalizedRoot && !normalized.startsWith(`${normalizedRoot}/`)) {
    throw new Error(`Path is outside the active workspace: ${safeFeedbackValue(targetPath)}`);
  }
  return normalized;
}

async function missingTargetError(
  actionType: string,
  targetPath: string,
  fileSystemService: FileSystemService
): Promise<Error> {
  const parentPath = parentDirectory(targetPath);
  const availableFiles = await listParentFiles(parentPath, fileSystemService);
  return new Error(
    `Planned ${actionType} target does not exist: ${safeFeedbackValue(targetPath)}. ` +
      `Available files in ${safeFeedbackValue(parentPath)}: ${availableFiles}.`
  );
}

async function listParentFiles(
  parentPath: string,
  fileSystemService: FileSystemService
): Promise<string> {
  try {
    const entries = await fileSystemService.listDirectory(parentPath);
    const files = entries
      .filter(entry => entry.type === 'file')
      .slice(0, MAX_PARENT_FILE_NAMES)
      .map(entry => safeFeedbackValue(entry.name))
      .filter(Boolean);
    return files.length > 0 ? files.join(', ') : '(none)';
  } catch {
    return '(unavailable)';
  }
}

function parentDirectory(path: string): string {
  const normalized = path.replace(/\\/g, '/').replace(/\/+$/, '');
  const separator = normalized.lastIndexOf('/');
  if (separator <= 0) return '.';
  return normalized.slice(0, separator);
}

function comparablePath(path: string): string {
  const canonical = canonicalizePath(path);
  return /^[A-Z]:/i.test(canonical) ? canonical.toLowerCase() : canonical;
}

function canonicalizePath(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  const protocolMatch = normalized.match(/^([a-z][a-z0-9+.-]*:\/\/)(.*)$/i);
  const prefix = protocolMatch?.[1] ?? '';
  const remainder = protocolMatch ? (protocolMatch[2] ?? '') : normalized;
  const leadingSlash = !prefix && remainder.startsWith('/') ? '/' : '';
  const segments: string[] = [];

  for (const segment of remainder.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }

  return `${prefix}${leadingSlash}${segments.join('/')}`.replace(/\/+$/, '');
}

function safeFeedbackValue(value: string): string {
  const sanitized = value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return sanitized.slice(0, MAX_FEEDBACK_VALUE_LENGTH) || '(unknown)';
}
