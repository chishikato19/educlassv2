import type { ActivityDefinition } from './types.js';

/**
 * Kiểm tra và phân tích cấu hình khởi tạo của Activity qua Zod configSchema
 */
export function validateActivityConfig<Cfg>(
  activity: ActivityDefinition<Cfg, unknown, unknown>,
  config: unknown
): Cfg {
  return activity.configSchema.parse(config);
}

/**
 * Kiểm tra tính hợp lệ của trạng thái Activity qua Zod stateSchema
 */
export function validateActivityState<St>(
  activity: ActivityDefinition<unknown, St, unknown>,
  state: unknown
): St {
  return activity.stateSchema.parse(state);
}

/**
 * Kiểm tra danh sách kết quả sau khi kết thúc Activity qua Zod resultSchema
 */
export function validateActivityResults<Res>(
  activity: ActivityDefinition<unknown, unknown, Res>,
  results: unknown[]
): Res[] {
  return results.map(item => activity.resultSchema.parse(item));
}
