import type { ActivityHostPlugin } from './types.js';
import { quizLivePlugin } from './plugins/quiz-live.plugin.js';
import { quickPollPlugin } from './plugins/quick-poll.plugin.js';
import { examPlugin } from './plugins/exam.plugin.js';
import { swissDuelPlugin } from './plugins/swiss-duel.plugin.js';
import { assignmentHubPlugin } from './plugins/assignment-hub.plugin.js';
import { pdfPresenterPlugin } from './plugins/pdf-presenter.plugin.js';
import { objectCameraPlugin } from './plugins/object-camera.plugin.js';
import { territoryWarPlugin } from './plugins/territory-war.plugin.js';
import { projectGradingPlugin } from './plugins/project-grading.plugin.js';
import { arcadeDuelPlugin } from './plugins/arcade-duel.plugin.js';
import { interactiveBoardPlugin } from './plugins/interactive-board.plugin.js';
import { circuitRacePlugin } from './plugins/circuit-race.plugin.js';
import { volleyballTournamentPlugin } from './plugins/volleyball-tournament.plugin.js';
import { factionDuelPlugin } from './plugins/faction-duel.plugin.js';

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
export const activityPluginsRegistry: Record<string, ActivityHostPlugin<unknown>> = {
  [quizLivePlugin.id]: quizLivePlugin,
  [quickPollPlugin.id]: quickPollPlugin,
  [examPlugin.id]: examPlugin,
  [swissDuelPlugin.id]: swissDuelPlugin,
  [assignmentHubPlugin.id]: assignmentHubPlugin,
  [pdfPresenterPlugin.id]: pdfPresenterPlugin,
  [objectCameraPlugin.id]: objectCameraPlugin,
  [territoryWarPlugin.id]: territoryWarPlugin,
  [projectGradingPlugin.id]: projectGradingPlugin,
  [arcadeDuelPlugin.id]: arcadeDuelPlugin,
  [interactiveBoardPlugin.id]: interactiveBoardPlugin,
  [circuitRacePlugin.id]: circuitRacePlugin,
  [volleyballTournamentPlugin.id]: volleyballTournamentPlugin,
  [factionDuelPlugin.id]: factionDuelPlugin,
};

/**
 * Lấy plugin của một hoạt động theo activityId
 */
export function getActivityPlugin(activityId: string): ActivityHostPlugin<unknown> | undefined {
  return activityPluginsRegistry[activityId];
}
