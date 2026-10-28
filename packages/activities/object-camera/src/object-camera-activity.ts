import type { ActivityContext, ActivityDefinition } from '@educlass/core';
import {
  type ObjectCameraConfig,
  type ObjectCameraState,
  type ObjectCameraTeacherIntent,
  type ObjectCameraResultItem,
  ObjectCameraConfigSchema,
  ObjectCameraStateSchema,
  ObjectCameraTeacherIntentSchema,
  ObjectCameraStudentIntentSchema,
  ObjectCameraResultItemSchema,
  ObjectCameraPhotoSchema,
  ObjectCameraStrokeSchema,
  ObjectCameraViewportSchema,
} from './object-camera-schemas.js';

function generateRandomToken(): string {
  return 'cam_' + Math.random().toString(36).substring(2, 10);
}

export const ObjectCameraActivity: ActivityDefinition<
  ObjectCameraConfig,
  ObjectCameraState,
  ObjectCameraResultItem
> = {
  id: 'object-camera',
  name: 'Camera vật thể',
  version: 1,
  icon: '📷',
  description:
    'Biến điện thoại thành máy chiếu vật thể thông minh. Quét mã QR bảo mật, chụp bài làm học sinh đưa lên máy tính, xoay cắt phóng to chữa bài bằng bút đỏ và đồng bộ thời gian thực xuống cổng học sinh & máy chiếu.',
  capabilities: ['files', 'screen'],
  rewardTriggers: ['showcase_good_work', 'creative_solution', 'bonus_point'],

  configSchema: ObjectCameraConfigSchema,
  stateSchema: ObjectCameraStateSchema,
  resultSchema: ObjectCameraResultItemSchema,

  server: {
    onStart(_ctx: ActivityContext, cfg: ObjectCameraConfig): ObjectCameraState {
      return {
        title: cfg.title || 'Camera vật thể',
        photos: [],
        activePhotoId: null,
        displayMode: 'single',
        comparePhotoId: null,
        isStudentBroadcastEnabled: true,
        viewport: {
          zoom: 1,
          panX: 0,
          panY: 0,
          rotation: 0,
          crop: null,
          filter: 'none',
        },
        compareViewport: {
          zoom: 1,
          panX: 0,
          panY: 0,
          rotation: 0,
          crop: null,
          filter: 'none',
        },
        annotations: [],
        uploadToken: generateRandomToken(),
        isCaptureLocked: false,
        lastAwardedStudent: null,
      };
    },

    onTeacherIntent(
      ctx: ActivityContext,
      st: ObjectCameraState,
      rawIntent: unknown
    ): ObjectCameraState {
      const parsed = ObjectCameraTeacherIntentSchema.safeParse(rawIntent);
      if (!parsed.success) {
        return st;
      }
      const intent: ObjectCameraTeacherIntent = parsed.data;

      switch (intent.type) {
        case 'ADD_PHOTO': {
          const newPhoto = ObjectCameraPhotoSchema.parse(intent.photo);
          const nextPhotos = [...st.photos, newPhoto];
          const shouldSwitch = !st.activePhotoId || st.photos.length === 0;

          return {
            ...st,
            photos: nextPhotos,
            activePhotoId: shouldSwitch ? newPhoto.id : st.activePhotoId,
            viewport: shouldSwitch
              ? { zoom: 1, panX: 0, panY: 0, rotation: 0, crop: null, filter: 'none' }
              : st.viewport,
          };
        }

        case 'DELETE_PHOTO': {
          const remainingPhotos = st.photos.filter(p => p.id !== intent.photoId);
          const remainingAnnotations = st.annotations.filter(a => a.photoId !== intent.photoId);
          let nextActiveId = st.activePhotoId;

          if (st.activePhotoId === intent.photoId) {
            nextActiveId =
              remainingPhotos.length > 0
                ? (remainingPhotos[remainingPhotos.length - 1]?.id ?? null)
                : null;
          }

          return {
            ...st,
            photos: remainingPhotos,
            annotations: remainingAnnotations,
            activePhotoId: nextActiveId,
            viewport:
              nextActiveId !== st.activePhotoId
                ? { zoom: 1, panX: 0, panY: 0, rotation: 0, crop: null, filter: 'none' }
                : st.viewport,
          };
        }

        case 'CLEAR_ALL_PHOTOS': {
          // Giữ lại các ảnh đã được ghim lưu trữ
          const pinnedPhotos = st.photos.filter(p => p.isPinned);
          const pinnedIds = new Set(pinnedPhotos.map(p => p.id));
          const keptAnnotations = st.annotations.filter(a => pinnedIds.has(a.photoId));
          const nextActiveId = pinnedPhotos.length > 0 ? (pinnedPhotos[0]?.id ?? null) : null;

          return {
            ...st,
            photos: pinnedPhotos,
            annotations: keptAnnotations,
            activePhotoId: nextActiveId,
            viewport: { zoom: 1, panX: 0, panY: 0, rotation: 0, crop: null, filter: 'none' },
          };
        }

        case 'PIN_PHOTO': {
          return {
            ...st,
            photos: st.photos.map(p =>
              p.id === intent.photoId ? { ...p, isPinned: intent.isPinned } : p
            ),
          };
        }

        case 'SELECT_PHOTO': {
          if (!st.photos.some(p => p.id === intent.photoId)) {
            return st;
          }
          return {
            ...st,
            activePhotoId: intent.photoId,
            viewport: { zoom: 1, panX: 0, panY: 0, rotation: 0, crop: null, filter: 'none' },
          };
        }

        case 'UPDATE_VIEWPORT': {
          if (intent.target === 'secondary') {
            return {
              ...st,
              compareViewport: ObjectCameraViewportSchema.parse({
                ...st.compareViewport,
                ...intent.viewport,
              }),
            };
          }
          return {
            ...st,
            viewport: ObjectCameraViewportSchema.parse({
              ...st.viewport,
              ...intent.viewport,
            }),
          };
        }

        case 'RESET_VIEWPORT': {
          const defaultViewport = {
            zoom: 1,
            panX: 0,
            panY: 0,
            rotation: 0 as const,
            crop: null,
            filter: 'none' as const,
          };
          if (intent.target === 'secondary') {
            return {
              ...st,
              compareViewport: defaultViewport,
            };
          }
          return {
            ...st,
            viewport: defaultViewport,
          };
        }

        case 'ADD_STROKE': {
          const validStroke = ObjectCameraStrokeSchema.parse(intent.stroke);
          return {
            ...st,
            annotations: [...st.annotations, validStroke],
          };
        }

        case 'UNDO_STROKE': {
          const targetPhotoId = intent.photoId || st.activePhotoId;
          if (!targetPhotoId) return st;

          // Tìm nét vẽ cuối cùng của ảnh này để xóa
          const targetIndices = st.annotations
            .map((a, idx) => (a.photoId === targetPhotoId ? idx : -1))
            .filter(idx => idx !== -1);

          if (targetIndices.length === 0) return st;
          const lastIdx = targetIndices[targetIndices.length - 1];

          return {
            ...st,
            annotations: st.annotations.filter((_, idx) => idx !== lastIdx),
          };
        }

        case 'CLEAR_ANNOTATIONS': {
          const targetPhotoId = intent.photoId || st.activePhotoId;
          if (!targetPhotoId) return st;

          return {
            ...st,
            annotations: st.annotations.filter(a => a.photoId !== targetPhotoId),
          };
        }

        case 'TOGGLE_LOCK_CAPTURE': {
          const nextLocked = intent.locked !== undefined ? intent.locked : !st.isCaptureLocked;
          return {
            ...st,
            isCaptureLocked: nextLocked,
          };
        }

        case 'REGENERATE_TOKEN': {
          return {
            ...st,
            uploadToken: generateRandomToken(),
          };
        }

        case 'AWARD_EXP': {
          if (intent.studentId && intent.exp > 0) {
            ctx.grantReward(intent.studentId, 'showcase_good_work', intent.exp);
          }
          return {
            ...st,
            lastAwardedStudent: {
              studentId: intent.studentId,
              studentName: intent.studentName,
              exp: intent.exp,
              reason: intent.reason,
              timestamp: ctx.now(),
            },
          };
        }

        case 'SET_DISPLAY_MODE': {
          let nextComparePhotoId = st.comparePhotoId;
          // Nếu chuyển sang chế độ so sánh mà chưa chọn ảnh thứ 2: tự động chọn 1 ảnh khác activePhotoId
          if (intent.mode !== 'single' && !nextComparePhotoId && st.photos.length > 1) {
            const otherPhoto = st.photos.find(p => p.id !== st.activePhotoId);
            if (otherPhoto) {
              nextComparePhotoId = otherPhoto.id;
            }
          }
          return {
            ...st,
            displayMode: intent.mode,
            comparePhotoId: nextComparePhotoId,
          };
        }

        case 'SELECT_COMPARE_PHOTO': {
          return {
            ...st,
            comparePhotoId: intent.photoId,
            compareViewport: {
              zoom: 1,
              panX: 0,
              panY: 0,
              rotation: 0 as const,
              crop: null,
              filter: 'none' as const,
            },
          };
        }

        case 'TOGGLE_STUDENT_BROADCAST': {
          const nextEnabled =
            intent.enabled !== undefined ? intent.enabled : !st.isStudentBroadcastEnabled;
          return {
            ...st,
            isStudentBroadcastEnabled: nextEnabled,
          };
        }

        default:
          return st;
      }
    },

    onStudentIntent(
      _ctx: ActivityContext,
      st: ObjectCameraState,
      _participantId: string,
      rawIntent: unknown
    ): ObjectCameraState {
      // Học sinh chỉ có quyền đọc / xem đồng bộ
      ObjectCameraStudentIntentSchema.safeParse(rawIntent);
      return st;
    },

    onEnd(_ctx: ActivityContext, _st: ObjectCameraState): ObjectCameraResultItem[] {
      return [];
    },
  },
};
