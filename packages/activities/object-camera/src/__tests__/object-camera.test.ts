import { describe, it, expect, vi } from 'vitest';
import { ObjectCameraActivity } from '../object-camera-activity.js';
import type { ActivityContext } from '@educlass/core';

describe('ObjectCameraActivity', () => {
  const mockContext: ActivityContext = {
    sessionId: 'session_1',
    runId: 'run_1',
    now: () => 1700000000000,
    rng: () => 0.5,
    grantReward: vi.fn(),
    broadcast: vi.fn(),
    sendToParticipant: vi.fn(),
  };

  it('khởi tạo thành công với cấu hình mặc định', () => {
    const state = ObjectCameraActivity.server.onStart(mockContext, {
      title: 'Camera vật thể',
      allowContinuousCapture: true,
      autoSwitchToNewPhoto: true,
    });

    expect(state.title).toBe('Camera vật thể');
    expect(state.photos).toEqual([]);
    expect(state.activePhotoId).toBeNull();
    expect(state.uploadToken).toMatch(/^cam_/);
    expect(state.isCaptureLocked).toBe(false);
    expect(state.viewport.zoom).toBe(1);
    expect(state.viewport.rotation).toBe(0);
  });

  it('xử lý thêm ảnh và tự động chọn ảnh active', () => {
    let state = ObjectCameraActivity.server.onStart(mockContext, {
      title: 'Camera vật thể',
      allowContinuousCapture: true,
      autoSwitchToNewPhoto: true,
    });

    state = ObjectCameraActivity.server.onTeacherIntent(mockContext, state, {
      type: 'ADD_PHOTO',
      photo: {
        id: 'photo-1',
        name: 'Bài tập 1',
        url: 'data:image/png;base64,mock',
        width: 1920,
        height: 1080,
        capturedAt: 1700000000000,
        isPinned: false,
      },
    });

    expect(state.photos.length).toBe(1);
    expect(state.activePhotoId).toBe('photo-1');
  });

  it('xử lý biến đổi viewport (xoay, zoom, pan, crop, filter)', () => {
    let state = ObjectCameraActivity.server.onStart(mockContext, {
      title: 'Camera vật thể',
      allowContinuousCapture: true,
      autoSwitchToNewPhoto: true,
    });

    state = ObjectCameraActivity.server.onTeacherIntent(mockContext, state, {
      type: 'UPDATE_VIEWPORT',
      viewport: {
        zoom: 2.5,
        panX: 50,
        panY: -30,
        rotation: 90,
        filter: 'high_contrast',
      },
    });

    expect(state.viewport.zoom).toBe(2.5);
    expect(state.viewport.panX).toBe(50);
    expect(state.viewport.panY).toBe(-30);
    expect(state.viewport.rotation).toBe(90);
    expect(state.viewport.filter).toBe('high_contrast');

    // Reset viewport
    state = ObjectCameraActivity.server.onTeacherIntent(mockContext, state, {
      type: 'RESET_VIEWPORT',
    });

    expect(state.viewport.zoom).toBe(1);
    expect(state.viewport.rotation).toBe(0);
  });

  it('xử lý vẽ, hoàn tác và xóa nét vẽ vector', () => {
    let state = ObjectCameraActivity.server.onStart(mockContext, {
      title: 'Camera vật thể',
      allowContinuousCapture: true,
      autoSwitchToNewPhoto: true,
    });

    state = ObjectCameraActivity.server.onTeacherIntent(mockContext, state, {
      type: 'ADD_PHOTO',
      photo: {
        id: 'photo-1',
        name: 'Bài 1',
        url: 'http://localhost/img1.jpg',
        width: 800,
        height: 600,
        capturedAt: 1000,
        isPinned: false,
      },
    });

    // Thêm nét vẽ 1
    state = ObjectCameraActivity.server.onTeacherIntent(mockContext, state, {
      type: 'ADD_STROKE',
      stroke: {
        id: 'stroke-1',
        photoId: 'photo-1',
        tool: 'pen',
        color: '#EF4444',
        size: 4,
        opacity: 1,
        points: [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.2 }],
        createdAt: 1000,
      },
    });

    expect(state.annotations.length).toBe(1);

    // Hoàn tác
    state = ObjectCameraActivity.server.onTeacherIntent(mockContext, state, {
      type: 'UNDO_STROKE',
      photoId: 'photo-1',
    });

    expect(state.annotations.length).toBe(0);
  });

  it('xử lý cơ chế dọn dẹp ảnh tạm và bảo toàn ảnh đã ghim', () => {
    let state = ObjectCameraActivity.server.onStart(mockContext, {
      title: 'Camera vật thể',
      allowContinuousCapture: true,
      autoSwitchToNewPhoto: true,
    });

    // Thêm 2 ảnh, trong đó photo-2 được ghim
    state = ObjectCameraActivity.server.onTeacherIntent(mockContext, state, {
      type: 'ADD_PHOTO',
      photo: {
        id: 'photo-1',
        name: 'Ảnh nháp 1',
        url: 'http://localhost/1.jpg',
        width: 800,
        height: 600,
        capturedAt: 1000,
        isPinned: false,
      },
    });

    state = ObjectCameraActivity.server.onTeacherIntent(mockContext, state, {
      type: 'ADD_PHOTO',
      photo: {
        id: 'photo-2',
        name: 'Bài mẫu xuất sắc',
        url: 'http://localhost/2.jpg',
        width: 800,
        height: 600,
        capturedAt: 2000,
        isPinned: true, // Được ghim
      },
    });

    expect(state.photos.length).toBe(2);

    // Bấm Dọn sạch tất cả ảnh tạm
    state = ObjectCameraActivity.server.onTeacherIntent(mockContext, state, {
      type: 'CLEAR_ALL_PHOTOS',
    });

    // Chỉ giữ lại ảnh đã ghim!
    expect(state.photos.length).toBe(1);
    expect(state.photos[0]?.id).toBe('photo-2');
  });

  it('khen thưởng EXP cho học sinh', () => {
    let state = ObjectCameraActivity.server.onStart(mockContext, {
      title: 'Camera vật thể',
      allowContinuousCapture: true,
      autoSwitchToNewPhoto: true,
    });

    state = ObjectCameraActivity.server.onTeacherIntent(mockContext, state, {
      type: 'AWARD_EXP',
      studentId: 'student-123',
      studentName: 'Nguyễn Văn An',
      exp: 20,
      reason: 'Giải toán sáng tạo',
    });

    expect(mockContext.grantReward).toHaveBeenCalledWith('student-123', 'showcase_good_work', 20);
    expect(state.lastAwardedStudent?.studentId).toBe('student-123');
    expect(state.lastAwardedStudent?.exp).toBe(20);
  });

  it('xử lý chuyển đổi chế độ hiển thị so sánh 2 ảnh và bật/tắt chiếu xuống học sinh', () => {
    let state = ObjectCameraActivity.server.onStart(mockContext, {
      title: 'Camera vật thể',
      allowContinuousCapture: true,
      autoSwitchToNewPhoto: true,
    });

    state = ObjectCameraActivity.server.onTeacherIntent(mockContext, state, {
      type: 'ADD_PHOTO',
      photo: {
        id: 'photo-1',
        name: 'Bài 1',
        url: 'http://localhost/1.jpg',
        width: 800,
        height: 600,
        capturedAt: 1000,
        isPinned: false,
      },
    });

    state = ObjectCameraActivity.server.onTeacherIntent(mockContext, state, {
      type: 'ADD_PHOTO',
      photo: {
        id: 'photo-2',
        name: 'Bài 2',
        url: 'http://localhost/2.jpg',
        width: 800,
        height: 600,
        capturedAt: 2000,
        isPinned: false,
      },
    });

    // Chuyển sang so sánh dọc
    state = ObjectCameraActivity.server.onTeacherIntent(mockContext, state, {
      type: 'SET_DISPLAY_MODE',
      mode: 'compare_vertical',
    });

    expect(state.displayMode).toBe('compare_vertical');
    expect(state.comparePhotoId).toBe('photo-2'); // Tự động chọn ảnh thứ 2

    // Chọn ảnh so sánh khác
    state = ObjectCameraActivity.server.onTeacherIntent(mockContext, state, {
      type: 'SELECT_COMPARE_PHOTO',
      photoId: 'photo-1',
    });
    expect(state.comparePhotoId).toBe('photo-1');

    // Tắt chiếu học sinh
    expect(state.isStudentBroadcastEnabled).toBe(true);
    state = ObjectCameraActivity.server.onTeacherIntent(mockContext, state, {
      type: 'TOGGLE_STUDENT_BROADCAST',
      enabled: false,
    });
    expect(state.isStudentBroadcastEnabled).toBe(false);

    // Bật lại chiếu học sinh
    state = ObjectCameraActivity.server.onTeacherIntent(mockContext, state, {
      type: 'TOGGLE_STUDENT_BROADCAST',
    });
    expect(state.isStudentBroadcastEnabled).toBe(true);
  });

  it('kết thúc hoạt động trả về mảng kết quả rỗng (không ghi snapshot giáo viên vào activity_results)', () => {
    const state = ObjectCameraActivity.server.onStart(mockContext, {
      title: 'Camera vật thể',
      allowContinuousCapture: true,
      autoSwitchToNewPhoto: true,
    });
    const results = ObjectCameraActivity.server.onEnd(mockContext, state);
    expect(results).toEqual([]);
  });
});
