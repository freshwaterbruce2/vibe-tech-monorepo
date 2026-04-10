import { describe, it, expect } from 'vitest';
import { TaskStatus, TaskPriority, TaskType } from '../tasks.js';

describe('TaskStatus', () => {
  it('has the expected string values', () => {
    expect(TaskStatus.QUEUED).toBe('queued');
    expect(TaskStatus.RUNNING).toBe('running');
    expect(TaskStatus.PAUSED).toBe('paused');
    expect(TaskStatus.COMPLETED).toBe('completed');
    expect(TaskStatus.FAILED).toBe('failed');
    expect(TaskStatus.CANCELED).toBe('canceled');
  });

  it('has exactly 6 members', () => {
    const values = Object.values(TaskStatus);
    expect(values).toHaveLength(6);
  });

  it('all values are strings', () => {
    Object.values(TaskStatus).forEach(v => expect(typeof v).toBe('string'));
  });
});

describe('TaskPriority', () => {
  it('has the expected numeric values', () => {
    expect(TaskPriority.LOW).toBe(0);
    expect(TaskPriority.NORMAL).toBe(1);
    expect(TaskPriority.HIGH).toBe(2);
    expect(TaskPriority.CRITICAL).toBe(3);
  });

  it('is strictly ordered low → critical', () => {
    expect(TaskPriority.LOW).toBeLessThan(TaskPriority.NORMAL);
    expect(TaskPriority.NORMAL).toBeLessThan(TaskPriority.HIGH);
    expect(TaskPriority.HIGH).toBeLessThan(TaskPriority.CRITICAL);
  });

  it('can be used for numeric comparisons', () => {
    const isUrgent = (p: TaskPriority) => p >= TaskPriority.HIGH;
    expect(isUrgent(TaskPriority.LOW)).toBe(false);
    expect(isUrgent(TaskPriority.NORMAL)).toBe(false);
    expect(isUrgent(TaskPriority.HIGH)).toBe(true);
    expect(isUrgent(TaskPriority.CRITICAL)).toBe(true);
  });
});

describe('TaskType', () => {
  it('has the expected string values', () => {
    expect(TaskType.CODE_ANALYSIS).toBe('code_analysis');
    expect(TaskType.FILE_INDEXING).toBe('file_indexing');
    expect(TaskType.AI_COMPLETION).toBe('ai_completion');
    expect(TaskType.MULTI_FILE_EDIT).toBe('multi_file_edit');
    expect(TaskType.GIT_OPERATION).toBe('git_operation');
    expect(TaskType.BUILD).toBe('build');
    expect(TaskType.TEST).toBe('test');
    expect(TaskType.CUSTOM).toBe('custom');
  });

  it('has exactly 8 members', () => {
    const values = Object.values(TaskType).filter(v => typeof v === 'string');
    expect(values).toHaveLength(8);
  });
});
