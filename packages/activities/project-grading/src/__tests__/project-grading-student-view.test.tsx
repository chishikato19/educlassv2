// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ProjectGradingState } from '@educlass/protocol';
import { ProjectGradingStudentView } from '../components/ProjectGradingStudentView.js';

describe('ProjectGradingStudentView Component', () => {
  const baseState: ProjectGradingState = {
    status: 'grading',
    config: {
      title: 'Đánh giá Dự án AI',
      maxScore: 10,
      stepScore: 0.1,
      weights: {
        self: 10,
        teamMember: 20,
        crossTeam: 20,
        teacher: 50,
      },
      groups: [
        {
          id: 'group-1',
          name: 'Tổ 1',
          leaderParticipantId: 'leader-1',
          leaderDisplayName: 'Nguyễn Văn Leader',
          memberParticipantIds: ['leader-1', 'member-1', 'member-2'],
        },
        {
          id: 'group-2',
          name: 'Tổ 2',
          leaderParticipantId: 'leader-2',
          leaderDisplayName: 'Trần Thị Nhóm Trưởng',
          memberParticipantIds: ['leader-2', 'member-3'],
        },
      ],
      allowFeedbackComment: true,
    },
    selfGrades: {},
    teamMemberGrades: {},
    crossTeamGrades: {},
    teacherGroupGrades: {},
    teacherStudentGrades: {},
  };

  it('1. Hiển thị form tự chấm cho thành viên bình thường', () => {
    const handleSendIntent = vi.fn();
    render(
      <ProjectGradingStudentView
        runId="run-1"
        state={baseState}
        participantId="member-1"
        onSendIntent={handleSendIntent}
      />
    );

    expect(screen.getByText('Đánh giá Dự án AI')).toBeDefined();
    expect(screen.getByText(/Tổ 1/)).toBeDefined();
    expect(screen.getByText('Thành viên')).toBeDefined();
    expect(screen.getByTestId('section-self-grading')).toBeDefined();
    // Không có tabs nhóm trưởng
    expect(screen.queryByTestId('tab-member-grading')).toBeNull();
  });

  it('2. Thành viên tự chấm điểm và lưu', () => {
    const handleSendIntent = vi.fn();
    render(
      <ProjectGradingStudentView
        runId="run-1"
        state={baseState}
        participantId="member-1"
        onSendIntent={handleSendIntent}
      />
    );

    const inputScore = screen.getByTestId('input-self-score');
    fireEvent.change(inputScore, { target: { value: '9.5' } });

    const inputComment = screen.getByTestId('input-self-comment');
    fireEvent.change(inputComment, { target: { value: 'Em đóng góp tốt phần code' } });

    const btnSave = screen.getByTestId('btn-save-self-grade');
    fireEvent.click(btnSave);

    expect(handleSendIntent).toHaveBeenCalledWith({
      type: 'submit_self_grade',
      score: 9.5,
      comment: 'Em đóng góp tốt phần code',
    });

    // Sau khi lưu hiện nút Kiosk đổi học sinh khác
    expect(screen.getByTestId('btn-kiosk-switch-after-self')).toBeDefined();
  });

  it('3. Nhóm trưởng hiển thị đầy đủ 3 Tab chấm điểm', () => {
    const handleSendIntent = vi.fn();
    render(
      <ProjectGradingStudentView
        runId="run-1"
        state={baseState}
        participantId="leader-1"
        onSendIntent={handleSendIntent}
      />
    );

    expect(screen.getByText('⭐ Nhóm trưởng')).toBeDefined();
    expect(screen.getByTestId('tab-self-grading')).toBeDefined();
    expect(screen.getByTestId('tab-member-grading')).toBeDefined();
    expect(screen.getByTestId('tab-cross-grading')).toBeDefined();
  });

  it('4. Nhóm trưởng chuyển sang Tab Thành viên và chấm điểm', () => {
    const handleSendIntent = vi.fn();
    render(
      <ProjectGradingStudentView
        runId="run-1"
        state={baseState}
        participantId="leader-1"
        onSendIntent={handleSendIntent}
      />
    );

    // Chuyển sang Tab Thành viên
    fireEvent.click(screen.getByTestId('tab-member-grading'));
    expect(screen.getByTestId('section-member-grading')).toBeDefined();

    // Bấm lưu điểm cho member-1
    const btnSaveMember = screen.getByTestId('btn-save-member-member-1');
    fireEvent.click(btnSaveMember);

    expect(handleSendIntent).toHaveBeenCalledWith({
      type: 'submit_team_member_grade',
      memberParticipantId: 'member-1',
      score: 8,
      comment: undefined,
    });
  });

  it('5. Nhóm trưởng chuyển sang Tab Chấm chéo và chấm nhóm bạn', () => {
    const handleSendIntent = vi.fn();
    render(
      <ProjectGradingStudentView
        runId="run-1"
        state={baseState}
        participantId="leader-1"
        onSendIntent={handleSendIntent}
      />
    );

    // Chuyển sang Tab Nhóm bạn
    fireEvent.click(screen.getByTestId('tab-cross-grading'));
    expect(screen.getByTestId('section-cross-grading')).toBeDefined();

    // Chấm điểm cho Tổ 2
    const btnSaveCross = screen.getByTestId('btn-save-cross-group-2');
    fireEvent.click(btnSaveCross);

    expect(handleSendIntent).toHaveBeenCalledWith({
      type: 'submit_cross_team_grade',
      targetGroupId: 'group-2',
      score: 8,
      comment: undefined,
    });
  });

  it('6. Hiển thị thông báo khi học sinh chưa được phân nhóm', () => {
    render(
      <ProjectGradingStudentView
        runId="run-1"
        state={baseState}
        participantId="unassigned-student"
        onSendIntent={vi.fn()}
      />
    );

    expect(screen.getByText('Chưa được phân nhóm')).toBeDefined();
    expect(screen.getByTestId('btn-kiosk-switch-unassigned')).toBeDefined();
  });

  it('7. Kiosk Mode: Bấm nút đổi học sinh mở modal xác nhận và kích hoạt onSwitchStudent', () => {
    const handleSwitchStudent = vi.fn();
    render(
      <ProjectGradingStudentView
        runId="run-1"
        state={baseState}
        participantId="member-1"
        onSendIntent={vi.fn()}
        onSwitchStudent={handleSwitchStudent}
      />
    );

    const btnSwitch = screen.getByTestId('btn-bottom-switch-student');
    fireEvent.click(btnSwitch);

    expect(screen.getByText('🔁 Đổi học sinh khác')).toBeDefined();
    const btnConfirm = screen.getByTestId('btn-confirm-switch-student');
    fireEvent.click(btnConfirm);

    expect(handleSwitchStudent).toHaveBeenCalled();
  });

  it('8. Hiển thị cảnh báo khi giáo viên khóa chấm điểm', () => {
    const frozenState: ProjectGradingState = {
      ...baseState,
      status: 'frozen',
    };

    render(
      <ProjectGradingStudentView
        runId="run-1"
        state={frozenState}
        participantId="member-1"
        onSendIntent={vi.fn()}
      />
    );

    expect(screen.getByText(/Thầy cô đã tạm khóa lượt chấm/)).toBeDefined();
  });
});
