import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseManager } from '../persistence/DatabaseManager.js';

export class ProjectIndexer {
    private ignoreList = ['node_modules', '.git', '_archived', 'dist', 'build', '.venv', '.pnpm'];
    private db: DatabaseManager;

    constructor() {
        this.db = DatabaseManager.getInstance();
    }

    /**
     * Performs a recursive crawl of C:\dev to build Nova's world-view.
     */
    public async indexWorkspace(rootPath: string = 'C:\\dev'): Promise<void> {
        console.log(`[Indexer] Starting full crawl of ${rootPath}...`);
        this.db.initialize();

        const files = await this.recursiveScan(rootPath);
        console.log(`[Indexer] Found ${files.length} files. Processing...`);

        const dbConn = this.db.getConnection();
        const insertFile = dbConn.prepare(`
            INSERT INTO project_files (file_path, file_hash, language, size_bytes)
            VALUES (@file_path, @file_hash, @language, @size_bytes)
            ON CONFLICT(file_path) DO UPDATE SET
                file_hash = excluded.file_hash,
                last_indexed = CURRENT_TIMESTAMP,
                size_bytes = excluded.size_bytes
            WHERE file_hash != excluded.file_hash
        `);

        let processed = 0;
        const CHUNK_SIZE = 50;

        for (let i = 0; i < files.length; i += CHUNK_SIZE) {
            const chunk = files.slice(i, i + CHUNK_SIZE);
            const fileData = await Promise.all(chunk.map(async (fp) => {
                try {
                    const stats = await fs.stat(fp);
                    if (stats.size > 1024 * 1024) return null; // Skip > 1MB files
                    const content = await fs.readFile(fp, 'utf8');
                    const hash = crypto.createHash('md5').update(content).digest('hex');
                    const ext = path.extname(fp).slice(1);
                    return { file_path: fp, file_hash: hash, language: ext, size_bytes: stats.size };
                } catch {
                    return null;
                }
            }));

            const validData = fileData.filter((d): d is NonNullable<typeof d> => d !== null);

            const writeTx = dbConn.transaction((data: typeof validData) => {
                for (const item of data) insertFile.run(item);
            });
            writeTx(validData);

            processed += validData.length;
            if (processed % 100 === 0) {
                console.log(`[Indexer] Indexed ${processed}/${files.length} files...`);
            }
        }

        console.log(`[Indexer] Complete. Indexed ${processed} files.`);
    }

    /**
     * Updates a single file in the index.
     * Called by AutoUpdateSentinel on file change events.
     */
    public async updateSingleFile(filePath: string): Promise<void> {
        try {
            const dbConn = this.db.getConnection();

            try {
                const stats = await fs.stat(filePath);
                if (stats.size > 1024 * 1024) return; // Skip large files

                const content = await fs.readFile(filePath, 'utf8');
                const hash = crypto.createHash('md5').update(content).digest('hex');
                const ext = path.extname(filePath).slice(1);

                const stmt = dbConn.prepare(`
                    INSERT INTO project_files (file_path, file_hash, language, size_bytes)
                    VALUES (@file_path, @file_hash, @language, @size_bytes)
                    ON CONFLICT(file_path) DO UPDATE SET
                        file_hash = excluded.file_hash,
                        last_indexed = CURRENT_TIMESTAMP,
                        size_bytes = excluded.size_bytes
                `);

                stmt.run({
                    file_path: filePath,
                    file_hash: hash,
                    language: ext,
                    size_bytes: stats.size
                });

                console.log(`[Indexer] Updated: ${filePath}`);

            } catch (e: unknown) {
                const err = e as NodeJS.ErrnoException;
                if (err.code === 'ENOENT') {
                    const stmt = dbConn.prepare('DELETE FROM project_files WHERE file_path = ?');
                    stmt.run(filePath);
                    console.log(`[Indexer] Removed: ${filePath}`);
                } else {
                    console.error(`[Indexer] Error updating ${filePath}:`, e);
                }
            }
        } catch (err) {
            console.error(`[Indexer] DB Error updating ${filePath}:`, err);
        }
    }

    private async recursiveScan(dir: string): Promise<string[]> {
        try {
            const dirents = await fs.readdir(dir, { withFileTypes: true });
            const files = await Promise.all(dirents.map(async (dirent): Promise<string[]> => {
                const res = path.resolve(dir, dirent.name);
                if (this.ignoreList.some(ignore => res.includes(ignore))) return [];
                return dirent.isDirectory() ? this.recursiveScan(res) : [res];
            }));
            return files.flat();
        } catch {
            return [];
        }
    }
}
