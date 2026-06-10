import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Electron and system Node expose different native ABIs but share the single
 * hoisted better-sqlite3 install at the workspace root. Under Electron the
 * root binary (built for system Node) cannot load, so all main-process code
 * opens databases through this module, which points better-sqlite3 at the
 * Electron-ABI prebuild fetched into <app>/native by
 * scripts/fetch-electron-native.mjs. Outside Electron (Vitest, the standalone
 * MCP server, packaged builds whose natives were swapped by rebuild-native.mjs)
 * the default binding is used.
 */
function resolveNativeBinding(): string | undefined {
  if (!process.versions.electron) return undefined;
  const fileName = `better_sqlite3-electron-v${process.versions.modules}.node`;
  const candidates = [
    join(__dirname, '..', '..', 'native', fileName),
    join(__dirname, '..', 'native', fileName),
    join(process.cwd(), 'native', fileName)
  ];
  return candidates.find((p) => existsSync(p));
}

const NATIVE_BINDING = resolveNativeBinding();

/** Open a SQLite database read-only with the ABI-correct native binding. */
export function openReadOnlyDatabase(dbPath: string): Database.Database {
  return new Database(dbPath, {
    readonly: true,
    fileMustExist: true,
    ...(NATIVE_BINDING === undefined ? {} : { nativeBinding: NATIVE_BINDING })
  });
}
