import type { z } from 'zod';
import type { ActivityCapability, ActivityReject } from '@educlass/protocol';

/**
 * Ngữ cảnh thực thi (Context) được cung cấp cho Activity plugin.
 * Lưu ý: Activity TUYỆT ĐỐI KHÔNG truy cập cơ sở dữ liệu hay WebSocket thô trực tiếp.
 */
export interface ActivityContext {
  sessionId: string;
  runId: string;
  now(): number;
  rng(): number;
  broadcast(patchOrEvent: unknown): void;
  sendToParticipant(participantId: string, payload: unknown): void;
  grantReward(participantId: string, trigger: string, qty?: number): Promise<void> | void;
  isParticipantOnline?(participantId: string): boolean;
  getOnlineParticipantIds?(): string[];
}

/**
 * Các hàm xử lý vòng đời phía máy chủ của một Activity
 */
export interface ActivityServerHandler<Cfg = unknown, St = unknown, Res = unknown> {
  onStart(ctx: ActivityContext, cfg: Cfg): St;
  onStudentIntent(
    ctx: ActivityContext,
    st: St,
    participantId: string,
    intent: unknown
  ): St | ActivityReject;
  onTeacherIntent(ctx: ActivityContext, st: St, intent: unknown): St;
  onEnd(ctx: ActivityContext, st: St): Res[];
}

/**
 * Định nghĩa Activity Module chuẩn theo hợp đồng PLAN.md mục 4
 */
export interface ActivityDefinition<Cfg = unknown, St = unknown, Res = unknown> {
  id: string;
  name: string;
  version: number;
  icon: string;
  description?: string;
  capabilities?: ActivityCapability[];
  rewardTriggers: string[];
  configSchema: z.ZodType<Cfg, z.ZodTypeDef, unknown>;
  stateSchema: z.ZodType<St, z.ZodTypeDef, unknown>;
  resultSchema: z.ZodType<Res, z.ZodTypeDef, unknown>;
  server: ActivityServerHandler<Cfg, St, Res>;
}
