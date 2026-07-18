/**
 * generate_code executor tests — the core "Agent Mode actually writes files"
 * fix. A generate_code step that targets a filePath must persist the generated
 * content to disk (previously it only returned/streamed the code, so "create
 * file X" plans reported success while writing nothing). Steps without a
 * filePath stay display/synthesis steps and write nothing.
 */
import { describe, expect, it, vi } from 'vitest';
import { MutationApplyError } from '../../../../services/agent-runtime/MutationService';
import {
  createActionRegistry,
  executeGenerateCode,
} from '../../../../services/ai/execution/actions';
import type { ActionContext } from '../../../../services/ai/execution/types';

function makeContext(overrides: Partial<ActionContext> = {}) {
  let exists = false;
  let content = 'export const old = true;';
  const writeFile = vi.fn(async (_path: string, value: string) => {
    exists = true;
    content = value;
  });
  const existsMock = vi.fn(async (path: string) => path === '/ws' || path === '/ws/src' || exists);
  const onFileChanged = vi.fn();
  const sendContextualMessage = vi.fn(async () => ({ content: 'export const x = 1;' }));

  const context = {
    fileSystemService: {
      resolveWorkspacePath: (p: string, root: string) => `${root}/${p}`,
      exists: existsMock,
      readFile: vi.fn(async () => content),
      writeFile,
    },
    aiService: { sendContextualMessage },
    workspaceService: { getWorkspaceContext: vi.fn(async () => ({ summary: 'ws' })) },
    gitService: { getFileAtHead: vi.fn(async () => null) },
    taskState: {
      task: {
        id: 'task-1',
        title: 'Generate',
        description: 'Generate file',
        userRequest: 'create a file',
        steps: [],
        status: 'in_progress',
        createdAt: new Date(),
      },
      currentStep: {
        id: 'step-1',
        taskId: 'task-1',
        order: 1,
        title: 'Generate',
        description: 'Generate file',
        action: { type: 'generate_code', params: { filePath: 'src/x.ts' } },
        status: 'in_progress',
        requiresApproval: true,
        retryCount: 0,
        maxRetries: 1,
      },
      userRequest: 'create a file',
      workspaceRoot: '/ws',
    },
    liveStream: undefined,
    callbacks: { onFileChanged, onStepApprovalRequired: vi.fn(async () => true) },
    requestMutationApproval: vi.fn(async () => true),
    ...overrides,
  } as unknown as ActionContext;

  return { context, writeFile, onFileChanged, sendContextualMessage };
}

describe('registry wiring', () => {
  it('registers generate_code in the action registry', () => {
    expect(createActionRegistry().get('generate_code')).toBe(executeGenerateCode);
  });
});

