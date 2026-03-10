import chokidar, { type FSWatcher } from 'chokidar';
import { ProjectIndexer } from './ProjectIndexer.js';

export class AutoUpdateSentinel {
    private watcher: FSWatcher | null = null;
    private indexer: ProjectIndexer;

    constructor() {
        this.indexer = new ProjectIndexer();
    }

    /**
     * Watches C:\dev for real-time changes.
     * Optimized for Windows 11 performance.
     */
    public start(watchPath: string = 'C:\\dev'): void {
        this.watcher = chokidar.watch(watchPath, {
            ignored: [
                /^\./,
                '**/node_modules/**',
                '**/_archived/**',
                '**/.git/**'
            ],
            persistent: true,
            ignoreInitial: true,
            awaitWriteFinish: {
                stabilityThreshold: 300,
                pollInterval: 100
            }
        });

        this.watcher
            .on('add', (filePath: string): void => {
                void this.handleEvent('added', filePath);
            })
            .on('change', (filePath: string): void => {
                void this.handleEvent('modified', filePath);
            })
            .on('unlink', (filePath: string): void => {
                void this.handleEvent('deleted', filePath);
            });

        console.log(`[Sentinel] Mission Control is now monitoring: ${watchPath}`);
    }

    public stop(): void {
        if (this.watcher) {
            const watcher = this.watcher;
            this.watcher = null;
            void watcher.close().catch((error: unknown) => {
                console.error('[Sentinel] Error while stopping watcher:', error);
            });
            console.log('[Sentinel] Stopped monitoring');
        }
    }

    private shouldIgnore(filePath: string): boolean {
        const normalizedPath = filePath.replace(/\\/g, '/');
        const ignorePatterns = [
            /\/node_modules\//,
            /\/_archived\//,
            /\/\.git\//,
            /^\./
        ];
        return ignorePatterns.some(pattern => pattern.test(normalizedPath));
    }

    private async handleEvent(type: string, filePath: string): Promise<void> {
        console.log(`[Sentinel] File ${type}: ${filePath}`);
        
        if (this.shouldIgnore(filePath)) {
            return;
        }
        
        await this.indexer.updateSingleFile(filePath);
    }
}
