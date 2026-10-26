import type { ActivityContext, ActivityDefinition } from '@educlass/core';
import {
  type PdfPresenterConfig,
  type PdfPresenterState,
  type PdfPresenterTeacherIntent,
  type PdfPresenterResult,
  PdfPresenterConfigSchema,
  PdfPresenterStateSchema,
  PdfPresenterTeacherIntentSchema,
  PdfPresenterStudentIntentSchema,
  PdfPresenterResultSchema,
  PageGapSchema,
  AnnotationStrokeSchema,
  DocumentInfoSchema,
} from './pdf-presenter-schemas.js';
import { createSampleExerciseDocument } from './converters/docx-converter.js';

export const PdfPresenterActivity: ActivityDefinition<
  PdfPresenterConfig,
  PdfPresenterState,
  PdfPresenterResult
> = {
  id: 'pdf-presenter',
  name: 'Chiếu & Chữa bài PDF/Word',
  version: 1,
  icon: '📄',
  description:
    'Chiếu tài liệu PDF hoặc Word, cắt dãn khoảng trống bảng trắng (Mô hình A), vẽ viết trực tiếp lên đề bài và phát sóng đồng bộ tức thì xuống điện thoại/máy tính của học sinh.',
  capabilities: ['files', 'screen'],
  rewardTriggers: ['star', 'participation'],

  configSchema: PdfPresenterConfigSchema,
  stateSchema: PdfPresenterStateSchema,
  resultSchema: PdfPresenterResultSchema,

  server: {
    onStart(ctx: ActivityContext, cfg: PdfPresenterConfig): PdfPresenterState {
      // Khởi tạo tài liệu mặc định (nếu chưa có thì dùng đề thi mẫu đã biên soạn sẵn)
      const sampleDoc = createSampleExerciseDocument();

      const initialDoc = cfg.initialDocumentUrl
        ? {
            id: 'doc-initial',
            title: cfg.initialDocumentTitle || 'Tài liệu bài học',
            fileType: cfg.initialDocumentType || 'pdf',
            fileUrl: cfg.initialDocumentUrl,
            totalPages: 1,
            uploadedAt: Date.now(),
          }
        : {
            id: 'doc-sample',
            title: sampleDoc.title,
            fileType: 'docx' as const,
            fileUrl: '#sample',
            totalPages: sampleDoc.totalPages,
            docxHtml: sampleDoc.pagesHtml.join('<!--PAGE_BREAK-->'),
            uploadedAt: Date.now(),
          };

      return {
        title: cfg.title,
        document: initialDoc,
        currentPage: 1,
        zoom: 1,
        scrollRatio: 0,
        gaps: [],
        strokes: [],
        teacherPointer: {
          pageNumber: 1,
          x: 0,
          y: 0,
          visible: false,
        },
        isFollowLocked: true,
        isStudentBroadcastEnabled: true,
        startedAt: ctx.now(),
      };
    },

    onTeacherIntent(
      ctx: ActivityContext,
      st: PdfPresenterState,
      rawIntent: unknown
    ): PdfPresenterState {
      const parsed = PdfPresenterTeacherIntentSchema.safeParse(rawIntent);
      if (!parsed.success) {
        return st;
      }
      const intent: PdfPresenterTeacherIntent = parsed.data;

      switch (intent.type) {
        case 'load_document': {
          const doc = DocumentInfoSchema.parse(intent.document);
          return {
            ...st,
            document: doc,
            currentPage: 1,
            zoom: 1,
            scrollRatio: 0,
            gaps: [], // Reset khoảng trống khi nạp file mới
            strokes: [], // Reset nét vẽ
            teacherPointer: { pageNumber: 1, x: 0, y: 0, visible: false },
          };
        }

        case 'change_page': {
          const maxPages = st.document?.totalPages || 1;
          const targetPage = Math.max(1, Math.min(intent.pageNumber, maxPages));
          return {
            ...st,
            currentPage: targetPage,
            scrollRatio: 0,
            teacherPointer: {
              ...st.teacherPointer,
              pageNumber: targetPage,
              visible: false,
            },
          };
        }

        case 'sync_view': {
          return {
            ...st,
            zoom: intent.zoom !== undefined ? intent.zoom : st.zoom,
            scrollRatio: intent.scrollRatio !== undefined ? intent.scrollRatio : st.scrollRatio,
            teacherPointer: intent.pointer ? intent.pointer : st.teacherPointer,
          };
        }

        case 'insert_gap': {
          const newGap = PageGapSchema.parse(intent.gap);
          return {
            ...st,
            gaps: [...st.gaps, newGap],
          };
        }

        case 'update_gap': {
          return {
            ...st,
            gaps: st.gaps.map((g) =>
              g.id === intent.gapId
                ? {
                    ...g,
                    gapHeightPx: intent.gapHeightPx,
                    pattern: intent.pattern || g.pattern,
                  }
                : g
            ),
          };
        }

        case 'remove_gap': {
          return {
            ...st,
            gaps: st.gaps.filter((g) => g.id !== intent.gapId),
          };
        }

        case 'add_stroke': {
          const newStroke = AnnotationStrokeSchema.parse(intent.stroke);
          return {
            ...st,
            strokes: [...st.strokes, newStroke],
          };
        }

        case 'undo_stroke': {
          const page = intent.pageNumber || st.currentPage;
          // Tìm stroke cuối cùng trên trang này để loại bỏ
          let lastIndex = -1;
          for (let i = st.strokes.length - 1; i >= 0; i--) {
            if (st.strokes[i]?.pageNumber === page) {
              lastIndex = i;
              break;
            }
          }
          if (lastIndex >= 0) {
            const nextStrokes = [...st.strokes];
            nextStrokes.splice(lastIndex, 1);
            return {
              ...st,
              strokes: nextStrokes,
            };
          }
          return st;
        }

        case 'clear_page_strokes': {
          return {
            ...st,
            strokes: st.strokes.filter((s) => s.pageNumber !== intent.pageNumber),
          };
        }

        case 'remove_strokes': {
          const idSet = new Set(intent.strokeIds);
          return {
            ...st,
            strokes: st.strokes.filter((s) => !idSet.has(s.id)),
          };
        }

        case 'toggle_follow_lock': {
          return {
            ...st,
            isFollowLocked:
              intent.isFollowLocked !== undefined ? intent.isFollowLocked : !st.isFollowLocked,
          };
        }

        case 'give_star': {
          // Thưởng EXP cho học sinh phát biểu / giải bài đúng
          ctx.grantReward(intent.participantId, 'star', intent.exp);
          return st;
        }

        case 'toggle_student_broadcast': {
          return {
            ...st,
            isStudentBroadcastEnabled:
              intent.enabled !== undefined ? intent.enabled : !st.isStudentBroadcastEnabled,
          };
        }

        default:
          return st;
      }
    },

    onStudentIntent(
      _ctx: ActivityContext,
      st: PdfPresenterState,
      _participantId: string,
      rawIntent: unknown
    ): PdfPresenterState {
      // Học sinh ở chế độ CHỈ XEM (Read-only)
      const parsed = PdfPresenterStudentIntentSchema.safeParse(rawIntent);
      if (!parsed.success) {
        // Reject mọi hành vi can thiệp trái phép
        return st;
      }
      // Ping hoặc request_sync không làm thay đổi state chung của lớp
      return st;
    },

    onEnd(_ctx: ActivityContext, _st: PdfPresenterState): PdfPresenterResult[] {
      return [];
    },
  },
};
