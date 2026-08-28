/**
 * scheduleChatCommand — chat-input variant of the palette /schedule command.
 * Pure parser + a store handler consumed by AIChat's send path: a message
 * starting with `/schedule` opens the Schedule panel's create form (prefilled
 * with any trailing text) instead of being sent to the AI.
 * Spec: FEATURE_SPECS/competitive-gaps/16-AGENT-SCHEDULING.md
 */
import { useSchedulesStore } from '../../stores/schedulesStore';

export type ScheduleChatCommand = { matched: false } | { matched: true; prefillRequest: string };

const SCHEDULE_COMMAND_RE = /^\/schedule(?:\s+([\s\S]*))?$/i;

/**
 * Parse a chat message for the /schedule slash command. Trailing text after
 * the command becomes the create form's task-description prefill.
 */
export function parseScheduleChatCommand(input: string): ScheduleChatCommand {
  const match = input.trim().match(SCHEDULE_COMMAND_RE);
  if (!match) return { matched: false };
  return { matched: true, prefillRequest: (match[1] ?? '').trim() };
}

/**
 * If the message is a /schedule command, open the Schedule panel's create
 * flow (prefilled) and return true so the caller skips sending it to the AI.
 */
export function handleScheduleChatCommand(input: string): boolean {
  const parsed = parseScheduleChatCommand(input);
  if (!parsed.matched) return false;
  useSchedulesStore.getState().actions.openCreateWithPrefill(parsed.prefillRequest);
  return true;
}
