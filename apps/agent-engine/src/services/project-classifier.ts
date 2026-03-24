import { existsSync } from 'fs';
import { resolve } from 'path';
import { CONFIG } from '../config.js';
import { runCommand } from '../tools/process-tools.js';

export type ProjectType = 'typescript' | 'rust' | 'python' | 'android' | 'unknown';

export interface ProjectMetadata {
  name: string;
  root: string;
  type: ProjectType;
  tags: string[];
}

export class ProjectClassifier {
  classify(projectName: string): ProjectMetadata {
    const result = runCommand(`pnpm nx show project ${projectName} --json`, {
      cwd: CONFIG.WORKSPACE_ROOT,
      timeout: 15_000,
    });
    let root = `apps/${projectName}`;
    let tags: string[] = [];
    if (result.success && result.stdout.trim()) {
      try {
        const data = JSON.parse(result.stdout) as { root?: string; tags?: string[] };
        root = data.root ?? root;
        tags = data.tags ?? [];
      } catch {
        /* keep defaults */
      }
    }
    return { name: projectName, root, type: this.detectType(root, tags), tags };
  }

  detectType(root: string, tags: string[]): ProjectType {
    const tagStr = tags.join(' ');
    if (/rust|tauri/.test(tagStr)) return 'rust';
    if (/python|crypto/.test(tagStr)) return 'python';
    if (/android|mobile|capacitor/.test(tagStr)) return 'android';
    const absRoot = resolve(CONFIG.WORKSPACE_ROOT, root);
    if (existsSync(resolve(absRoot, 'Cargo.toml'))) return 'rust';
    if (existsSync(resolve(absRoot, 'src-tauri'))) return 'rust';
    if (existsSync(resolve(absRoot, 'requirements.txt'))) return 'python';
    if (existsSync(resolve(absRoot, 'pyproject.toml'))) return 'python';
    if (existsSync(resolve(absRoot, 'android'))) return 'android';
    if (existsSync(resolve(absRoot, 'capacitor.config.ts'))) return 'android';
    if (existsSync(resolve(absRoot, 'capacitor.config.js'))) return 'android';
    if (existsSync(resolve(absRoot, 'package.json'))) return 'typescript';
    return 'unknown';
  }
}
