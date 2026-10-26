import { z } from 'zod';

export const PROTOCOL_VERSION = 1 as const;
export const ProtocolVersionSchema = z.literal(PROTOCOL_VERSION);
export type ProtocolVersion = z.infer<typeof ProtocolVersionSchema>;

/**
 * Hàm tạo Schema cho Envelope với Schema payload cụ thể
 */
export function createEnvelopeSchema<TPayload extends z.ZodTypeAny>(payloadSchema: TPayload) {
  return z.object({
    /** Phiên bản giao thức (bắt buộc = 1) */
    v: ProtocolVersionSchema,
    /** ID tin nhắn duy nhất dùng chống trùng lặp (idempotent) */
    id: z.string().min(1),
    /** Loại tin nhắn (ví dụ: 'intent:join', 'state_patch', 'snapshot', 'error') */
    type: z.string().min(1),
    /** ID phiên liên quan (null nếu chưa gắn với phiên cụ thể) */
    sessionId: z.string().min(1).nullable(),
    /** Thời điểm gửi tin (epoch timestamp in milliseconds) */
    ts: z.number().int().nonnegative(),
    /** Dữ liệu nội dung của tin nhắn */
    payload: payloadSchema,
  });
}

/**
 * Schema phong bì chuẩn với payload kiểu unknown
 */
export const EnvelopeSchema = createEnvelopeSchema(z.unknown());
export type Envelope<TPayload = unknown> = {
  v: typeof PROTOCOL_VERSION;
  id: string;
  type: string;
  sessionId: string | null;
  ts: number;
  payload?: TPayload;
};

export interface CreateEnvelopeOptions<TPayload> {
  id: string;
  type: string;
  sessionId?: string | null;
  payload: TPayload;
  ts?: number;
}

/**
 * Helper khởi tạo một tin nhắn Envelope chuẩn
 */
export function createEnvelope<TPayload>(
  options: CreateEnvelopeOptions<TPayload>
): Envelope<TPayload> {
  return {
    v: PROTOCOL_VERSION,
    id: options.id,
    type: options.type,
    sessionId: options.sessionId ?? null,
    ts: options.ts ?? Date.now(),
    payload: options.payload,
  };
}
