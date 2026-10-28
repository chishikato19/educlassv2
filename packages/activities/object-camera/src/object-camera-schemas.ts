import { z } from 'zod';

/**
 * Tọa độ một điểm trên nét vẽ vector (chuẩn hóa 0..1 để co giãn không phụ thuộc độ phân giải màn hình)
 */
export const ObjectCameraPointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  pressure: z.number().optional(),
});
export type ObjectCameraPoint = z.infer<typeof ObjectCameraPointSchema>;

/**
 * Các loại công cụ vẽ / chú thích trên ảnh
 */
export const AnnotationToolTypeSchema = z.enum([
  'pen', // Bút mực đỏ/xanh/đen
  'highlighter', // Bút dạ quang vàng neon bán trong suốt
  'stamp_check', // Dấu Đúng (✓)
  'stamp_cross', // Dấu Sai (✗)
  'stamp_star', // Dấu Sao khen ngợi (★)
  'eraser', // Tẩy nét
]);
export type AnnotationToolType = z.infer<typeof AnnotationToolTypeSchema>;

/**
 * Một nét vẽ hoặc con dấu chú thích vector
 */
export const ObjectCameraStrokeSchema = z.object({
  id: z.string(),
  photoId: z.string(),
  tool: AnnotationToolTypeSchema,
  color: z.string().default('#EF4444'),
  size: z.number().min(1).max(60).default(4),
  opacity: z.number().min(0).max(1).default(1),
  points: z.array(ObjectCameraPointSchema),
  createdAt: z.number().default(() => Date.now()),
});
export type ObjectCameraStroke = z.infer<typeof ObjectCameraStrokeSchema>;

/**
 * Thông tin một bức ảnh trong khay Camera vật thể
 */
export const ObjectCameraPhotoSchema = z.object({
  id: z.string(),
  name: z.string().default('Ảnh chụp bài làm'),
  url: z.string().min(1),
  thumbnailUrl: z.string().optional(),
  width: z.number().positive().default(1920),
  height: z.number().positive().default(1080),
  capturedAt: z.number().default(() => Date.now()),
  studentId: z.string().optional(),
  studentName: z.string().optional(),
  isPinned: z.boolean().default(false), // true nếu giáo viên ghim/lưu giữ lâu dài
});
export type ObjectCameraPhoto = z.infer<typeof ObjectCameraPhotoSchema>;

/**
 * Khung cắt ảnh (Crop rectangle dạng tỉ lệ chuẩn hóa 0..1)
 */
export const CropRectSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0.05).max(1),
  height: z.number().min(0.05).max(1),
});
export type CropRect = z.infer<typeof CropRectSchema>;

/**
 * Bộ lọc ảnh tài liệu (hỗ trợ làm trắng nền vở, đậm chữ viết tay)
 */
export const DocumentImageFilterSchema = z.enum(['none', 'high_contrast', 'black_white']);
export type DocumentImageFilter = z.infer<typeof DocumentImageFilterSchema>;

/**
 * Trạng thái khung nhìn (Viewport) đồng bộ thời gian thực
 */
export const ObjectCameraViewportSchema = z.object({
  zoom: z.number().min(0.2).max(5).default(1),
  panX: z.number().default(0), // Pixel logic offset
  panY: z.number().default(0),
  rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]).default(0),
  crop: CropRectSchema.nullable().default(null),
  filter: DocumentImageFilterSchema.default('none'),
});
export type ObjectCameraViewport = z.infer<typeof ObjectCameraViewportSchema>;

/**
 * Cấu hình khởi chạy Activity Camera vật thể
 */
export const ObjectCameraConfigSchema = z.object({
  title: z.string().default('Camera vật thể'),
  allowContinuousCapture: z.boolean().default(true),
  autoSwitchToNewPhoto: z.boolean().default(true),
});
export type ObjectCameraConfig = z.infer<typeof ObjectCameraConfigSchema>;

/**
 * Chế độ hiển thị: 1 ảnh (đơn), so sánh chia đôi dọc (Trái | Phải), hoặc chia đôi ngang (Trên | Dưới)
 */
export const ObjectCameraDisplayModeSchema = z.enum([
  'single',
  'compare_vertical',
  'compare_horizontal',
]);
export type ObjectCameraDisplayMode = z.infer<typeof ObjectCameraDisplayModeSchema>;

/**
 * Trạng thái máy chủ của Activity Camera vật thể (Server State)
 */
