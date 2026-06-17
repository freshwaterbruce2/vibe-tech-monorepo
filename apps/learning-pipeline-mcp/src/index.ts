import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import Database from 'better-sqlite3';
import * as fs from 'node:fs';
import * as path from 'node:path';

const LEARNING_DB_PATH = process.env.LEARNING_DB_PATH || 'D:\\databases\\agent_learning.db';
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || 'V:/monorepo';
const LEARNING_INSIGHTS_PATH = process.env.LEARNING_INSIGHTS_PATH || 'D:/learning-system/learning_insights.json';

interface LearningInsights {
  timestamp: string;
  generated_by: string;
  data_range_days: number;
  total_executions: number;
  mistake_patterns: Array<{
    type: string;
    frequency: number;
    avg_recurrence: number;
    examples: string;
    preventions: string;
  }>;
  success_patterns: Array<{
    task_type: string;
    total_executions: number;
    successes: number;
    success_rate: number;
    avg_execution_time: number;
    tools_used: string;
  }>;
  performance_insights: Array<{
    agent: string;
    success_rate: number;
    total_tasks: number;
    avg_time: number;
  }>;
  tool_usage_patterns: Array<{
    tools: string;
    usage_count: number;
    success_rate: number;
  }>;
  recommendations: Array<{
    priority: string;
    category: string;
    issue: string;
    action: string;
    expected_impact: string;
  }>;
}

interface GeneratedSkill {
  name: string;
  category: string;
  description: string;
  trigger_conditions: string[];
  steps: string[];
  tools: string[];
  confidence: number;
  source_pattern: string;
}

