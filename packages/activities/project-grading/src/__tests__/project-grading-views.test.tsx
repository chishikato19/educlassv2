// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ProjectGradingState } from '@educlass/protocol';
import {
  ProjectGradingProjectorView,
  ProjectGradingTeacherPanel,
} from '../index.js';

describe('ProjectGrading UI Views (@educlass/activity-project-grading)', () => {
  const sampleState: ProjectGradingState = {
    status: 'grading',
    config: {
      title: 'Báo cáo Dự án STEM Lớp 10A1',
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
          id: 'group_1',
          name: 'Nhóm Tên Lửa',
          leaderParticipantId: 'p_1',
          leaderDisplayName: 'Nguyễn Văn A',
          memberParticipantIds: ['p_1', 'p_2'],
        },
        {
          id: 'group_2',
          name: 'Nhóm Robot',
          leaderParticipantId: 'p_3',
          leaderDisplayName: 'Trần Thị B',
          memberParticipantIds: ['p_3', 'p_4'],
        },
      ],
      allowFeedbackComment: true,
    },
    selfGrades: {
      p_1: { score: 9.5, comment: 'Đã hoàn thành', updatedAt: 100 },
    },
    teamMemberGrades: {
      p_1: {
        p_2: { score: 9.0, comment: 'Tốt', updatedAt: 100 },
      },
    },
    crossTeamGrades: {
      p_3: {
        group_1: { score: 8.5, comment: 'Mô hình đẹp', updatedAt: 100 },
      },
    },
    teacherGroupGrades: {
      group_1: { score: 9.0, updatedAt: 100 },
    },
    teacherStudentGrades: {},
  };

  it('renders ProjectGradingTeacherPanel with progress gauges and actions', () => {
    const handleSendIntent = vi.fn();
    const handleEndActivity = vi.fn();

    render(
      <ProjectGradingTeacherPanel
        runId="run_1"
        state={sampleState}
        onSendIntent={handleSendIntent}
        onEndActivity={handleEndActivity}
      />
    );

    // Title and status badge
    expect(screen.getByText('Báo cáo Dự án STEM Lớp 10A1')).toBeDefined();
    expect(screen.getByText(/Đang mở chấm/)).toBeDefined();

    // Progress metrics
    expect(screen.getByText(/Học sinh tự chấm/)).toBeDefined();
    expect(screen.getByText(/Tổ chấm thành viên/)).toBeDefined();
    expect(screen.getByText(/Chấm chéo nhóm bạn/)).toBeDefined();
    expect(screen.getByText(/Điểm Giáo viên/)).toBeDefined();

    // Toggle lock button
    const lockBtn = screen.getByTestId('btn-toggle-grading-lock');
    fireEvent.click(lockBtn);
    expect(handleSendIntent).toHaveBeenCalledWith({
      type: 'set_grading_status',
      status: 'frozen',
    });

    // End activity button
    const endBtn = screen.getByTestId('btn-end-activity');
    fireEvent.click(endBtn);
    expect(handleEndActivity).toHaveBeenCalled();
  });

  it('allows teacher to input group grade and student override', () => {
    const handleSendIntent = vi.fn();
    const handleEndActivity = vi.fn();

    render(
      <ProjectGradingTeacherPanel
        runId="run_1"
        state={sampleState}
        onSendIntent={handleSendIntent}
        onEndActivity={handleEndActivity}
      />
    );

    // Find input for group 2 grade
    const groupInput = screen.getByTestId('input-teacher-group-group_2');
    fireEvent.change(groupInput, { target: { value: '8.8' } });

    const applyGroupBtn = screen.getByTestId('btn-teacher-save-group-group_2');
    fireEvent.click(applyGroupBtn);

    expect(handleSendIntent).toHaveBeenCalledWith({
      type: 'submit_teacher_grade',
      targetType: 'group',
      targetId: 'group_2',
      score: 8.8,
    });
  });

  it('renders ProjectGradingProjectorView in full presentation mode', () => {
    render(<ProjectGradingProjectorView runId="run_1" state={sampleState} />);

    // Project title
    expect(screen.getByText('Báo cáo Dự án STEM Lớp 10A1')).toBeDefined();

    // Groups in matrix and podium
    expect(screen.getByText('Nhóm Tên Lửa')).toBeDefined();
    expect(screen.getByText('Nhóm Robot')).toBeDefined();

    // Check weights subtitle
    expect(screen.getByText(/Tự chấm \(10%\)/)).toBeDefined();
    expect(screen.getByText(/Nhóm \(20%\)/)).toBeDefined();
    expect(screen.getByText(/Chéo \(20%\)/)).toBeDefined();
    expect(screen.getByText(/GV \(50%\)/)).toBeDefined();
  });
});
