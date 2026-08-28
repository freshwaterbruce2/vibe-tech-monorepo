import { describe, expect, it } from 'vitest';
import {
  buildTutorReply,
  calculateFocusMinutes,
  calculateTokenBalance,
  seedTasks,
  starterLessons,
} from './tutoring';

describe('mobile tutoring domain', () => {
  it('ports the core homework reward math to the mobile shell', () => {
    const tasks = seedTasks.map((task, index) => ({ ...task, completed: index === 0 }));

    expect(calculateFocusMinutes(tasks)).toBe(20);
    expect(calculateTokenBalance(tasks)).toBe(15);
  });

  it('keeps tutor replies as coaching instead of answer delivery', () => {
    const reply = buildTutorReply('fractions', starterLessons[0]);

    expect(reply).toContain('start small');
    expect(reply).toContain('one step');
  });
});
