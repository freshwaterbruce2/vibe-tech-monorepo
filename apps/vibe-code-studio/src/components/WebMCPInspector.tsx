/**
 * WebMCPInspector - Live inspector for in-page WebMCP tools.
 *
 * Lists tools registered with the WebMCPManager (imperative tools registered
 * by hooks like useWebMCP, plus declarative form[toolname] tools discovered in
 * the DOM), shows their JSON schemas, and lets the user test-invoke them.
 */

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Play, Plug, RefreshCw, X } from 'lucide-react';
import styled from 'styled-components';

import { WebMCPManager } from '@vibetech/shared-utils';
import { logger } from '../services/Logger';
import { vibeTheme } from '../styles/theme';

interface InspectedTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  type: 'imperative' | 'declarative';
}

interface InvocationResult {
  ok: boolean;
  text: string;
}

const PanelContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: ${vibeTheme.colors.primary};
  color: ${vibeTheme.colors.text};
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${vibeTheme.spacing.sm} ${vibeTheme.spacing.md};
  background: ${vibeTheme.colors.secondary};
  border-bottom: 1px solid rgba(139, 92, 246, 0.2);
`;

const Title = styled.h3`
  margin: 0;
  font-size: ${vibeTheme.typography.fontSize.base};
  font-weight: ${vibeTheme.typography.fontWeight.medium};
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.xs};

  svg {
    width: 18px;
    height: 18px;
    color: ${vibeTheme.colors.purple};
  }
`;

const Actions = styled.div`
  display: flex;
  gap: ${vibeTheme.spacing.xs};
