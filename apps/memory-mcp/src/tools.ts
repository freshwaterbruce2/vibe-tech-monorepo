/**
 * MCP tool registry — re-exports semantic + episodic tool arrays.
 * Split from the original 936-line single file for maintainability.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { semanticTools } from './tools-semantic';
import { episodicTools } from './tools-episodic';

export const tools: Tool[] = [...semanticTools, ...episodicTools];
