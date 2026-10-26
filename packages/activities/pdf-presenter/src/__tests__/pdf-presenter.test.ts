import { describe, expect, it, vi } from 'vitest';
import type { ActivityContext } from '@educlass/core';
import {
  PdfPresenterActivity,
  calculateExpandedHeight,
} from '../index.js';

describe('PdfPresenter Activity Plugin (@educlass/activity-pdf-presenter)', () => {
  const mockCtx: ActivityContext = {
    sessionId: 'sess_pdf_1',
    runId: 'run_pdf_1',
    now: () => 1728000000000,
    rng: () => 0.5,
    broadcast: vi.fn(),
    sendToParticipant: vi.fn(),
    grantReward: vi.fn(),
  };

  it('correctly initializes state onStart', () => {
    const initialState = PdfPresenterActivity.server.onStart(mockCtx, {
      title: 'Chữa đề thi giữa kỳ môn Toán',
      defaultPattern: 'grid',
      allowStudentDownload: true,
    });

    expect(initialState.title).toBe('Chữa đề thi giữa kỳ môn Toán');
    expect(initialState.currentPage).toBe(1);
    expect(initialState.gaps).toHaveLength(0);
    expect(initialState.strokes).toHaveLength(0);
    expect(initialState.isFollowLocked).toBe(true);
    expect(initialState.document).not.toBeNull();
  });

  it('handles Model A: insert_gap, update_gap, and remove_gap', () => {
    const state0 = PdfPresenterActivity.server.onStart(mockCtx, {
      title: 'Chữa bài Toán',
      defaultPattern: 'grid',
      allowStudentDownload: true,
    });

    // 1. Chèn khoảng trống sau Câu 1 (vị trí 35% chiều cao trang, cao 250px, kẻ ô ly)
    const stateWithGap = PdfPresenterActivity.server.onTeacherIntent(mockCtx, state0, {
      type: 'insert_gap',
      gap: {
        id: 'gap_c1',
        pageNumber: 1,
        splitYRatio: 0.35,
        gapHeightPx: 250,
        pattern: 'grid',
      },
    });

    expect(stateWithGap.gaps).toHaveLength(1);
    expect(stateWithGap.gaps[0]?.splitYRatio).toBe(0.35);
    expect(stateWithGap.gaps[0]?.gapHeightPx).toBe(250);
    expect(stateWithGap.gaps[0]?.pattern).toBe('grid');

    // 2. Giáo viên kéo dãn thêm khoảng trống lên 400px
    const stateUpdatedGap = PdfPresenterActivity.server.onTeacherIntent(mockCtx, stateWithGap, {
      type: 'update_gap',
      gapId: 'gap_c1',
      gapHeightPx: 400,
      pattern: 'lines',
    });

    expect(stateUpdatedGap.gaps[0]?.gapHeightPx).toBe(400);
    expect(stateUpdatedGap.gaps[0]?.pattern).toBe('lines');

    // 3. Xóa khoảng trống
    const stateRemovedGap = PdfPresenterActivity.server.onTeacherIntent(mockCtx, stateUpdatedGap, {
      type: 'remove_gap',
      gapId: 'gap_c1',
    });

    expect(stateRemovedGap.gaps).toHaveLength(0);
  });

  it('handles drawing strokes: add_stroke, undo_stroke, and clear_page_strokes', () => {
    const state0 = PdfPresenterActivity.server.onStart(mockCtx, {
      title: 'Chữa bài Toán',
      defaultPattern: 'grid',
      allowStudentDownload: true,
    });

    // 1. Thêm nét vẽ bút đỏ
    const stateWithStroke1 = PdfPresenterActivity.server.onTeacherIntent(mockCtx, state0, {
      type: 'add_stroke',
      stroke: {
        id: 'stroke_1',
        pageNumber: 1,
        tool: 'pen',
        color: '#DC2626',
        size: 3,
        opacity: 1,
        points: [
          { x: 0.1, y: 0.2 },
          { x: 0.2, y: 0.3 },
        ],
        createdAt: 1728000000000,
      },
    });

    // 2. Thêm nét bút dạ quang vàng
    const stateWithStroke2 = PdfPresenterActivity.server.onTeacherIntent(mockCtx, stateWithStroke1, {
      type: 'add_stroke',
      stroke: {
        id: 'stroke_2',
        pageNumber: 1,
        tool: 'highlighter',
        color: '#FDE047',
        size: 18,
        opacity: 0.4,
        points: [
          { x: 0.3, y: 0.4 },
          { x: 0.4, y: 0.5 },
        ],
        createdAt: 1728000001000,
      },
    });

    expect(stateWithStroke2.strokes).toHaveLength(2);

    // 3. Hoàn tác nét gần nhất (Undo stroke_2)
    const stateUndo = PdfPresenterActivity.server.onTeacherIntent(mockCtx, stateWithStroke2, {
      type: 'undo_stroke',
      pageNumber: 1,
    });
    expect(stateUndo.strokes).toHaveLength(1);
    expect(stateUndo.strokes[0]?.id).toBe('stroke_1');

    // 4. Xóa toàn bộ nét trên trang
    const stateClear = PdfPresenterActivity.server.onTeacherIntent(mockCtx, stateUndo, {
      type: 'clear_page_strokes',
      pageNumber: 1,
    });
    expect(stateClear.strokes).toHaveLength(0);
  });

  it('ensures student is read-only and cannot alter presenter state', () => {
    const state0 = PdfPresenterActivity.server.onStart(mockCtx, {
      title: 'Chữa bài Toán',
      defaultPattern: 'grid',
      allowStudentDownload: true,
    });

    // Học sinh thử gửi lệnh chèn gap trái phép
    const attemptedState = PdfPresenterActivity.server.onStudentIntent(mockCtx, state0, 'part_01', {
      type: 'insert_gap',
      gap: {
        id: 'hacker_gap',
        pageNumber: 1,
        splitYRatio: 0.5,
        gapHeightPx: 500,
        pattern: 'blank',
      },
    });

    // State vẫn giữ nguyên hoặc reject, không bị thay đổi
    if ('gaps' in attemptedState) {
      expect(attemptedState.gaps).toHaveLength(0);
    } else {
      expect(attemptedState.ok).toBe(false);
    }

    // Học sinh gửi ping hợp lệ
    const pingedState = PdfPresenterActivity.server.onStudentIntent(mockCtx, state0, 'part_01', {
      type: 'student_ping',
      timestamp: 1728000002000,
    });
    expect(pingedState).toEqual(state0);
  });

  it('calculates expanded height correctly for Model A', () => {
    const origH = 1130;
    const gaps = [
      { id: 'g1', pageNumber: 1, splitYRatio: 0.2, gapHeightPx: 200, pattern: 'grid' as const },
      { id: 'g2', pageNumber: 1, splitYRatio: 0.6, gapHeightPx: 350, pattern: 'lines' as const },
    ];
    const expanded = calculateExpandedHeight(origH, gaps);
    expect(expanded).toBe(1130 + 200 + 350);
  });

  it('supports reward granting for active students', () => {
    const state0 = PdfPresenterActivity.server.onStart(mockCtx, {
      title: 'Chữa bài',
      defaultPattern: 'grid',
      allowStudentDownload: true,
    });

    PdfPresenterActivity.server.onTeacherIntent(mockCtx, state0, {
      type: 'give_star',
      participantId: 'part_01',
      exp: 15,
    });

    expect(mockCtx.grantReward).toHaveBeenCalledWith('part_01', 'star', 15);
  });
});
