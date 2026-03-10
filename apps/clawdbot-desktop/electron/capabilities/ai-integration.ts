/**
 * AI Integration - OpenManus Multi-Agent Architecture
 * Implements the open-source OpenManus methodology with specialized agents
 *
 * Architecture: ReActAgent -> ToolCallAgent -> PlanningAgent -> ManusAgent
 *
 * Based on OpenManus open standard (2026):
 * - https://github.com/FoundationAgents/OpenManus
 * - https://github.com/henryalps/OpenManus
 * - https://manus.im/features/agent-skills
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { PROVIDER_DEFAULTS } from '../core/config';
import { AiProvider } from '../core/types';
import { BrowserAutomation } from './browser-automation';
import { DesktopAutomation } from './desktop-automation';

export type AgentActivityLevel = 'info' | 'warn' | 'error';
export type AgentActivityReporter = (
  event: string,
  message: string,
  level?: AgentActivityLevel,
  data?: unknown
) => void;
export interface AgentMemoryMessage {
  role: string;
  content: string;
}

function summarizeActivityData(value: unknown): string {
  const raw = typeof value === 'string' ? value : JSON.stringify(value);
  if (!raw) {
    return '';
  }

  return raw.length > 240 ? `${raw.slice(0, 240)}...` : raw;
}

// ==================== AGENT SKILLS INTERFACE ====================

/**
 * Agent Skills open standard structure
 * Modular, reusable files that package domain expertise, workflows, and scripts
 */
interface AgentSkill {
  metadata: {
    name: string;
    version: string;
    description: string;
    author: string;
    tags: string[];
  };
  instructions: {
    objective: string;
    workflow: string[];
    constraints: string[];
    examples: Array<{ input: string; output: string }>;
  };
  resources?: {
    scripts: Array<{ language: 'python' | 'bash' | 'javascript'; content: string }>;
    files: Array<{ path: string; content: string }>;
  };
}

// ==================== BASE REACT AGENT ====================

/**
 * ReActAgent - Base reasoning and acting agent
 * Implements reasoning-action loop for autonomous task execution
 */
class ReActAgent {
  protected memory: AgentMemoryMessage[] = [];
  protected skills: Map<string, AgentSkill> = new Map();

  constructor(
    protected apiKey: string,
    protected provider: AiProvider = 'anthropic',
    protected model: string = PROVIDER_DEFAULTS.anthropic.model,
    protected baseUrl: string = PROVIDER_DEFAULTS.anthropic.baseUrl,
    protected reportActivity: AgentActivityReporter = () => undefined
  ) {}

  /**
   * Add skill to agent's capability set
   */
  loadSkill(skill: AgentSkill): void {
    this.skills.set(skill.metadata.name, skill);
     
    console.log(`[ReActAgent] Loaded skill: ${skill.metadata.name}`);
  }

  /**
   * Reasoning loop - think about the task
   */
  protected async reason(task: string): Promise<string> {
    const prompt = `
Task: ${task}

Available skills: ${Array.from(this.skills.keys()).join(', ')}

Think step-by-step about how to accomplish this task.
What observations do you have?
What actions should you take?
    `.trim();

    return await this.query(prompt);
  }

