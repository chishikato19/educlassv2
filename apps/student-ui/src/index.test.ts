import { describe, expect, it } from 'vitest';
import { APP_ROLE, getStudentBgColor } from './index.js';

describe('student-ui app', () => {
  it('has student role and valid bg color', () => {
    expect(APP_ROLE).toBe('student');
    expect(getStudentBgColor()).toBe('#FFF9F0');
  });
});