describe('executeGenerateCode persistence', () => {
  it('writes the generated code to disk when a filePath is supplied', async () => {
    const { context, writeFile, onFileChanged } = makeContext();

    const result = await executeGenerateCode(
      { description: 'make x', filePath: 'src/x.ts' },
      context
    );

    expect(writeFile).toHaveBeenCalledWith('/ws/src/x.ts', 'export const x = 1;');
    expect(onFileChanged).toHaveBeenCalledWith('/ws/src/x.ts', 'created');
    expect(result.filesCreated).toEqual(['/ws/src/x.ts']);
    expect(result.message).toContain('Generated and created file');
  });

  it('strips an unmatched Markdown opening fence before approval and persistence', async () => {
    const { context, writeFile } = makeContext({
      aiService: {
        sendContextualMessage: vi.fn(async () => ({
          content: '```typescript\nexport const unfenced = true;',
        })),
      },
    } as unknown as Partial<ActionContext>);

    await executeGenerateCode(
      { description: 'make x', filePath: 'src/x.ts', targetLanguage: 'TypeScript' },
      context
    );

    expect(writeFile).toHaveBeenCalledWith('/ws/src/x.ts', 'export const unfenced = true;');
    expect(context.requestMutationApproval).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ diff: expect.not.stringContaining('+```typescript') })
    );
  });

  it('does not write anything for a display/synthesis step (no filePath)', async () => {
    const { context, writeFile, onFileChanged } = makeContext();

    const result = await executeGenerateCode(
      { description: 'synthesize a review of the files analyzed above' },
      context
    );

    expect(writeFile).not.toHaveBeenCalled();
    expect(onFileChanged).not.toHaveBeenCalled();
    expect(result.filesCreated).toBeUndefined();
    expect(result.data).toMatchObject({ generatedCode: 'export const x = 1;' });
  });

  it('returns raw display synthesis prose using only completed inspection evidence', async () => {
    const providerProse = '```markdown\n## Verified findings\nOnly dist/index.js exists.\n```';
    const displaySynthesisRequest = vi.fn(async () => ({ content: providerProse }));
    const { context, writeFile, onFileChanged } = makeContext({
      aiService: { sendContextualMessage: displaySynthesisRequest },
    } as unknown as Partial<ActionContext>);
    const currentStep = context.taskState.currentStep!;
    currentStep.order = 3;
    currentStep.action = {
      type: 'generate_code',
      params: { description: 'Report the verified findings', displayOnly: true },
    };
    context.taskState.task!.steps = [
      {
        id: 'step-read-package',
        taskId: 'task-1',
        order: 1,
        title: 'Read package metadata',
        description: 'Inspect package.json',
        action: { type: 'read_file', params: { filePath: 'package.json' } },
        status: 'completed',
        requiresApproval: false,
        retryCount: 0,
        maxRetries: 1,
        result: {
          success: true,
          data: {
            filePath: '/ws/package.json',
            content: '{"name":"proactive-recommendations-mcp"}',
          },
        },
      },
      {
        id: 'step-analyze-tsconfig',
        taskId: 'task-1',
        order: 2,
        title: 'Analyze compiler settings',
        description: 'Inspect tsconfig.json',
        action: { type: 'analyze_code', params: { filePath: 'tsconfig.json' } },
        status: 'completed',
        requiresApproval: false,
        retryCount: 0,
        maxRetries: 1,
        result: {
          success: true,
          data: {
            analysis: {
              filePath: '/ws/tsconfig.json',
              content: '{"compilerOptions":{"declaration":false}}',
              aiReview: 'Declarations and source maps are disabled.',
            },
          },
        },
      },
      currentStep,
    ];

    const result = await executeGenerateCode(
      { description: 'Report the verified findings', displayOnly: true },
      context
    );

    const request = displaySynthesisRequest.mock.calls[0]?.[0] as { userQuery: string };
    expect(result).toMatchObject({
      success: true,
      data: { generatedCode: providerProse, isSynthesis: true },
      message: 'Review synthesized successfully',
    });
    expect(request.userQuery).toContain('<<<BEGIN_INSPECTED_EVIDENCE>>>');
    expect(request.userQuery).toContain('/ws/package.json');
    expect(request.userQuery).toContain('proactive-recommendations-mcp');
    expect(request.userQuery).toContain('/ws/tsconfig.json');
    expect(request.userQuery).toContain('Declarations and source maps are disabled.');
    expect(request.userQuery).toContain('not source code');
    expect(request.userQuery).toContain('Do not generate a script, command, or implementation.');
    expect(request.userQuery).toContain(
      'Do not inspect, assume, or claim to have checked any additional files.'
    );
    expect(context.fileSystemService.readFile).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
    expect(onFileChanged).not.toHaveBeenCalled();
    expect(context.requestMutationApproval).not.toHaveBeenCalled();
  });

  it('classifies an existing target as modified', async () => {
    const { context, onFileChanged } = makeContext();
    vi.mocked(context.fileSystemService.exists).mockResolvedValue(true);
    const result = await executeGenerateCode(
      { description: 'repair x', filePath: 'src/x.ts' },
      context
    );
    expect(result.filesModified).toEqual(['/ws/src/x.ts']);
    expect(result.filesCreated).toBeUndefined();
    expect(onFileChanged).toHaveBeenCalledWith('/ws/src/x.ts', 'modified');
  });

  it('fails without writing when the model returns no code', async () => {
    const { context, writeFile } = makeContext({
      aiService: { sendContextualMessage: vi.fn(async () => ({ content: '' })) },
    } as unknown as Partial<ActionContext>);

    await expect(
      executeGenerateCode({ description: 'make x', filePath: 'src/x.ts' }, context)
    ).rejects.toThrow(/no executable generated content/);

    expect(writeFile).not.toHaveBeenCalled();
  });

  it('does not write when exact-diff approval is rejected', async () => {
    const { context, writeFile, onFileChanged } = makeContext({
      requestMutationApproval: vi.fn(async () => false),
    });

    const result = await executeGenerateCode(
      { description: 'make x', filePath: 'src/x.ts' },
      context
    );

    expect(result).toMatchObject({ success: false, cancelled: true, skipped: true });
    expect(writeFile).not.toHaveBeenCalled();
    expect(onFileChanged).not.toHaveBeenCalled();
  });

  it('preserves typed mutation failure metadata after approved generation', async () => {
    const { context, writeFile } = makeContext();
    writeFile.mockRejectedValueOnce(new Error('disk write denied'));

    let failure: unknown;
    try {
      await executeGenerateCode({ description: 'make x', filePath: 'src/x.ts' }, context);
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(MutationApplyError);
    expect(failure).toMatchObject({
      path: '/ws/src/x.ts',
      changeType: 'create',
      validated: false,
    });
  });

  it('persists the combined output of a chunked generation', async () => {
    const { context, writeFile } = makeContext();

    const result = await executeGenerateCode(
      {
        description: 'make big file',
        chunked: true,
        chunks: [{ description: 'part a' }],
        filePath: 'src/big.ts',
      },
      context
    );

    expect(writeFile).toHaveBeenCalledWith('/ws/src/big.ts', 'export const x = 1;');
    expect(result.filesCreated).toEqual(['/ws/src/big.ts']);
  });

  it('passes prior inspected file evidence to generation before staging the exact diff', async () => {
    const { context, sendContextualMessage } = makeContext();
    const currentStep = context.taskState.currentStep!;
    currentStep.order = 2;
    context.taskState.task!.steps = [
      {
        id: 'step-read-package',
        taskId: 'task-1',
        order: 1,
        title: 'Inspect package',
        description: 'Read package.json',
        action: { type: 'read_file', params: { filePath: 'package.json' } },
        status: 'completed',
        requiresApproval: false,
        retryCount: 0,
        maxRetries: 1,
        result: {
          success: true,
          data: {
            filePath: '/ws/package.json',
            content: '{"name":"proactive-recommendations-mcp","exports":"./src/index.ts"}',
          },
        },
      },
      currentStep,
    ];

    await executeGenerateCode(
      { description: 'restore the entry point', filePath: 'src/index.ts' },
      context
    );

    const aiRequest = sendContextualMessage.mock.calls[0]?.[0] as { userQuery: string };
    expect(aiRequest.userQuery).toContain('<<<BEGIN_INSPECTED_EVIDENCE>>>');
    expect(aiRequest.userQuery).toContain('/ws/package.json');
    expect(aiRequest.userQuery).toContain('proactive-recommendations-mcp');
    expect(sendContextualMessage.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(context.requestMutationApproval!).mock.invocationCallOrder[0]!
    );
    expect(context.requestMutationApproval).toHaveBeenCalledWith(
      currentStep,
      expect.objectContaining({ diff: expect.stringContaining('export const x = 1;') })
    );
  });

  it('passes the read-only Git HEAD baseline before corrupted working-file evidence', async () => {
    const { context, sendContextualMessage } = makeContext({
      gitService: {
        getFileAtHead: vi.fn(async () => '#!/usr/bin/env node\nconst durable = true;'),
      },
    } as unknown as Partial<ActionContext>);

    await executeGenerateCode(
      { description: 'restore src/index.ts', filePath: 'src/index.ts' },
      context
    );

    const request = sendContextualMessage.mock.calls[0]?.[0] as {
      userQuery: string;
      maxTokens?: number;
    };
    expect(context.gitService.getFileAtHead).toHaveBeenCalledWith('src/index.ts', '/ws');
    expect(request.userQuery).toContain('Git HEAD baseline for src/index.ts');
    expect(request.userQuery).toContain('const durable = true;');
    expect(request.userQuery).toContain('Do not wrap the answer in Markdown code fences.');
    expect(request.userQuery).toContain(
      'Do not replace it with a demo, stub, in-memory substitute'
    );
    expect(request.maxTokens).toBe(8192);
  });

  it('stages exact Git HEAD bytes for an explicit restoration without model rewriting', async () => {
    const baseline = '#!/usr/bin/env node\nexport const durable = true;\n';
    const { context, writeFile, sendContextualMessage } = makeContext({
      gitService: { getFileAtHead: vi.fn(async () => baseline) },
    } as unknown as Partial<ActionContext>);
    context.taskState.userRequest = 'Restore src/index.ts entry point.';
    context.taskState.task!.userRequest = context.taskState.userRequest;

    await executeGenerateCode(
      { description: 'restore src/index.ts', filePath: 'src/index.ts' },
      context
    );

    expect(sendContextualMessage).not.toHaveBeenCalled();
    expect(context.requestMutationApproval).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ diff: expect.stringContaining('+export const durable = true;') })
    );
    expect(writeFile).toHaveBeenCalledWith('/ws/src/index.ts', baseline);
  });

  it('rejects token-limit truncation before staging approval', async () => {
    const { context, writeFile } = makeContext({
      aiService: {
        sendContextualMessage: vi.fn(async () => ({
          content: 'export const truncated =',
          finishReason: 'length',
        })),
      },
    } as unknown as Partial<ActionContext>);

    await expect(
      executeGenerateCode({ description: 'restore x', filePath: 'src/x.ts' }, context)
    ).rejects.toThrow(/truncated generated code/);

    expect(context.requestMutationApproval).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('throws when description is missing', async () => {
    const { context } = makeContext();
    await expect(executeGenerateCode({ filePath: 'src/x.ts' }, context)).rejects.toThrow(
      /Missing required parameter: description/
    );
  });
});