  /**
   * Query AI model
   */
  protected async query(prompt: string): Promise<string> {
    if (this.provider === 'anthropic') {
      const client = new Anthropic({ apiKey: this.apiKey });

      const response = await client.messages.create({
        model: this.model || PROVIDER_DEFAULTS.anthropic.model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (!content) return '';
      return content.type === 'text' ? content.text : '';
    }

    const client = new OpenAI({
      apiKey: this.apiKey,
      ...(this.baseUrl ? { baseURL: this.baseUrl } : {}),
    });

    const fallbackModel =
      this.provider === 'moonshot' ? PROVIDER_DEFAULTS.moonshot.model : PROVIDER_DEFAULTS.openai.model;
    const response = await client.chat.completions.create({
      model: this.model || fallbackModel,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Store interaction in memory
   */
  protected remember(role: string, content: string): void {
    this.memory.push({ role, content });

    // Keep last 50 messages
    if (this.memory.length > 50) {
      this.memory = this.memory.slice(-50);
    }
  }

  captureMemorySnapshot(): AgentMemoryMessage[] {
    return this.memory.map((message) => ({ ...message }));
  }

  restoreMemorySnapshot(messages: AgentMemoryMessage[]): void {
    this.memory = messages.slice(-50).map((message) => ({ ...message }));
  }
}

// ==================== TOOL CALL AGENT ====================

/**
 * ToolCallAgent - Extends ReActAgent with function calling capabilities
 * Can invoke tools like browser automation, desktop control, file operations
 */
class ToolCallAgent extends ReActAgent {
  private tools: Map<string, (...args: any[]) => Promise<any>> = new Map();

  /**
   * Register a tool function
   */
  registerTool(
    name: string,
    arg2: string | ((...args: any[]) => Promise<any>),
    arg3?: (...args: any[]) => Promise<any>
  ): void {
    let func: (...args: any[]) => Promise<any>;
    if (typeof arg2 === 'function') {
        func = arg2;
    } else {
        func = arg3!;
    }
    this.tools.set(name, func);
     
    console.log(`[ToolCallAgent] Registered tool: ${name}`);
  }

  /**
   * Execute tool by name
   */
  async executeTool(toolName: string, args: any[]): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

     
    console.log(`[ToolCallAgent] Executing ${toolName} with args:`, args);
    return await tool(...args);
  }

  /**
   * Get available tools for AI context
   */
  getToolsDescription(): string {
    const descriptions: string[] = [];
    for (const [name] of this.tools) {
      descriptions.push(`- ${name}`);
    }
    return descriptions.join('\n');
  }

  /**
   * Decide which tool to use
   */
  protected async selectTool(task: string): Promise<{ tool: string; args: any[] } | null> {
    const prompt = `
Task: ${task}

Available tools:
${this.getToolsDescription()}

Which tool should be used to accomplish this task?
Respond with JSON format: {"tool": "tool_name", "args": [arg1, arg2, ...]}
If no tool is needed, respond with: null
    `.trim();

    const response = await this.query(prompt);

    try {
      return JSON.parse(response);
    } catch {
      return null;
    }
  }
}

// ==================== PLANNING AGENT ====================

/**
 * PlanningAgent - Creates and executes multi-step plans
 * Breaks down complex tasks into actionable sub-tasks
 */
class PlanningAgent extends ToolCallAgent {
  /**
   * Create execution plan for complex task
   */
  async createPlan(task: string): Promise<string[]> {
    this.reportActivity('plan_requested', 'Generating execution plan', 'info', { task });

    const prompt = `
Task: ${task}

Break this task down into a step-by-step plan.
Each step should be a clear, actionable instruction.
Return the plan as a JSON array of strings.

Example: ["Step 1: ...", "Step 2: ...", "Step 3: ..."]
    `.trim();

    const response = await this.query(prompt);

    try {
      const steps = JSON.parse(response);
      this.reportActivity('plan_created', `Plan created with ${steps.length} steps`, 'info', {
        steps,
      });
      return steps;
    } catch {
      // Fallback if JSON parsing fails
      const steps = response.split('\n').filter((line) => line.trim().length > 0);
      this.reportActivity('plan_created', `Plan created with ${steps.length} steps`, 'warn', {
        steps,
        fallback: true,
      });
      return steps;
    }
  }

  /**
   * Execute plan step-by-step
   */
  async executePlan(steps: string[]): Promise<string[]> {
    const results: string[] = [];

    if (steps.length === 0) {
      this.reportActivity('plan_empty', 'Plan contained no executable steps', 'warn');
      return results;
    }

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step) continue;
       
      console.log(`[PlanningAgent] Executing step ${i + 1}/${steps.length}: ${step}`);

      this.reportActivity('plan_step_started', `Starting plan step ${i + 1}`, 'info', {
        stepNumber: i + 1,
        totalSteps: steps.length,
        step,
      });

      try {
        const toolSelection = await this.selectTool(step);

        if (toolSelection) {
          this.reportActivity('plan_step_tool_selected', `Using tool ${toolSelection.tool}`, 'info', {
            stepNumber: i + 1,
            totalSteps: steps.length,
            step,
            tool: toolSelection.tool,
            args: toolSelection.args,
          });

          const result = await this.executeTool(toolSelection.tool, toolSelection.args);
          results.push(JSON.stringify(result));
          this.remember('assistant', `Step ${i + 1} completed: ${result}`);
          this.reportActivity('plan_step_completed', `Completed plan step ${i + 1}`, 'info', {
            stepNumber: i + 1,
            totalSteps: steps.length,
            step,
            mode: 'tool',
            tool: toolSelection.tool,
            resultPreview: summarizeActivityData(result),
          });
        } else {
          this.reportActivity('plan_step_reasoning', `Reasoning through plan step ${i + 1}`, 'info', {
            stepNumber: i + 1,
            totalSteps: steps.length,
            step,
          });

          const reasoning = await this.reason(step);
          results.push(reasoning);
          this.remember('assistant', `Step ${i + 1} reasoning: ${reasoning}`);
          this.reportActivity('plan_step_completed', `Completed plan step ${i + 1}`, 'info', {
            stepNumber: i + 1,
            totalSteps: steps.length,
            step,
            mode: 'reasoning',
            resultPreview: summarizeActivityData(reasoning),
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.reportActivity('plan_step_failed', `Plan step ${i + 1} failed`, 'error', {
          stepNumber: i + 1,
          totalSteps: steps.length,
          step,
          error: message,
        });
        throw error;
      }
    }

    return results;
  }
}

// ==================== MANUS AGENT (TOP LEVEL) ====================

/**
 * ManusAgent - Top-level orchestrator implementing OpenManus architecture
 * Coordinates specialized sub-agents for autonomous complex task execution
 */
export class ManusAgent extends PlanningAgent {
  private browserAutomation: BrowserAutomation;
  private desktopAutomation: DesktopAutomation;

  constructor(
    apiKey: string,
    provider: AiProvider = 'anthropic',
    model: string,
    baseUrl: string,
    userDataDir: string,
    reportActivity?: AgentActivityReporter
  ) {
    super(apiKey, provider, model, baseUrl, reportActivity);

    this.browserAutomation = new BrowserAutomation(userDataDir);
    this.desktopAutomation = new DesktopAutomation();

    this.registerAllTools();
  }

  /**
   * Register all browser and desktop automation tools
   */
  private registerAllTools(): void {
    // Browser tools
    this.registerTool(
      'browser_navigate',
      async (url: string, tabId?: string) => {
        return await this.browserAutomation.navigate(url, tabId);
      }
    );

    this.registerTool(
      'browser_click',
      'Click element in browser',
      async (tabId: string, selector: string) => {
        await this.browserAutomation.click(tabId, selector);
        return { success: true };
      }
    );

    this.registerTool(
      'browser_type',
      'Type text into browser input',
      async (tabId: string, selector: string, text: string) => {
        await this.browserAutomation.type(tabId, selector, text);
        return { success: true };
      }
    );

    this.registerTool(
      'browser_extract_text',
      'Extract text from browser element',
      async (tabId: string, selector: string) => {
        return await this.browserAutomation.extractText(tabId, selector);
      }
    );

    this.registerTool(
      'browser_screenshot',
      'Take browser screenshot',
      async (tabId: string, filepath: string) => {
        await this.browserAutomation.screenshot(tabId, filepath);
        return { filepath };
      }
    );

    // Desktop tools
    this.registerTool(
      'desktop_move_mouse',
      'Move mouse to position',
      async (x: number, y: number) => {
        await this.desktopAutomation.moveMouse(x, y);
        return { x, y };
      }
    );

    this.registerTool('desktop_click', 'Click mouse button', async (button = 'left') => {
      await this.desktopAutomation.mouseClick(button as any);
      return { success: true };
    });

    this.registerTool('desktop_type', 'Type text on desktop', async (text: string) => {
      await this.desktopAutomation.typeText(text);
      return { success: true };
    });

    this.registerTool('desktop_press_key', 'Press keyboard key', async (key: string) => {
      await this.desktopAutomation.pressKey(key);
      return { success: true };
    });

    this.registerTool(
      'desktop_screenshot',
      'Take desktop screenshot',
      async (filepath: string) => {
        await this.desktopAutomation.takeScreenshot(filepath);
        return { filepath };
      }
    );

    this.registerTool('desktop_get_windows', 'Get all open windows', async () => {
      return await this.desktopAutomation.getWindows();
    });

    this.registerTool(
      'desktop_focus_window',
      'Focus specific window',
      async (windowId: number) => {
        await this.desktopAutomation.focusWindow(windowId);
        return { success: true };
      }
    );

    this.registerTool(
      'desktop_execute_command',
      'Execute shell command',
      async (command: string) => {
        return await this.desktopAutomation.executeCommand(command);
      }
    );

    this.registerTool('desktop_read_file', 'Read file from disk', async (filepath: string) => {
      return await this.desktopAutomation.readFile(filepath);
    });

    this.registerTool(
      'desktop_write_file',
      'Write file to disk',
      async (filepath: string, content: string) => {
        await this.desktopAutomation.writeFile(filepath, content);
        return { filepath };
      }
    );

    this.registerTool(
      'desktop_get_clipboard',
      'Get clipboard contents',
      async () => {
        return await this.desktopAutomation.getClipboard();
      }
    );

    this.registerTool(
      'desktop_set_clipboard',
      'Set clipboard contents',
      async (text: string) => {
        await this.desktopAutomation.setClipboard(text);
        return { success: true };
      }
    );

     
    console.log('[ManusAgent] All tools registered successfully');
  }

  /**
   * Main entry point - execute complex task autonomously
   */
  async execute(task: string): Promise<{ plan: string[]; results: string[] }> {
     
    console.log(`[ManusAgent] Executing task: ${task}`);
    this.reportActivity('execution_started', 'ManusAgent execution started', 'info', {
      task,
    });

    // Step 1: Create plan
    const plan = await this.createPlan(task);
     
    console.log('[ManusAgent] Plan created:', plan);

    // Step 2: Execute plan
    try {
      const results = await this.executePlan(plan);
      this.reportActivity('execution_completed', 'ManusAgent execution completed', 'info', {
        task,
        totalSteps: plan.length,
      });
      return { plan, results };
    } catch (error) {
      this.reportActivity('execution_failed', 'ManusAgent execution failed', 'error', {
        task,
        totalSteps: plan.length,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Chat interface for conversational interaction
   */
  async chat(message: string): Promise<string> {
    this.remember('user', message);

    const context = this.memory.map((m) => `${m.role}: ${m.content}`).join('\n');

    const prompt = `
You are ManusAgent, an autonomous AI assistant with full desktop and browser control.

Conversation history:
${context}

User: ${message}

Respond naturally. If the user asks you to do something, explain what you'll do.
If appropriate, suggest using your tools (browser, desktop control, file operations).
    `.trim();

    const response = await this.query(prompt);

    this.remember('assistant', response);

    return response;
  }

  /**
   * Initialize browser automation
   */
  async initBrowser(): Promise<void> {
    await this.browserAutomation.launch();
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.browserAutomation.close();
  }
}
