import { z } from 'zod';

/**
 * Loại tin nhắn trong phòng học:
 * - 'text': Tin nhắn trao đổi bình thường
 * - 'hand_raise': Tín hiệu giơ tay xin trợ giúp từ học sinh
 */
export const ChatMessageKindSchema = z.enum(['text', 'hand_raise']);
export type ChatMessageKind = z.infer<typeof ChatMessageKindSchema>;

/**
 * DTO dữ liệu của một tin nhắn chat
 */
export const ChatMessageDtoSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  fromParticipantId: z.string().nullable().optional(),
  fromParticipantName: z.string().nullable().optional(),
  toParticipantId: z.string().nullable().optional(),
  toParticipantName: z.string().nullable().optional(),
  fromTeacher: z.boolean(),
  kind: ChatMessageKindSchema.default('text'),
  text: z.string(),
  ts: z.number().int().positive(),
});
export type ChatMessageDto = z.infer<typeof ChatMessageDtoSchema>;

/**
 * Yêu cầu gửi tin nhắn chat
 */
export const SendChatMessageRequestSchema = z.object({
  text: z.string().trim().min(1, 'Nội dung tin nhắn không được để trống').max(1000, 'Tin nhắn quá dài (tối đa 1000 ký tự)'),
  toParticipantId: z.string().nullable().optional(),
  kind: ChatMessageKindSchema.default('text').optional(),
});
export type SendChatMessageRequest = z.infer<typeof SendChatMessageRequestSchema>;

export const ChatModeSchema = z.enum(['locked', 'teacher_only', 'open']);
export type ChatMode = z.infer<typeof ChatModeSchema>;

/**
 * Yêu cầu bật/tắt khóa chat hoặc đổi chế độ chat từ Giáo viên
 */
export const ToggleChatLockRequestSchema = z.object({
  locked: z.boolean().optional(),
  chatMode: ChatModeSchema.optional(),
});
export type ToggleChatLockRequest = z.infer<typeof ToggleChatLockRequestSchema>;

/**
 * Thông tin học sinh đang giơ tay xin giúp
 */
export const HandRaiseItemSchema = z.object({
  participantId: z.string().min(1),
  participantName: z.string().min(1),
  requestedAt: z.number().int().positive(),
  message: z.string().optional(),
});
export type HandRaiseItem = z.infer<typeof HandRaiseItemSchema>;

/**
 * Yêu cầu giơ tay xin trợ giúp từ học sinh (Nút ✋)
 */
export const HandRaiseRequestSchema = z.object({
  message: z.string().max(200).optional(),
});
export type HandRaiseRequest = z.infer<typeof HandRaiseRequestSchema>;

/**
 * Yêu cầu giải quyết / hạ tay học sinh từ Giáo viên
 */
export const ResolveHandRaiseRequestSchema = z.object({
  participantId: z.string().min(1),
});
export type ResolveHandRaiseRequest = z.infer<typeof ResolveHandRaiseRequestSchema>;

/**
 * Trạng thái chat trong phiên học
 */
export const ChatStatusResponseSchema = z.object({
  sessionId: z.string().min(1),
  chatLocked: z.boolean(),
  chatMode: ChatModeSchema.default('locked'),
  activeHandRaises: z.array(HandRaiseItemSchema),
});
export type ChatStatusResponse = z.infer<typeof ChatStatusResponseSchema>;

/**
 * Danh sách tin nhắn trả về
 */
export const ChatMessageListResponseSchema = z.object({
  messages: z.array(ChatMessageDtoSchema),
  total: z.number().int().nonnegative(),
  chatLocked: z.boolean(),
  chatMode: ChatModeSchema.default('locked'),
});
export type ChatMessageListResponse = z.infer<typeof ChatMessageListResponseSchema>;
