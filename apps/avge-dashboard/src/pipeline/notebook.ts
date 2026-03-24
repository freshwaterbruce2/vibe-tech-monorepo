/**
 * NotebookLM Integration Module
 *
 * Bridges the AVGE pipeline to NotebookLM via MCP tools.
 * All calls route through the MCP bridge service.
 */

import {
  nlmAddText,
  nlmAddUrl,
  nlmCreateNotebook,
  nlmDescribe,
  nlmQuery,
} from '../services/mcp-bridge';
import type { NotebookProject, SourceItem, SourceType } from '../types';

export interface NotebookCreateResult {
  notebookId: string;
  title: string;
}

export interface NotebookQueryResult {
  answer: string;
  sources: string[];
  conversationId?: string;
}

/**
 * Create a new NotebookLM notebook for a pipeline project.
 */
export async function createNotebook(title: string): Promise<NotebookCreateResult> {
  console.log(`[Notebook] Creating notebook: "${title}"`);

  const result = await nlmCreateNotebook(title);

  if (result.status === 'error' || !result.data) {
    console.warn(`[Notebook] MCP create failed: ${result.error}`);
    // Fallback to local ID for offline/dev mode
    return { notebookId: crypto.randomUUID(), title };
  }

  return {
    notebookId: result.data.notebook_id,
    title,
  };
}

/**
 * Batch-ingest YouTube URLs and web pages as notebook sources.
 * Processes sequentially to respect MCP rate limits.
 */
export async function ingestURLs(notebookId: string, urls: string[]): Promise<SourceItem[]> {
  console.log(`[Notebook] Ingesting ${urls.length} URLs into notebook ${notebookId}`);

  const sources: SourceItem[] = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const type: SourceType =
      url.includes('youtube.com') || url.includes('youtu.be') ? 'youtube_url' : 'website_url';

    console.log(`[Notebook] Ingesting (${i + 1}/${urls.length}): ${url}`);
    const result = await nlmAddUrl(notebookId, url);

    sources.push({
      id: crypto.randomUUID(),
      type,
      title: `Source ${i + 1}`,
      url,
      addedAt: Date.now(),
      notebookSourceId: result.status === 'success' ? String(result.data) : undefined,
    });

    // Small delay between ingestions to avoid rate limiting
    if (i < urls.length - 1) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  return sources;
}

/**
 * Add raw text content (brain.md, transcripts, notes) as a notebook source.
 */
export async function ingestText(
  notebookId: string,
  text: string,
  title: string,
): Promise<SourceItem> {
  console.log(`[Notebook] Adding text source: "${title}" to notebook ${notebookId}`);

  const result = await nlmAddText(notebookId, text, title);

  return {
    id: crypto.randomUUID(),
    type: 'text',
    title,
    content: text,
    addedAt: Date.now(),
    notebookSourceId: result.status === 'success' ? String(result.data) : undefined,
  };
}

/**
 * Query the notebook with source grounding.
 * All outputs are cited against raw source material.
 */
export async function queryNotebook(
  notebookId: string,
  question: string,
  conversationId?: string,
): Promise<NotebookQueryResult> {
  console.log(`[Notebook] Querying: "${question.slice(0, 80)}..."`);

  const result = await nlmQuery(notebookId, question, undefined, conversationId);

  if (result.status === 'error' || !result.data) {
    console.warn(`[Notebook] Query failed: ${result.error}`);
    return {
      answer: `[Error] Query failed: ${result.error ?? 'Unknown error'}`,
      sources: [],
      conversationId,
    };
  }

  return {
    answer: result.data.answer,
    sources: result.data.sources ?? [],
    conversationId: result.data.conversation_id ?? conversationId,
  };
}

/**
 * Get AI-generated summary and suggested topics for a notebook.
 */
export async function describeNotebook(
  notebookId: string,
): Promise<{ summary: string; topics: string[] }> {
  console.log(`[Notebook] Describing notebook ${notebookId}`);

  const result = await nlmDescribe(notebookId);

  if (result.status === 'error' || !result.data) {
    return { summary: '[Error] Could not describe notebook', topics: [] };
  }

  return {
    summary: result.data.summary,
    topics: result.data.suggested_topics ?? [],
  };
}

/**
 * Build a full NotebookProject — create + ingest + ingest brain.md context.
 */
export async function buildProject(
  title: string,
  urls: string[],
  brainContext?: string,
): Promise<NotebookProject> {
  const { notebookId } = await createNotebook(title);
  const sources = await ingestURLs(notebookId, urls);

  // Ingest brain.md context as a text source for grounding
  if (brainContext) {
    const brainSource = await ingestText(notebookId, brainContext, 'Brand Identity (brain.md)');
    sources.push(brainSource);
  }

  return {
    id: crypto.randomUUID(),
    notebookId,
    title,
    sources,
    createdAt: Date.now(),
  };
}
