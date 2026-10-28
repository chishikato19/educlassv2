import type { ActivityHostPlugin } from './types.js';
export * from './types.js';
export * from './plugins/quiz-live.plugin.js';
export * from './plugins/quick-poll.plugin.js';
export * from './plugins/exam.plugin.js';
export * from './plugins/swiss-duel.plugin.js';
export * from './plugins/assignment-hub.plugin.js';
export * from './plugins/pdf-presenter.plugin.js';
export * from './plugins/object-camera.plugin.js';
export * from './plugins/territory-war.plugin.js';
export * from './plugins/project-grading.plugin.js';
export * from './plugins/arcade-duel.plugin.js';
export * from './plugins/interactive-board.plugin.js';
export * from './plugins/circuit-race.plugin.js';
export * from './plugins/volleyball-tournament.plugin.js';
export * from './plugins/faction-duel.plugin.js';
/**
 * Danh bạ toàn bộ các Plugins Tiện ích/Ứng dụng trong hệ thống EduClass v2.
 * Để thêm một tiện ích mới: chỉ cần tạo file plugin riêng và đăng ký 1 dòng tại đây!
 */
export declare const activityPluginsRegistry: Record<string, ActivityHostPlugin<unknown>>;
/**
 * Lấy plugin của một hoạt động theo activityId
 */
export declare function getActivityPlugin(activityId: string): ActivityHostPlugin<unknown> | undefined;
//# sourceMappingURL=index.d.ts.map