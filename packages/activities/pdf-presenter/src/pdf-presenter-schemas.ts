import { z } from 'zod';

/**
 * Kiểu hoa văn nền cho khoảng trống chèn thêm (Mô hình A)
 */
export const GapPatternSchema = z.enum(['blank', 'grid', 'lines']);
export type GapPattern = z.infer<typeof GapPatternSchema>;

/**
 * Một khoảng trống chèn vào trang để chữa bài (Mô hình A: Vertical Split & Push Gap)
 */
export const PageGapSchema = z.object({
  id: z.string(),
  pageNumber: z.number().int().positive(),
  splitYRatio: z.number().min(0).max(1), // Vị trí cắt tính theo tỉ lệ chiều cao trang gốc (0..1)
  gapHeightPx: z.number().int().min(20).max(2000), // Chiều cao khoảng trống tính bằng pixel logic
  pattern: GapPatternSchema.default('grid'),
  label: z.string().optional(),
});
export type PageGap = z.infer<typeof PageGapSchema>;

/**
 * Tọa độ một điểm trên nét vẽ vector (tỉ lệ chuẩn hóa 0..1 để co giãn không vỡ nét)
 */
export const AnnotationPointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0), // Cho phép tọa độ pixel Y logic (>= 0), giữ nguyên vị trí cố định
  pressure: z.number().optional(),
});
export type AnnotationPoint = z.infer<typeof AnnotationPointSchema>;

/**
 * Một nét vẽ vector trên trang
 */
export const AnnotationStrokeSchema = z.object({
  id: z.string(),
  pageNumber: z.number().int().positive(),
  tool: z.enum(['pen', 'highlighter', 'eraser']),
  color: z.string(),
  size: z.number().min(1).max(50),
  opacity: z.number().min(0).max(1).default(1),
  points: z.array(AnnotationPointSchema),
  createdAt: z.number().default(() => Date.now()),
});
export type AnnotationStroke = z.infer<typeof AnnotationStrokeSchema>;

/**
 * Thông tin tài liệu đang được chiếu (PDF hoặc DOCX chuyển đổi)
 */
export const DocumentInfoSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  fileType: z.enum(['pdf', 'docx']),
  fileUrl: z.string().min(1),
  totalPages: z.number().int().positive().default(1),
  pageSize: z
    .object({
      width: z.number().positive(),
      height: z.number().positive(),
    })
    .optional(),
  docxHtml: z.string().optional(), // Lưu HTML trích xuất nếu là file Word
  pageImages: z.array(z.string()).optional(), // Danh sách ảnh render sẵn của từng trang (Data URL / Asset URL)
  uploadedAt: z.number().default(() => Date.now()),
});
export type DocumentInfo = z.infer<typeof DocumentInfoSchema>;

/**
 * Con trỏ Laser pointer của giáo viên để chỉ vào đề bài
 */
export const TeacherPointerSchema = z.object({
  pageNumber: z.number().int().positive(),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  visible: z.boolean().default(false),
});
export type TeacherPointer = z.infer<typeof TeacherPointerSchema>;

/**
 * Cấu hình khi khởi chạy Activity PdfPresenter
 */
export const PdfPresenterConfigSchema = z.object({
  title: z.string().default('Chiếu & Chữa bài PDF/Word'),
  initialDocumentUrl: z.string().optional(),
  initialDocumentTitle: z.string().optional(),
  initialDocumentType: z.enum(['pdf', 'docx']).optional(),
  defaultPattern: GapPatternSchema.default('grid'),
  allowStudentDownload: z.boolean().default(true),
});
export type PdfPresenterConfig = z.infer<typeof PdfPresenterConfigSchema>;

/**
 * Trạng thái thời gian thực của buổi chiếu (Server State)
 */
export const PdfPresenterStateSchema = z.object({
  title: z.string(),
  document: DocumentInfoSchema.nullable().default(null),
  currentPage: z.number().int().positive().default(1),
  zoom: z.number().min(0.2).max(4).default(1),
  scrollRatio: z.number().min(0).max(1).default(0),
  gaps: z.array(PageGapSchema).default([]),
  strokes: z.array(AnnotationStrokeSchema).default([]),
  teacherPointer: TeacherPointerSchema.default({
    pageNumber: 1,
    x: 0,
    y: 0,
    visible: false,
  }),
  isFollowLocked: z.boolean().default(true), // Mặc định HS tự động bám sát theo vị trí GV
  isStudentBroadcastEnabled: z.boolean().default(true), // Bật/Tắt chiếu xuống màn hình học sinh
  startedAt: z.number(),
});
export type PdfPresenterState = z.infer<typeof PdfPresenterStateSchema>;

/**
 * Ý định từ giáo viên (Teacher Intent)
 */
export const PdfPresenterTeacherIntentSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('load_document'),
    document: DocumentInfoSchema,
  }),
  z.object({
    type: z.literal('change_page'),
    pageNumber: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('sync_view'),
    zoom: z.number().min(0.2).max(4).optional(),
    scrollRatio: z.number().min(0).max(1).optional(),
    pointer: TeacherPointerSchema.optional(),
  }),
  z.object({
    type: z.literal('insert_gap'),
    gap: PageGapSchema,
  }),
  z.object({
    type: z.literal('update_gap'),
    gapId: z.string(),
    gapHeightPx: z.number().int().min(20).max(2000),
    pattern: GapPatternSchema.optional(),
  }),
  z.object({
    type: z.literal('remove_gap'),
    gapId: z.string(),
  }),
  z.object({
    type: z.literal('add_stroke'),
    stroke: AnnotationStrokeSchema,
  }),
  z.object({
    type: z.literal('undo_stroke'),
    pageNumber: z.number().int().positive().optional(),
  }),
  z.object({
    type: z.literal('clear_page_strokes'),
    pageNumber: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('remove_strokes'),
    strokeIds: z.array(z.string()),
    pageNumber: z.number().int().positive().optional(),
  }),
  z.object({
    type: z.literal('toggle_follow_lock'),
    isFollowLocked: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('give_star'),
    participantId: z.string(),
    exp: z.number().int().positive().default(10),
  }),
  z.object({
    type: z.literal('toggle_student_broadcast'),
    enabled: z.boolean().optional(),
  }),
]);
export type PdfPresenterTeacherIntent = z.infer<typeof PdfPresenterTeacherIntentSchema>;

/**
 * Ý định từ học sinh (Student Intent) - Chỉ xem (Read-only), không được vẽ hay đổi trang
 */
export const PdfPresenterStudentIntentSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('student_ping'),
    timestamp: z.number().default(() => Date.now()),
  }),
  z.object({
    type: z.literal('request_sync'),
  }),
]);
export type PdfPresenterStudentIntent = z.infer<typeof PdfPresenterStudentIntentSchema>;

/**
 * Kết quả sau khi kết thúc buổi chiếu
 */
export const PdfPresenterResultSchema = z.object({
  participantId: z.string(),
  starsReceived: z.number().int().nonnegative().default(0),
  bonusExp: z.number().int().nonnegative().default(0),
});
export type PdfPresenterResult = z.infer<typeof PdfPresenterResultSchema>;