`;

const ActionButton = styled.button`
  background: transparent;
  border: none;
  color: ${vibeTheme.colors.textSecondary};
  cursor: pointer;
  padding: ${vibeTheme.spacing.xs};
  border-radius: ${vibeTheme.borderRadius.small};
  transition: all ${vibeTheme.animation.duration.fast} ease;

  &:hover {
    background: rgba(139, 92, 246, 0.1);
    color: ${vibeTheme.colors.text};
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const ModeBadge = styled.span<{ native: boolean }>`
  padding: 2px 8px;
  border-radius: ${vibeTheme.borderRadius.small};
  font-size: ${vibeTheme.typography.fontSize.xs};
  background: ${props => props.native ? 'rgba(34, 197, 94, 0.1)' : 'rgba(139, 92, 246, 0.1)'};
  color: ${props => props.native ? '#22c55e' : vibeTheme.colors.purple};
`;

const ScrollContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${vibeTheme.spacing.md};
`;

const ToolCard = styled.div`
  background: ${vibeTheme.colors.secondary};
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: ${vibeTheme.borderRadius.medium};
  padding: ${vibeTheme.spacing.sm} ${vibeTheme.spacing.md};
  margin-bottom: ${vibeTheme.spacing.sm};
`;

const ToolHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.xs};
  cursor: pointer;
  font-size: ${vibeTheme.typography.fontSize.sm};
  font-weight: ${vibeTheme.typography.fontWeight.medium};

  svg {
    width: 14px;
    height: 14px;
    color: ${vibeTheme.colors.purple};
  }
`;

const ToolName = styled.span`
  flex: 1;
  color: ${vibeTheme.colors.text};
  word-break: break-all;
`;

const TypeChip = styled.span<{ declarative: boolean }>`
  padding: 1px 6px;
  border-radius: ${vibeTheme.borderRadius.small};
  font-size: ${vibeTheme.typography.fontSize.xs};
  background: ${props => props.declarative ? 'rgba(34, 211, 238, 0.1)' : 'rgba(139, 92, 246, 0.1)'};
  color: ${props => props.declarative ? '#22d3ee' : vibeTheme.colors.purple};
`;

const ToolBody = styled.div`
  margin-top: ${vibeTheme.spacing.sm};
  display: flex;
  flex-direction: column;
  gap: ${vibeTheme.spacing.xs};
`;

const Description = styled.div`
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${vibeTheme.colors.textSecondary};
`;

const Label = styled.div`
  font-size: ${vibeTheme.typography.fontSize.xs};
  color: ${vibeTheme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: ${vibeTheme.spacing.xs};
`;

const CodeBlock = styled.pre<{ error?: boolean }>`
  margin: 0;
  padding: ${vibeTheme.spacing.xs} ${vibeTheme.spacing.sm};
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid ${props => props.error ? 'rgba(239, 68, 68, 0.3)' : 'rgba(139, 92, 246, 0.1)'};
  border-radius: ${vibeTheme.borderRadius.small};
  font-size: ${vibeTheme.typography.fontSize.xs};
  color: ${props => props.error ? '#ef4444' : vibeTheme.colors.text};
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
`;

const ArgsTextarea = styled.textarea`
  width: 100%;
  min-height: 70px;
  padding: ${vibeTheme.spacing.xs} ${vibeTheme.spacing.sm};
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: ${vibeTheme.borderRadius.small};
  color: ${vibeTheme.colors.text};
  font-family: monospace;
  font-size: ${vibeTheme.typography.fontSize.xs};
  resize: vertical;

  &:focus {
    outline: none;
    border-color: rgba(139, 92, 246, 0.5);
  }
`;

const RunButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${vibeTheme.spacing.xs};
  padding: ${vibeTheme.spacing.xs} ${vibeTheme.spacing.sm};
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: ${vibeTheme.borderRadius.small};
  color: ${vibeTheme.colors.purple};
  cursor: pointer;
  font-size: ${vibeTheme.typography.fontSize.xs};
  transition: all ${vibeTheme.animation.duration.fast} ease;

  &:hover {
    background: rgba(139, 92, 246, 0.2);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 12px;
    height: 12px;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${vibeTheme.spacing.xl} ${vibeTheme.spacing.md};
  color: ${vibeTheme.colors.textSecondary};
  font-size: ${vibeTheme.typography.fontSize.sm};
`;

function buildArgsSkeleton(schema: Record<string, unknown>): string {
  const properties = schema['properties'] as Record<string, { type?: string }> | undefined;
  if (!properties || Object.keys(properties).length === 0) return '{}';

  const skeleton: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(properties)) {
    if (prop.type === 'number') skeleton[key] = 0;
    else if (prop.type === 'boolean') skeleton[key] = false;
    else skeleton[key] = '';
  }
  return JSON.stringify(skeleton, null, 2);
}

interface WebMCPInspectorProps {
  onClose: () => void;
}

export const WebMCPInspector = ({ onClose }: WebMCPInspectorProps) => {
  const manager = WebMCPManager.getInstance();

  const [tools, setTools] = useState<InspectedTool[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [argsDrafts, setArgsDrafts] = useState<Map<string, string>>(new Map());
  const [results, setResults] = useState<Map<string, InvocationResult>>(new Map());
  const [running, setRunning] = useState<Set<string>>(new Set());

  const refresh = useCallback(() => {
    setTools(manager.listTools());
  }, [manager]);

  useEffect(() => {
    refresh();
    return manager.subscribe(refresh);
  }, [manager, refresh]);

  const toggleExpand = useCallback((tool: InspectedTool) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(tool.name)) {
        next.delete(tool.name);
      } else {
        next.add(tool.name);
      }
      return next;
    });
    setArgsDrafts(prev => {
      if (prev.has(tool.name)) return prev;
      return new Map(prev).set(tool.name, buildArgsSkeleton(tool.inputSchema));
    });
  }, []);

  const handleRun = useCallback(async (toolName: string) => {
    const raw = argsDrafts.get(toolName)?.trim() || '{}';
    let args: Record<string, unknown>;
    try {
      args = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      setResults(prev => new Map(prev).set(toolName, { ok: false, text: 'Arguments are not valid JSON' }));
      return;
    }

    setRunning(prev => new Set(prev).add(toolName));
    try {
      const result = await manager.executeTool(toolName, args);
      setResults(prev => new Map(prev).set(toolName, {
        ok: true,
        text: JSON.stringify(result, null, 2) ?? 'undefined',
      }));
    } catch (error) {
      logger.error('[WebMCPInspector] Tool invocation failed:', error);
      setResults(prev => new Map(prev).set(toolName, {
        ok: false,
        text: error instanceof Error ? error.message : String(error),
      }));
    } finally {
      setRunning(prev => {
        const next = new Set(prev);
        next.delete(toolName);
        return next;
      });
    }
  }, [argsDrafts, manager]);

  const isNative = manager.hasNativeModelContext();

  return (
    <PanelContainer data-testid="webmcp-inspector">
      <PanelHeader>
        <Title>
          <Plug />
          WebMCP Tools
          <ModeBadge native={isNative}>{isNative ? 'Native' : 'Polyfill'}</ModeBadge>
        </Title>
        <Actions>
          <ActionButton onClick={refresh} title="Refresh tools">
            <RefreshCw />
          </ActionButton>
          <ActionButton onClick={onClose} title="Close inspector">
            <X />
          </ActionButton>
        </Actions>
      </PanelHeader>

      <ScrollContent>
        {tools.length === 0 ? (
          <EmptyState>
            No WebMCP tools registered.
            <br />
            Tools appear here when registered via document.modelContext
            or declared with form[toolname] in the DOM.
          </EmptyState>
        ) : (
          tools.map(tool => {
            const isExpanded = expanded.has(tool.name);
            const result = results.get(tool.name);
            const isRunning = running.has(tool.name);

            return (
              <ToolCard key={tool.name}>
                <ToolHeader onClick={() => toggleExpand(tool)}>
                  {isExpanded ? <ChevronDown /> : <ChevronRight />}
                  <ToolName>{tool.name}</ToolName>
                  <TypeChip declarative={tool.type === 'declarative'}>{tool.type}</TypeChip>
                </ToolHeader>

                {isExpanded && (
                  <ToolBody>
                    {tool.description && <Description>{tool.description}</Description>}

                    <Label>Input schema</Label>
                    <CodeBlock>{JSON.stringify(tool.inputSchema, null, 2)}</CodeBlock>

                    <Label>Arguments (JSON)</Label>
                    <ArgsTextarea
                      value={argsDrafts.get(tool.name) ?? '{}'}
                      onChange={(e) => {
                        const value = e.target.value;
                        setArgsDrafts(prev => new Map(prev).set(tool.name, value));
                      }}
                      spellCheck={false}
                    />

                    <RunButton disabled={isRunning} onClick={async () => handleRun(tool.name)}>
                      {isRunning ? <RefreshCw className="animate-spin" /> : <Play />}
                      {isRunning ? 'Running...' : 'Run tool'}
                    </RunButton>

                    {result && (
                      <>
                        <Label>{result.ok ? 'Result' : 'Error'}</Label>
                        <CodeBlock error={!result.ok}>{result.text}</CodeBlock>
                      </>
                    )}
                  </ToolBody>
                )}
              </ToolCard>
            );
          })
        )}
      </ScrollContent>
    </PanelContainer>
  );
};

export default WebMCPInspector;
