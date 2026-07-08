/**
 * scheduleChatCommand tests — parsing the chat-input /schedule variant and
 * the store side effect (panel opens with the create form prefilled).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  handleScheduleChatCommand,
  parseScheduleChatCommand,
} from '../../../services/scheduling/scheduleChatCommand';
import { useSchedulesStore } from '../../../stores/schedulesStore';

beforeEach(() => {
  useSchedulesStore.setState({ schedules: [], panelOpen: false, createPrefill: null });
});

describe('parseScheduleChatCommand', () => {
  it('matches a bare /schedule with an empty prefill', () => {
    expect(parseScheduleChatCommand('/schedule')).toEqual({
      matched: true,
      prefillRequest: '',
    });
  });

  it('captures trailing text as the prefill request', () => {
    expect(parseScheduleChatCommand('/schedule run the nightly audit')).toEqual({
      matched: true,
      prefillRequest: 'run the nightly audit',
    });
  });

  it('is case-insensitive and tolerates surrounding whitespace', () => {
    expect(parseScheduleChatCommand('  /SCHEDULE   weekly summary  ')).toEqual({
      matched: true,
      prefillRequest: 'weekly summary',
    });
  });

  it('does not match other slash commands or mid-message mentions', () => {
    expect(parseScheduleChatCommand('/scheduler daily')).toEqual({ matched: false });
    expect(parseScheduleChatCommand('/plan something')).toEqual({ matched: false });
    expect(parseScheduleChatCommand('please /schedule this')).toEqual({ matched: false });
    expect(parseScheduleChatCommand('')).toEqual({ matched: false });
  });
});

describe('handleScheduleChatCommand', () => {
  it('opens the panel with the prefill and reports handled', () => {
    expect(handleScheduleChatCommand('/schedule audit deps')).toBe(true);
    const state = useSchedulesStore.getState();
    expect(state.panelOpen).toBe(true);
    expect(state.createPrefill).toBe('audit deps');
  });

  it('leaves the store untouched for normal messages', () => {
    expect(handleScheduleChatCommand('explain this code')).toBe(false);
    const state = useSchedulesStore.getState();
    expect(state.panelOpen).toBe(false);
    expect(state.createPrefill).toBeNull();
  });
});
