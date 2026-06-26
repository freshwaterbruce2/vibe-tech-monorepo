import type { ActiveWindowInfo } from "@/services/computerUseService";

const RESPONSE_EXAMPLES = `Return your next action in JSON format inside markdown blocks:
\`\`\`json
{
  "thought": "Explain what you see and what action you will take.",
  "action": {
    "type": "mouse",
    "action": "click" | "move" | "right_click" | "double_click" | "drag_to",
    "x": 450,
    "y": 200
  }
}
\`\`\`
For keyboard actions:
\`\`\`json
{
  "thought": "Explain what you will type.",
  "action": {
    "type": "keyboard",
    "action": "type",
    "text": "text to type"
  }
}
\`\`\`
For special keys:
\`\`\`json
{
  "thought": "Pressing enter key to submit form.",
  "action": {
    "type": "keyboard",
    "action": "press_key",
    "key": "enter"
  }
}
\`\`\`
For keyboard shortcuts (hotkeys):
\`\`\`json
{
  "thought": "Copying selected text.",
  "action": {
    "type": "keyboard",
    "action": "hotkey",
    "key": "c",
    "modifiers": ["ctrl"]
  }
}
\`\`\`
When the goal is fully achieved:
\`\`\`json
{
  "thought": "Task complete.",
  "action": {
    "type": "done"
  }
}
\`\`\``;

const AVAILABLE_ACTIONS = `Available actions:
- Mouse:
  { "type": "mouse", "action": "move" | "click" | "right_click" | "double_click" | "drag_to", "x": 0..999, "y": 0..999 }
- Keyboard:
  { "type": "keyboard", "action": "type", "text": "string to type" }
  { "type": "keyboard", "action": "press_key", "key": "enter" | "backspace" | "tab" | "escape" | "space" | "up" | "down" | "left" | "right" | "ctrl" | "shift" | "alt" }
  { "type": "keyboard", "action": "hotkey", "key": "character (e.g. 'c')", "modifiers": ["ctrl" | "alt" | "shift" | "win"] }
- Task completed:
  { "type": "done" }`;

export function buildSystemPrompt(goal: string, activeWindow: ActiveWindowInfo | null): string {
	const windowLine = activeWindow ? `${activeWindow.process_name} - "${activeWindow.title}"` : "unknown";
	return `You are an AI desktop assistant with direct computer control capabilities.
Your goal is: "${goal}"

You operate on a normalized screen coordinates grid of 1000x1000 pixels (X and Y are between 0 and 999).
Active Window: ${windowLine}

${RESPONSE_EXAMPLES}

${AVAILABLE_ACTIONS}

Take step-by-step actions. Output ONLY the JSON block inside markdown.`;
}
