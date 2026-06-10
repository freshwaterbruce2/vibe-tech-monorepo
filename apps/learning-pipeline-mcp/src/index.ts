#!/usr/bin/env node
/**
 * learning-pipeline-mcp - MCP server for orchestrating learning system pipeline.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

const server = new McpServer({
  name: 'learning-pipeline-mcp',
  version: '1.0.0',
});

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT ?? 'V:/monorepo';
const LEARNING_SYSTEM_DIR = 'D:/learning-system';

interface ExecError extends Error {
  stdout?: string;
  stderr?: string;
}

// Helper to run a command and return response
async function runCommand(command: string, cwd: string) {
  try {
    const { stdout, stderr } = await execAsync(command, { cwd });
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          success: true,
          stdout: stdout.trim(),
          stderr: stderr.trim()
        }, null, 2)
      }]
    };
  } catch (error: unknown) {
    const err = error as ExecError;
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          success: false,
          error: err.message,
          stdout: err.stdout?.trim() ?? '',
          stderr: err.stderr?.trim() ?? ''
        }, null, 2)
      }],
      isError: true
    };
  }
}

// Helper to parse simple CSV files
function parseCSV(filePath: string) {
  if (!existsSync(filePath)) return [];
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];

  // Parse headers
  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

// --- Tool: trigger_insight_generation ------------------------------
server.tool(
  'trigger_insight_generation',
  'Regenerate daily learning insights (learning_insights.json) and recommendations from SQLite DB.',
  {
    days: z.number().optional().describe('Number of history days to analyze'),
    dryRun: z.boolean().optional().describe('Run without writing to DB or filesystem')
  },
  async ({ days, dryRun }) => {
    const resolvedDays = days ?? 30;
    const resolvedDryRun = dryRun ?? false;
    const cmd = `python "${LEARNING_SYSTEM_DIR}/scripts/refresh_insights.py" --days ${resolvedDays}${resolvedDryRun ? ' --dry-run' : ''}`;
    const result = await runCommand(cmd, LEARNING_SYSTEM_DIR);
    return {
      content: result.content.map(c => ({...c, type: "text" as const}))
    };
  }
);

// --- Tool: run_skill_analysis --------------------------------------
server.tool(
  'run_skill_analysis',
  'Analyze the learning database to identify repetitive task patterns and skill candidates.',
  {
    daysBack: z.number().optional().default(30).describe('How many days back to analyze'),
    minOccurrences: z.number().optional().default(10).describe('Minimum times pattern must appear'),
    minSuccessRate: z.number().optional().default(0.8).describe('Minimum success rate threshold (0.0 to 1.0)')
  },
  async ({ daysBack, minOccurrences, minSuccessRate }) => {
    const scriptPath = join(WORKSPACE_ROOT, 'scripts/auto-generate-skills/Analyze-Patterns.ps1');
    const cmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" -DaysBack ${daysBack} -MinOccurrences ${minOccurrences} -MinSuccessRate ${minSuccessRate}`;
    const result = await runCommand(cmd, WORKSPACE_ROOT);
    return {
      content: result.content.map(c => ({...c, type: "text" as const}))
    };
  }
);

// --- Tool: generate_skill ------------------------------------------
server.tool(
  'generate_skill',
  'Auto-generate a new skill or agent file based on an identified candidate pattern using Gemini.',
  {
    patternName: z.string().min(1).describe('The name of the candidate pattern to generate a skill for'),
    type: z.enum(['Skill', 'Agent']).optional().describe('Whether to generate a Skill or an Agent')
  },
  async ({ patternName, type }) => {
    const resolvedType = type ?? 'Skill';
    const scriptPath = join(WORKSPACE_ROOT, 'scripts/auto-generate-skills/Generate-Skill.ps1');
    const cmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" -PatternName "${patternName}" -Type "${resolvedType}"`;
    const result = await runCommand(cmd, WORKSPACE_ROOT);
    return {
      content: result.content.map(c => ({...c, type: "text" as const}))
    };
  }
);

// --- Tool: list_skill_candidates -----------------------------------
server.tool(
  'list_skill_candidates',
  'Read the analyzed skill and agent candidates from the CSV file.',
  {},
  async () => {
    try {
      const csvPath = join(WORKSPACE_ROOT, '.agent/skills/auto-skill-creator/analysis/skill-candidates.csv');
      if (!existsSync(csvPath)) {
        return {
          content: [{
            type: 'text' as const,
            text: 'No skill candidates found. Please run_skill_analysis first.'
          }]
        };
      }
      const candidates = parseCSV(csvPath);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(candidates, null, 2)
        }]
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        content: [{
          type: 'text' as const,
          text: `Error reading candidates: ${err.message}`
        }],
        isError: true
      };
    }
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Learning Pipeline MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});