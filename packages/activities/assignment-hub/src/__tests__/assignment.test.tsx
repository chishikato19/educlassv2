// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ActivityContext } from '@educlass/core';
import {
  AssignmentHubActivity,
  type AssignmentState,
  AssignmentStudentView,
  AssignmentTeacherPanel,
  AssignmentProjectorView,
} from '../index.js';

describe('AssignmentHub Activity Plugin (@educlass/activity-assignment-hub)', () => {
  const mockCtx: ActivityContext = {
    sessionId: 'sess_test_1',
    runId: 'run_test_1',
    now: () => 1728000000000,
    rng: () => 0.5,
    broadcast: vi.fn(),
    sendToParticipant: vi.fn(),
    grantReward: vi.fn(),
  };

  it('correctly handles server lifecycle: onStart, onStudentIntent, onTeacherIntent, onEnd', () => {
    // 1. onStart
    const initialState = AssignmentHubActivity.server.onStart(mockCtx, {
      title: 'Thực hành Tin học bài 5',
      instructions: 'Các em tải file DeBai.docx bên dưới và nộp bài làm file Word.',
      targetDirectory: 'D:/EduClass/Submissions',
      materials: [
        {
          id: 'mat_1',
          name: 'DeBai.docx',
          size: 15420,
          mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          url: '/api/files/debaimat1',
          uploadedAt: 1728000000000,
        },
      ],
      allowedExtensions: ['.docx', '.xlsx', '.pdf'],
      maxFileSizeMb: 25,
      allowResubmit: true,
      deadlineMinutes: 45,
    });

    expect(initialState.title).toBe('Thực hành Tin học bài 5');
    expect(initialState.materials).toHaveLength(1);
    expect(initialState.isLocked).toBe(false);
    expect(Object.keys(initialState.submissions)).toHaveLength(0);
    expect(initialState.deadlineAt).toBe(1728000000000 + 45 * 60 * 1000);

    // 2. onStudentIntent: submit_assignment
    const submittedState = AssignmentHubActivity.server.onStudentIntent(
      mockCtx,
      initialState,
      'part_01',
      {
        type: 'submit_assignment',
        submission: {
          participantId: 'part_01',
          studentName: 'Nguyễn Văn An',
          fileName: 'BaiLam_NguyenVanAn.docx',
          fileSize: 20480,
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          submittedAt: 1728000000000,
          downloadUrl: '/api/sessions/sess_test_1/activities/run_test_1/submissions/part_01/download',
          status: 'submitted',
        },
      }
    );

    expect('ok' in submittedState).toBe(false);
    const validState = submittedState as AssignmentState;
    expect(validState.submissions['part_01']?.fileName).toBe('BaiLam_NguyenVanAn.docx');
    expect(mockCtx.grantReward).toHaveBeenCalledWith('part_01', 'submit_assignment', 10);
    expect(mockCtx.grantReward).toHaveBeenCalledWith('part_01', 'early_submit', 5);

    // 3. onTeacherIntent: toggle_lock
    const lockedState = AssignmentHubActivity.server.onTeacherIntent(mockCtx, validState, {
      type: 'toggle_lock',
      isLocked: true,
    });
    expect(lockedState.isLocked).toBe(true);

    // 4. onStudentIntent when locked -> reject
    const rejected = AssignmentHubActivity.server.onStudentIntent(
      mockCtx,
      lockedState,
      'part_02',
      {
        type: 'submit_assignment',
        submission: {
          participantId: 'part_02',
          studentName: 'Trần Thị Bình',
          fileName: 'Binh_BaiLam.docx',
          fileSize: 1024,
          mimeType: 'application/octet-stream',
          submittedAt: 1728000000000,
          downloadUrl: '/api/download/part_02',
          status: 'submitted',
        },
      }
    );
    expect('ok' in rejected).toBe(true);
    if ('ok' in rejected) {
      expect(rejected.ok).toBe(false);
      expect(rejected.code).toBe('SUBMISSION_LOCKED');
    }

    // 5. onTeacherIntent: add_material
    const updatedWithMaterial = AssignmentHubActivity.server.onTeacherIntent(mockCtx, validState, {
      type: 'add_material',
      material: {
        id: 'mat_2',
        name: 'BangPhuLuc.xlsx',
        size: 8900,
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        url: '/api/files/mat2',
        uploadedAt: 1728000000000,
      },
    });
    expect(updatedWithMaterial.materials).toHaveLength(2);

    // 6. onEnd
    const results = AssignmentHubActivity.server.onEnd(mockCtx, validState);
    expect(results).toHaveLength(1);
    expect(results[0]?.studentName).toBe('Nguyễn Văn An');
    expect(results[0]?.submitted).toBe(true);
  });

  it('renders AssignmentTeacherPanel and triggers callbacks', () => {
    const mockState: AssignmentState = {
      title: 'Thu bài Excel',
      instructions: 'Nộp bài trước 9h',
      targetDirectory: 'D:/EduClass/BaiKiemTra',
      materials: [],
      allowedExtensions: ['.xlsx'],
      maxFileSizeMb: 50,
      allowResubmit: true,
      deadlineAt: null,
      isLocked: false,
      submissions: {
        p1: {
          participantId: 'p1',
          studentName: 'Lê Hoàng Nam',
          fileName: 'Nam_Excel.xlsx',
          fileSize: 12500,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          submittedAt: 1728000000000,
          downloadUrl: '/download/p1',
          status: 'submitted',
        },
      },
      startedAt: 1728000000000,
    };

    const handleSendIntent = vi.fn();
    const handleEndActivity = vi.fn();

    render(
      <AssignmentTeacherPanel
        runId="run_1"
        state={mockState}
        onSendIntent={handleSendIntent}
        onEndActivity={handleEndActivity}
        totalParticipants={20}
      />
    );

    expect(screen.getByText('Thu bài Excel')).toBeDefined();
    expect(screen.getByText('Lê Hoàng Nam')).toBeDefined();
    expect(screen.getByText(/Nam_Excel.xlsx/)).toBeDefined();

    // Bấm khóa cổng
    const btnLock = screen.getByText('🔒 Khóa cổng nộp bài');
    fireEvent.click(btnLock);
    expect(handleSendIntent).toHaveBeenCalledWith({
      type: 'toggle_lock',
      isLocked: true,
    });
  });

  it('renders AssignmentStudentView and handles material viewing', () => {
    const mockState: AssignmentState = {
      title: 'Kiểm tra Word',
      instructions: 'Đọc kỹ đề bài',
      targetDirectory: 'D:/EduClass',
      materials: [
        {
          id: 'm1',
          name: 'DeKiemTra.pdf',
          size: 50000,
          mime: 'application/pdf',
          url: '/api/pdf/m1',
          uploadedAt: 1728000000000,
        },
      ],
      allowedExtensions: ['.docx', '.pdf'],
      maxFileSizeMb: 50,
      allowResubmit: true,
      deadlineAt: null,
      isLocked: false,
      submissions: {},
      startedAt: 1728000000000,
    };

    render(
      <AssignmentStudentView
        runId="run_1"
        state={mockState}
        participantId="p_test"
        displayName="Học sinh A"
        onSendIntent={vi.fn()}
      />
    );

    expect(screen.getByText('Kiểm tra Word')).toBeDefined();
    expect(screen.getByText(/DeKiemTra.pdf/)).toBeDefined();
    expect(screen.getByText('👁️ Xem')).toBeDefined();
  });

  it('renders AssignmentProjectorView with progress percent', () => {
    const mockState: AssignmentState = {
      title: 'Nộp bài thực hành',
      instructions: '',
      targetDirectory: '',
      materials: [],
      allowedExtensions: [],
      maxFileSizeMb: 50,
      allowResubmit: true,
      deadlineAt: null,
      isLocked: false,
      submissions: {
        p1: {
          participantId: 'p1',
          studentName: 'Em 1',
          fileName: 'Bai1.docx',
          fileSize: 1000,
          mimeType: 'application/octet-stream',
          submittedAt: 1728000000000,
          downloadUrl: '/url1',
          status: 'submitted',
        },
      },
      startedAt: 1728000000000,
    };

    render(
      <AssignmentProjectorView
        state={mockState}
        participants={[
          { id: 'p1', displayName: 'Em 1' },
          { id: 'p2', displayName: 'Em 2' },
        ]}
      />
    );

    expect(screen.getByText('50%')).toBeDefined();
    expect(screen.getByText('Em 1')).toBeDefined();
    expect(screen.getByText('Em 2')).toBeDefined();
  });
});