const server = new Server(
  {
    name: 'learning-pipeline-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

function loadInsights(): LearningInsights {
  const content = fs.readFileSync(LEARNING_INSIGHTS_PATH, 'utf-8');
  return JSON.parse(content);
}

function loadLastSkillGeneration(): string {
  const db = new Database(LEARNING_DB_PATH, { readonly: true });
  try {
    const row = db.prepare(`
      SELECT MAX(generated_at) as last_gen FROM generated_skills
    `).get() as { last_gen: string | null };
    return row.last_gen || '1970-01-01';
  } finally {
    db.close();
  }
}

function analyzePatterns(insights: LearningInsights, lastGen: string): GeneratedSkill[] {
  const skills: GeneratedSkill[] = [];
  const insightsTime = new Date(insights.timestamp).getTime();
  const lastGenTime = new Date(lastGen).getTime();

  if (insightsTime <= lastGenTime) {
    return skills;
  }

  // Analyze success patterns for high-confidence skills
  for (const pattern of insights.success_patterns) {
    if (pattern.success_rate >= 95 && pattern.total_executions >= 10) {
      const tools = JSON.parse(pattern.tools_used.replace(/\\"/g, '"'));
      const skillName = pattern.task_type.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      if (!skillName || skillName.length < 3) continue;

      skills.push({
        name: skillName,
        category: 'devops',
        description: `High-confidence pattern for ${pattern.task_type} operations (${pattern.success_rate}% success rate over ${pattern.total_executions} executions)`,
        trigger_conditions: [
          `Task involves ${pattern.task_type.toLowerCase()} operations`,
          `Need reliable ${tools.join(', ')} usage patterns`
        ],
        steps: [
          `Use ${tools.join(' → ')} in sequence for ${pattern.task_type.toLowerCase()}`,
          'Validate inputs before execution',
          'Handle errors with retry logic',
          'Log execution metrics for continuous improvement'
        ],
        tools,
        confidence: Math.min(pattern.success_rate / 100, 0.99),
        source_pattern: `success_pattern:${pattern.task_type}`
      });
    }
  }

  // Analyze tool usage patterns
  for (const pattern of insights.tool_usage_patterns) {
    if (pattern.success_rate >= 95 && pattern.usage_count >= 20) {
      const tools = JSON.parse(pattern.tools.replace(/\\"/g, '"'));
      const skillName = `tool-pattern-${tools.join('-').toLowerCase()}`;
      
      skills.push({
        name: skillName,
        category: 'devops',
        description: `Optimized tool usage pattern: ${tools.join(' + ')} (${pattern.success_rate}% success rate, ${pattern.usage_count} uses)`,
        trigger_conditions: [
          `Tasks requiring ${tools.join(' and ')}`,
          'High reliability required'
        ],
        steps: [
          `Chain ${tools.join(' → ')} for efficient workflow`,
          'Use appropriate flags and options for each tool',
          'Validate outputs between steps'
        ],
        tools,
        confidence: Math.min(pattern.success_rate / 100, 0.95),
        source_pattern: `tool_usage:${tools.join(',')}`
      });
    }
  }

  // Analyze recommendations for skill opportunities
  for (const rec of insights.recommendations) {
    if (rec.priority === 'HIGH' || rec.priority === 'CRITICAL') {
      const skillName = `rec-${rec.category}-${rec.issue.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}`;
      
      skills.push({
        name: skillName,
        category: 'devops',
        description: `Address ${rec.category}: ${rec.issue}. ${rec.action}`,
        trigger_conditions: [
          rec.issue
        ],
        steps: rec.action.split('. ').filter(s => s.length > 5),
        tools: [],
        confidence: rec.priority === 'CRITICAL' ? 0.9 : 0.8,
        source_pattern: `recommendation:${rec.category}`
      });
    }
  }

  // Analyze mistake patterns for prevention skills
  for (const mistake of insights.mistake_patterns) {
  if (mistake.frequency >= 3 && mistake.preventions !== 'N/A') {
    const skillName = `prevent-${mistake.type.toLowerCase()}-errors`;
      
      skills.push({
        name: skillName,
        category: 'debugging',
        description: `Prevent ${mistake.type} errors (${mistake.frequency} occurrences): ${mistake.examples.split(',')[0]}`,
        trigger_conditions: [
          `Working with ${mistake.type} operations`,
          'High error recurrence detected'
        ],
        steps: mistake.preventions.split('. ').filter(s => s.length > 5),
        tools: [mistake.type],
        confidence: 0.85,
        source_pattern: `mistake_pattern:${mistake.type}`
      });
    }
  }

  return skills;
}

function validateSkill(skill: GeneratedSkill): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (!skill.name || skill.name.length < 3) {
    issues.push('Skill name too short');
  }
  
  if (!skill.description || skill.description.length < 20) {
    issues.push('Description too short');
  }
  
  if (skill.steps.length === 0) {
    issues.push('No steps defined');
  }
  
  if (skill.confidence < 0.5) {
    issues.push('Confidence too low');
  }
  
  if (!/^[a-z0-9-]+$/.test(skill.name)) {
    issues.push('Skill name contains invalid characters');
  }

  return { valid: issues.length === 0, issues };
}

function saveSkillToDb(skill: GeneratedSkill) {
  const db = new Database(LEARNING_DB_PATH);
  try {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT OR IGNORE INTO generated_skills (name, type, generated_at, success_rate, usage_count, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(skill.name, 'skill', now, skill.confidence, 0, JSON.stringify({
      category: skill.category,
      description: skill.description,
      trigger_conditions: skill.trigger_conditions,
      steps: skill.steps,
      tools: skill.tools,
      source_pattern: skill.source_pattern
    }));
  } finally {
    db.close();
  }
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'run_skill_analysis',
        description: 'Analyze learning insights and generate high-confidence skills',
        inputSchema: {
          type: 'object',
          properties: {
            force: { type: 'boolean', description: 'Force analysis even if no new data' },
            min_confidence: { type: 'number', description: 'Minimum confidence threshold (0-1)', default: 0.7 }
          },
          required: []
        }
      },
      {
        name: 'get_learning_insights',
        description: 'Get current learning insights summary',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'list_generated_skills',
        description: 'List all generated skills from database',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 50 }
          },
          required: []
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'run_skill_analysis': {
        const insights = loadInsights();
        const lastGen = loadLastSkillGeneration();
        const minConfidence = (args as any)?.min_confidence || 0.7;
        const force = (args as any)?.force || false;

        const insightsTime = new Date(insights.timestamp).getTime();
        const lastGenTime = new Date(lastGen).getTime();

        if (!force && insightsTime <= lastGenTime) {
          return {
            content: [{
              type: 'text',
              text: `No new insights since last skill generation (${lastGen}). Use force=true to override.`
            }]
          };
        }

        const skills = analyzePatterns(insights, lastGen);
        const validatedSkills = skills
          .filter(s => s.confidence >= minConfidence)
          .map(s => {
            const validation = validateSkill(s);
            return { ...s, validation };
          })
          .filter(s => s.validation.valid);

        for (const skill of validatedSkills) {
          saveSkillToDb(skill);
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              analyzed_at: new Date().toISOString(),
              insights_timestamp: insights.timestamp,
              last_generation: lastGen,
              patterns_analyzed: skills.length,
              skills_generated: validatedSkills.length,
              skills: validatedSkills.map(s => ({
                name: s.name,
                category: s.category,
                confidence: s.confidence,
                description: s.description,
                validation_issues: s.validation.issues
              }))
            }, null, 2)
          }]
        };
      }

      case 'get_learning_insights': {
        const insights = loadInsights();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              timestamp: insights.timestamp,
              total_executions: insights.total_executions,
              mistake_patterns_count: insights.mistake_patterns.length,
              success_patterns_count: insights.success_patterns.length,
              recommendations_count: insights.recommendations.length,
              top_success_patterns: insights.success_patterns
                .filter(p => p.success_rate >= 95 && p.total_executions >= 10)
                .slice(0, 10),
              top_recommendations: insights.recommendations
                .filter(r => r.priority === 'HIGH' || r.priority === 'CRITICAL')
                .slice(0, 5)
            }, null, 2)
          }]
        };
      }

      case 'list_generated_skills': {
        const db = new Database(LEARNING_DB_PATH, { readonly: true });
        try {
          const limit = (args as any)?.limit || 50;
          const skills = db.prepare(`
            SELECT name, type, generated_at, success_rate, usage_count, notes
            FROM generated_skills
            ORDER BY generated_at DESC
            LIMIT ?
          `).all(limit);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(skills, null, 2)
            }]
          };
        } finally {
          db.close();
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Learning Pipeline MCP server running on stdio');
}

main().catch(console.error);