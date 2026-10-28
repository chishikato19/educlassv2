import { describe, expect, it } from 'vitest';
import { APP_ROLE, getTeacherThemeColor } from './index.js';
describe('teacher-ui app', () => {
    it('has teacher role and valid theme color', () => {
        expect(APP_ROLE).toBe('teacher');
        expect(getTeacherThemeColor()).toBe('#4F8CFF');
    });
});
//# sourceMappingURL=index.test.js.map