export const ObjectCameraStateSchema = z.object({
  title: z.string().default('Camera vật thể'),
  photos: z.array(ObjectCameraPhotoSchema).default([]),
  activePhotoId: z.string().nullable().default(null),
  displayMode: ObjectCameraDisplayModeSchema.default('single'),
  comparePhotoId: z.string().nullable().default(null), // ID của ảnh thứ 2 khi so sánh
  isStudentBroadcastEnabled: z.boolean().default(true), // Bật/Tắt chiếu xuống màn hình học sinh
  viewport: ObjectCameraViewportSchema.default({
    zoom: 1,
    panX: 0,
    panY: 0,
    rotation: 0,
    crop: null,
    filter: 'none',
  }),
  compareViewport: ObjectCameraViewportSchema.default({
    zoom: 1,
    panX: 0,
    panY: 0,
    rotation: 0,
    crop: null,
    filter: 'none',
  }),
  annotations: z.array(ObjectCameraStrokeSchema).default([]),
  uploadToken: z.string().default(''), // Token bảo mật ngẫu nhiên cho điện thoại giáo viên
  isCaptureLocked: z.boolean().default(false), // Khóa không cho điện thoại gửi ảnh nữa
  lastAwardedStudent: z
    .object({
      studentId: z.string(),
      studentName: z.string(),
      exp: z.number(),
      reason: z.string(),
      timestamp: z.number(),
    })
    .nullable()
    .default(null),
});
export type ObjectCameraState = z.infer<typeof ObjectCameraStateSchema>;

/**
 * Các Intent hành động của Giáo viên
 */
export const ObjectCameraTeacherIntentSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('ADD_PHOTO'),
    photo: ObjectCameraPhotoSchema,
  }),
  z.object({
    type: z.literal('DELETE_PHOTO'),
    photoId: z.string(),
  }),
  z.object({
    type: z.literal('CLEAR_ALL_PHOTOS'),
  }),
  z.object({
    type: z.literal('PIN_PHOTO'),
    photoId: z.string(),
    isPinned: z.boolean(),
  }),
  z.object({
    type: z.literal('SELECT_PHOTO'),
    photoId: z.string(),
  }),
  z.object({
    type: z.literal('UPDATE_VIEWPORT'),
    viewport: ObjectCameraViewportSchema.partial(),
    target: z.enum(['primary', 'secondary']).optional(),
  }),
  z.object({
    type: z.literal('RESET_VIEWPORT'),
    target: z.enum(['primary', 'secondary']).optional(),
  }),
  z.object({
    type: z.literal('ADD_STROKE'),
    stroke: ObjectCameraStrokeSchema,
  }),
  z.object({
    type: z.literal('UNDO_STROKE'),
    photoId: z.string().optional(),
  }),
  z.object({
    type: z.literal('CLEAR_ANNOTATIONS'),
    photoId: z.string().optional(),
  }),
  z.object({
    type: z.literal('TOGGLE_LOCK_CAPTURE'),
    locked: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('REGENERATE_TOKEN'),
  }),
  z.object({
    type: z.literal('AWARD_EXP'),
    studentId: z.string(),
    studentName: z.string(),
    exp: z.number().int().positive(),
    reason: z.string().default('Khen ngợi bài làm xuất sắc'),
  }),
  z.object({
    type: z.literal('SET_DISPLAY_MODE'),
    mode: ObjectCameraDisplayModeSchema,
  }),
  z.object({
    type: z.literal('SELECT_COMPARE_PHOTO'),
    photoId: z.string().nullable(),
  }),
  z.object({
    type: z.literal('TOGGLE_STUDENT_BROADCAST'),
    enabled: z.boolean().optional(),
  }),
]);
export type ObjectCameraTeacherIntent = z.infer<typeof ObjectCameraTeacherIntentSchema>;

/**
 * Học sinh ở chế độ chỉ xem (Read-only)
 */
export const ObjectCameraStudentIntentSchema = z.object({
  type: z.literal('PING'),
});
export type ObjectCameraStudentIntent = z.infer<typeof ObjectCameraStudentIntentSchema>;

/**
 * Kết quả sau khi kết thúc Activity
 */
export const ObjectCameraResultItemSchema = z.object({
  participantId: z.string(),
  score: z.number().default(0),
  photosAnalyzed: z.number().default(0),
});
export type ObjectCameraResultItem = z.infer<typeof ObjectCameraResultItemSchema>;
