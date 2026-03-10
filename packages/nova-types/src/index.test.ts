import { describe, it, expect } from 'vitest';
import type {
    // Activity types
    FileEventType,
    FileEvent,
    GitEventType,
    GitEvent,
    ProcessEvent,
    Activity,
    ActivityFilter,
    // Context types
    DependencyNode,
    DependencyGraph,
    CodePattern,
    ProjectContext,
    WorkspaceContext,
    // Monitoring types
    MonitoringConfig,
    WatcherStatus,
    GitRepoInfo,
    DevelopmentServer,
    // Recommendation types
    RecommendationType,
    RecommendationPriority,
    RecommendationStatus,
    Recommendation,
    RecommendationFeedback,
    PromptContext,
} from './index';

describe('nova-types', () => {
    describe('Activity types', () => {
        it('FileEvent accepts valid structure', () => {
            const event: FileEvent = {
                path: 'C:\\dev\\test.ts',
                eventType: 'create',
                timestamp: Date.now(),
                project: 'test-project',
            };
            expect(event.path).toBe('C:\\dev\\test.ts');
            expect(event.eventType).toBe('create');
        });

        it('FileEvent supports all event types', () => {
            const types: FileEventType[] = ['create', 'modify', 'delete', 'rename'];
            types.forEach((t) => {
                const event: FileEvent = { path: 'test', eventType: t, timestamp: 0 };
                expect(event.eventType).toBe(t);
            });
        });

        it('GitEvent accepts valid structure', () => {
            const event: GitEvent = {
                repoPath: 'C:\\dev',
                eventType: 'commit',
                branch: 'main',
                commitHash: 'abc123',
                message: 'Initial commit',
                timestamp: Date.now(),
            };
            expect(event.repoPath).toBe('C:\\dev');
            expect(event.eventType).toBe('commit');
        });

        it('GitEvent supports all event types', () => {
            const types: GitEventType[] = [
                'commit', 'checkout', 'merge', 'pull', 'push', 'branch-create', 'branch-delete'
            ];
            types.forEach((t) => {
                const event: GitEvent = { repoPath: '.', eventType: t, branch: null, timestamp: 0 };
                expect(event.eventType).toBe(t);
            });
        });

        it('ProcessEvent accepts valid structure', () => {
            const event: ProcessEvent = {
                name: 'node',
                pid: 1234,
                eventType: 'start',
                port: 3000,
                timestamp: Date.now(),
            };
            expect(event.name).toBe('node');
            expect(event.pid).toBe(1234);
        });

        it('Activity aggregates all event types', () => {
            const activity: Activity = {
                fileEvents: [{ path: 'test', eventType: 'create', timestamp: 0 }],
                gitEvents: [{ repoPath: '.', eventType: 'commit', branch: 'main', timestamp: 0 }],
                processEvents: [{ name: 'node', pid: 1, eventType: 'start', timestamp: 0 }],
            };
            expect(activity.fileEvents).toHaveLength(1);
            expect(activity.gitEvents).toHaveLength(1);
            expect(activity.processEvents).toHaveLength(1);
        });

        it('ActivityFilter accepts partial filters', () => {
            const filter: ActivityFilter = {
                startTime: Date.now() - 3600000,
                projects: ['my-app'],
            };
            expect(filter.startTime).toBeDefined();
            expect(filter.endTime).toBeUndefined();
        });
    });

    describe('Context types', () => {
        it('DependencyNode accepts valid structure', () => {
            const node: DependencyNode = {
                path: 'src/index.ts',
                type: 'file',
                language: 'typescript',
                dependencies: ['./utils'],
                dependents: ['./main'],
                exports: ['default'],
                imports: ['react'],
            };
            expect(node.type).toBe('file');
            expect(node.language).toBe('typescript');
        });

        it('DependencyGraph uses Map for nodes', () => {
            const graph: DependencyGraph = {
                nodes: new Map(),
                lastUpdated: Date.now(),
            };
            graph.nodes.set('test', {
                path: 'test',
                type: 'file',
                language: 'typescript',
                dependencies: [],
                dependents: [],
                exports: [],
                imports: [],
            });
            expect(graph.nodes.size).toBe(1);
        });

        it('CodePattern supports all categories', () => {
            const categories: CodePattern['category'][] = [
                'auth', 'api-call', 'error-handling', 'config', 'other'
            ];
            categories.forEach((cat) => {
                const pattern: CodePattern = {
                    pattern: 'test',
                    description: 'Test pattern',
                    files: [],
                    frequency: 1,
                    category: cat,
                };
                expect(pattern.category).toBe(cat);
            });
        });

        it('ProjectContext accepts valid structure', () => {
            const ctx: ProjectContext = {
                name: 'my-app',
                path: 'C:\\dev\\apps\\my-app',
                type: 'web-app',
                frameworks: ['react', 'vite'],
                lastActive: Date.now(),
                fileCount: 100,
            };
            expect(ctx.type).toBe('web-app');
            expect(ctx.frameworks).toContain('react');
        });

        it('WorkspaceContext aggregates projects', () => {
            const workspace: WorkspaceContext = {
                projects: [],
                sharedPatterns: [],
                crossProjectDependencies: [
                    { from: 'app-a', to: 'lib-b', type: 'shared-config' }
                ],
            };
            expect(workspace.crossProjectDependencies).toHaveLength(1);
        });
    });

    describe('Monitoring types', () => {
        it('MonitoringConfig accepts valid structure', () => {
            const config: MonitoringConfig = {
                workspacePath: 'C:\\dev',
                excludePaths: ['node_modules', '.git'],
                debounceMs: 100,
                maxEventsPerSecond: 50,
            };
            expect(config.excludePaths).toContain('node_modules');
        });

        it('WatcherStatus tracks running state', () => {
            const status: WatcherStatus = {
                isRunning: true,
                watchedPaths: 150,
                eventsPerSecond: 2.5,
                lastEventTime: Date.now(),
                errors: [],
            };
            expect(status.isRunning).toBe(true);
            expect(status.errors).toHaveLength(0);
        });

        it('GitRepoInfo includes branch and commit info', () => {
            const info: GitRepoInfo = {
                path: 'C:\\dev',
                currentBranch: 'feature/test',
                isDirty: true,
                ahead: 2,
                behind: 0,
                lastCommit: {
                    hash: 'abc123',
                    message: 'Add feature',
                    author: 'dev@example.com',
                    timestamp: Date.now(),
                },
            };
            expect(info.isDirty).toBe(true);
            expect(info.lastCommit?.hash).toBe('abc123');
        });

        it('DevelopmentServer supports all server types', () => {
            const types: DevelopmentServer['type'][] = [
                'vite', 'webpack', 'tauri', 'next', 'cargo', 'python', 'node', 'other'
            ];
            types.forEach((t) => {
                const server: DevelopmentServer = {
                    name: 'dev-server',
                    pid: 1234,
                    port: 3000,
                    type: t,
                    project: 'my-app',
                    uptime: 3600,
                    isHealthy: true,
                };
                expect(server.type).toBe(t);
            });
        });
    });

    describe('Recommendation types', () => {
        it('Recommendation accepts valid structure', () => {
            const rec: Recommendation = {
                type: 'next-steps',
                priority: 'high',
                status: 'pending',
                title: 'Run tests',
                description: 'You should run tests before committing',
                reasoning: 'Tests havent been run in 2 hours',
                confidence: 0.85,
                context: { lastTestRun: Date.now() - 7200000 },
                createdAt: Date.now(),
            };
            expect(rec.type).toBe('next-steps');
            expect(rec.confidence).toBeGreaterThan(0);
            expect(rec.confidence).toBeLessThanOrEqual(1);
        });

        it('Recommendation supports all types', () => {
            const types: RecommendationType[] = [
                'next-steps', 'production-check', 'workflow', 'code-quality',
                'git-reminder', 'test-suggestion', 'documentation'
            ];
            types.forEach((t) => {
                const rec: Recommendation = {
                    type: t,
                    priority: 'medium',
                    status: 'pending',
                    title: 'Test',
                    description: 'Test',
                    reasoning: 'Test',
                    confidence: 0.5,
                    context: {},
                    createdAt: 0,
                };
                expect(rec.type).toBe(t);
            });
        });

        it('Recommendation supports all priorities', () => {
            const priorities: RecommendationPriority[] = ['low', 'medium', 'high', 'urgent'];
            priorities.forEach((p) => {
                const rec: Recommendation = {
                    type: 'next-steps',
                    priority: p,
                    status: 'pending',
                    title: 'Test',
                    description: 'Test',
                    reasoning: 'Test',
                    confidence: 0.5,
                    context: {},
                    createdAt: 0,
                };
                expect(rec.priority).toBe(p);
            });
        });

        it('Recommendation supports all statuses', () => {
            const statuses: RecommendationStatus[] = [
                'pending', 'accepted', 'rejected', 'deferred', 'expired'
            ];
            statuses.forEach((s) => {
                const rec: Recommendation = {
                    type: 'next-steps',
                    priority: 'medium',
                    status: s,
                    title: 'Test',
                    description: 'Test',
                    reasoning: 'Test',
                    confidence: 0.5,
                    context: {},
                    createdAt: 0,
                };
                expect(rec.status).toBe(s);
            });
        });

        it('RecommendationFeedback tracks user response', () => {
            const feedback: RecommendationFeedback = {
                recommendationId: 1,
                wasHelpful: true,
                feedback: 'Very useful suggestion',
                timestamp: Date.now(),
            };
            expect(feedback.wasHelpful).toBe(true);
        });

        it('PromptContext captures user activity', () => {
            const ctx: PromptContext = {
                recentActivity: {
                    files: ['src/index.ts', 'src/utils.ts'],
                    gitBranches: ['main', 'feature/test'],
                    processes: ['vite', 'tsc'],
                },
                currentFocus: {
                    project: 'my-app',
                    activeFiles: ['src/index.ts'],
                },
                userPatterns: {
                    commonWorkflows: ['test-then-commit'],
                    preferredTools: ['vite', 'vitest'],
                },
            };
            expect(ctx.recentActivity.files).toHaveLength(2);
            expect(ctx.currentFocus.project).toBe('my-app');
        });
    });
});
