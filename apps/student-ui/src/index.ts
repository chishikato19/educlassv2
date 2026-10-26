import { UI_COLORS } from '@educlass/ui-kit';

export const APP_ROLE = 'student';

export function getStudentBgColor(): string {
  return UI_COLORS.background;
}

export * from './components/StudentPortal.js';
export * from './components/ActivityHost.js';
