import React from 'react';
import { QuickPollStudentView } from '@educlass/activity-quick-poll';
import { QuizLiveStudentView } from '@educlass/activity-quiz-live';
import { ExamStudentView } from '@educlass/activity-exam';
import { SwissDuelStudentView } from '@educlass/activity-swiss-duel';
import { PdfPresenterStudentView } from '@educlass/activity-pdf-presenter';
import { ObjectCameraStudentView } from '@educlass/activity-object-camera';
import { TerritoryStudentView } from '@educlass/activity-territory-war';
import { ProjectGradingStudentView } from '@educlass/activity-project-grading';
import { ArcadeDuelStudentView } from '@educlass/activity-arcade-duel';
import { InteractiveBoardStudentView } from '@educlass/activity-interactive-board';
import { CircuitStudentView } from '@educlass/activity-circuit-race';

export interface ActiveActivityData<St = unknown> {
  runId: string;
  activityId: string;
  state: St;
}

export interface ActivityHostProps {
  activeActivity: ActiveActivityData | null;
  participantId: string;
  studentName?: string | undefined;
  onSendIntent: (intent: unknown) => void;
  onSwitchStudent?: (() => void) | undefined;
  isSessionClosed?: boolean;
}

export interface StudentViewComponentProps<St = unknown> {
  runId: string;
  state: St;
  participantId: string;
  studentName?: string | undefined;
  onSendIntent: (intent: unknown) => void;
  onSwitchStudent?: (() => void) | undefined;
}

// Bảng ánh xạ các Student View tương ứng với activityId
const studentViewRegistry: Record<
  string,
  React.ComponentType<StudentViewComponentProps<never>>
> = {
  'quick-poll': QuickPollStudentView as unknown as React.ComponentType<StudentViewComponentProps<never>>,
  'quiz-live': QuizLiveStudentView as unknown as React.ComponentType<StudentViewComponentProps<never>>,
  'exam': ExamStudentView as unknown as React.ComponentType<StudentViewComponentProps<never>>,
  'swiss-duel': SwissDuelStudentView as unknown as React.ComponentType<StudentViewComponentProps<never>>,
  'pdf-presenter': PdfPresenterStudentView as unknown as React.ComponentType<StudentViewComponentProps<never>>,
  'object-camera': ObjectCameraStudentView as unknown as React.ComponentType<StudentViewComponentProps<never>>,
  'territory-war': TerritoryStudentView as unknown as React.ComponentType<StudentViewComponentProps<never>>,
  'project-grading': ProjectGradingStudentView as unknown as React.ComponentType<StudentViewComponentProps<never>>,
  'arcade-duel': ArcadeDuelStudentView as unknown as React.ComponentType<StudentViewComponentProps<never>>,
  'interactive-board': InteractiveBoardStudentView as unknown as React.ComponentType<StudentViewComponentProps<never>>,
  'circuit-race': CircuitStudentView as unknown as React.ComponentType<StudentViewComponentProps<never>>,
};

/**
 * Đăng ký thêm Client Student View mới vào ActivityHost
 */
export function registerStudentView(
  activityId: string,
  viewComponent: React.ComponentType<StudentViewComponentProps<never>>
): void {
  studentViewRegistry[activityId] = viewComponent;
}


/**
 * ActivityHost - Khung chứa hoạt động dành cho Học sinh (mobile-first, viewport 360x640)
 */
export const ActivityHost: React.FC<ActivityHostProps> = ({
  activeActivity,
  participantId,
  studentName,
  onSendIntent,
  onSwitchStudent,
  isSessionClosed = false,
}) => {
  if (isSessionClosed) {
    return (
      <div
        className="p-6 text-center space-y-4 max-w-sm mx-auto"
        data-testid="activity-host-closed"
      >
        <div className="text-5xl">🏁</div>
        <h2 className="text-xl font-bold text-gray-800">Tiết học đã kết thúc</h2>
        <p className="text-base text-gray-600">
          Cảm ơn bạn đã tham gia tiết học sôi nổi!
        </p>
      </div>
    );
  }

  // Trạng thái chờ khi chưa có hoạt động nào được khởi chạy
  if (!activeActivity) {
    return (
      <div
        className="p-6 text-center space-y-4 max-w-sm mx-auto my-auto py-12"
        data-testid="activity-host-idle"
      >
        <div className="w-20 h-20 mx-auto rounded-full bg-blue-50 border-2 border-blue-100 flex items-center justify-center text-4xl animate-pulse">
          🎯
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-gray-800">Đang chờ hoạt động mới</h2>
          <p className="text-base text-gray-600">
            Thầy/cô đang chuẩn bị trò chơi hoặc câu hỏi. Bạn hãy sẵn sàng nhé!
          </p>
        </div>
      </div>
    );
  }

  const ViewComponent = studentViewRegistry[activeActivity.activityId] as
    | React.ComponentType<StudentViewComponentProps<unknown>>
    | undefined;

  if (!ViewComponent) {
    return (
      <div
        className="p-6 text-center space-y-3 max-w-sm mx-auto"
        data-testid="activity-host-unsupported"
      >
        <div className="text-4xl">⚠️</div>
        <h3 className="text-lg font-bold text-red-600">Hoạt động chưa được hỗ trợ</h3>
        <p className="text-sm text-gray-600">
          Hoạt động <code>{activeActivity.activityId}</code> chưa có giao diện trên thiết bị này.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[300px]" data-testid="activity-host-running">
      <ViewComponent
        runId={activeActivity.runId}
        state={activeActivity.state}
        participantId={participantId}
        studentName={studentName}
        onSendIntent={onSendIntent}
        {...(onSwitchStudent ? { onSwitchStudent } : {})}
      />
    </div>
  );
};
