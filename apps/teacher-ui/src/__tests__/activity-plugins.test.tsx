import { describe, expect, it } from 'vitest';
import { getActivityPlugin, activityPluginsRegistry } from '../activities/index.js';

describe('Activity Plugins Registry', () => {
  it('registers all built-in activity plugins properly', () => {
    expect(activityPluginsRegistry['quiz-live']).toBeDefined();
    expect(activityPluginsRegistry['quick-poll']).toBeDefined();
    expect(activityPluginsRegistry['exam']).toBeDefined();

    const quizPlugin = getActivityPlugin('quiz-live');
    expect(quizPlugin?.id).toBe('quiz-live');
    expect(quizPlugin?.name).toContain('Quiz');

    const pollPlugin = getActivityPlugin('quick-poll');
    expect(pollPlugin?.id).toBe('quick-poll');
    expect(pollPlugin?.name).toContain('Bình chọn');

    const examPlugin = getActivityPlugin('exam');
    expect(examPlugin?.id).toBe('exam');
    expect(examPlugin?.name).toContain('Kỳ thi');
  });

  it('returns undefined for non-existing plugin', () => {
    expect(getActivityPlugin('non-existent-plugin')).toBeUndefined();
  });
});
