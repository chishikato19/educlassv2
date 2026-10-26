import React, { useState } from 'react';
import { type Question, type QuestionPublic, renderLatexInText, resolveAssetUrl } from '@educlass/question-kit';
import type { ExamResult, ExamState, ParticipantExamStatus } from './exam-schemas.js';
import {
  calculateQuestionAnalysis,
  calculateScoreDistribution,
  exportExamExcelBuffer,
  type QuestionErrorAnalysisItem,
} from './exam-analytics.js';

export interface ExamTeacherPanelProps {
  runId?: string;
  state: ExamState;
  sendIntent?: (intent: unknown) => void;
  onSendIntent?: (intent: unknown) => void;
  onEnd?: () => void;
  onEndActivity?: () => void;
}

export interface ExamStudentViewProps {
  runId?: string;
  state: ExamState;
  participantId: string;
  sendIntent?: (intent: unknown) => void;
  onSendIntent?: (intent: unknown) => void;
}

/**
 * Giao diện Giáo viên: Điều khiển và giám sát Kỳ thi
 */
export const ExamTeacherPanel: React.FC<ExamTeacherPanelProps> = ({
  state,
  sendIntent,
  onSendIntent,
  onEnd,
  onEndActivity,
}) => {
  const [extending, setExtending] = useState(false);
  const [viewMode, setViewMode] = useState<'monitor' | 'report'>(() =>
    state?.status === 'closed' ? 'report' : 'monitor'
  );
  const [filterTab, setFilterTab] = useState<'all' | 'in_progress' | 'submitted' | 'alerts'>('all');
  const [searchName, setSearchName] = useState('');
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [selectedStudentForReview, setSelectedStudentForReview] = useState<ParticipantExamStatus | null>(null);

  const doSend = sendIntent || onSendIntent || (() => {});
  const doEnd = onEnd || onEndActivity;

  // Cập nhật currentTime mỗi 2 giây để tính thời gian đứng im (Idle)
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const participants: ParticipantExamStatus[] = Object.values(state?.participants ?? {});
  const totalCount = participants.length;
  const submittedCount = participants.filter(p => p.isSubmitted).length;
  const activeCount = participants.filter(p => p.authenticated && !p.isSubmitted).length;

  // Đếm số thí sinh có cảnh báo (mất focus hoặc đứng im >= 2 phút khi chưa nộp)
  const alertCount = participants.filter(p => {
    if (p.isSubmitted) return false;
    const focusAlert = (p.focusLostCount ?? 0) > 0 || p.isFocusLost;
    const idleSeconds = p.lastActiveAt ? Math.floor((currentTime - p.lastActiveAt) / 1000) : 0;
    const idleAlert = idleSeconds >= 120;
    return focusAlert || idleAlert;
  }).length;

  const handleOpenExam = () => {
    doSend({ type: 'open_exam' });
  };

  const handleCloseExam = () => {
    doSend({ type: 'close_exam' });
  };

  const handleExtendTime = (mins: number) => {
    setExtending(true);
    doSend({ type: 'extend_time', addMinutes: mins });
    setTimeout(() => setExtending(false), 500);
  };

  const handleForceSubmit = (participantId: string, studentName: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn thu bài hộ cho thí sinh "${studentName}" không?`)) {
      doSend({
        type: 'force_submit_student',
        participantId,
      });
    }
  };

  const handleExtendStudentTime = (participantId: string, mins = 5) => {
    doSend({
      type: 'extend_student_time',
      participantId,
      addMinutes: mins,
    });
  };

  // Tính toán kết quả và báo cáo kỳ thi
  const effectiveResults: ExamResult[] =
    state?.results && state.results.length > 0
      ? state.results
      : Object.values(state?.participants || {}).map((p, idx) => ({
          participantId: p.participantId,
          displayName: p.displayName,
          score: p.progressPercent ? Math.round((p.progressPercent / 10) * 10) / 10 : 0,
          maxScore: 10,
          percentage: p.progressPercent ?? 0,
          correctCount: p.answeredCount ?? 0,
          totalQuestions: state?.totalQuestions || 1,
          rank: idx + 1,
          submittedAt: p.submittedAt ?? null,
        }));

  const overviewReport = calculateScoreDistribution(effectiveResults);
  const questionErrors =
    state?.questionAnalysis && state.questionAnalysis.length > 0
      ? (state.questionAnalysis as unknown as QuestionErrorAnalysisItem[])
      : calculateQuestionAnalysis(
          (state?.publicQuestions || []) as unknown as Question[],
          state?.participants || {}
        );

  const handleExportExcel = () => {
    try {
      const questions = (state?.publicQuestions || []) as unknown as Question[];
      const buffer = exportExamExcelBuffer({
        examTitle: state?.title || 'Kỳ thi',
        durationMinutes: state?.durationMinutes,
        questions,
        results: effectiveResults,
        participants: state?.participants || {},
        questionAnalysis: questionErrors,
      });

      const blob = new Blob([buffer as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bao-cao-ky-thi-${(state?.title || 'exam')
        .toLowerCase()
        .replace(/\s+/g, '-')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Lỗi xuất Excel kỳ thi:', err);
    }
  };

  // Lọc danh sách thí sinh theo Tab và Tên tìm kiếm
  const filteredParticipants = participants.filter(p => {
    if (searchName.trim()) {
      const match = p.displayName.toLowerCase().includes(searchName.trim().toLowerCase());
      if (!match) return false;
    }

    if (filterTab === 'in_progress') {
      return p.authenticated && !p.isSubmitted;
    }
    if (filterTab === 'submitted') {
      return p.isSubmitted;
    }
    if (filterTab === 'alerts') {
      if (p.isSubmitted) return false;
      const focusAlert = (p.focusLostCount ?? 0) > 0 || p.isFocusLost;
      const idleSeconds = p.lastActiveAt ? Math.floor((currentTime - p.lastActiveAt) / 1000) : 0;
      return focusAlert || idleSeconds >= 120;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-5 p-5 bg-white rounded-2xl shadow-sm border border-slate-100">
      {/* 1. Tiêu đề & Thông tin cơ bản */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📝</span>
            <h3 className="text-xl font-bold text-slate-800">{state?.title || 'Kỳ thi'}</h3>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                state?.status === 'in_progress'
                  ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300'
                  : state?.status === 'closed'
                  ? 'bg-slate-100 text-slate-600 ring-1 ring-slate-300'
                  : 'bg-amber-100 text-amber-800 ring-1 ring-amber-300'
              }`}
            >
              {state?.status === 'in_progress'
                ? 'Đang làm bài'
                : state?.status === 'closed'
                ? 'Đã kết thúc'
                : 'Chờ bắt đầu'}
            </span>
            {state?.batchIndex && (
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                Ca {state.batchIndex}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 mt-2.5 leading-relaxed">
            Thời lượng: <strong>{state?.durationMinutes} phút</strong> · Tổng số câu: <strong>{state?.totalQuestions}</strong>
            {state?.hasPassword && ' · Có mật khẩu bảo vệ'}
            {state?.shuffleQuestions && ' · Xáo câu hỏi'}
            {state?.shuffleOptions && ' · Xáo đáp án'}
          </p>
        </div>

        {/* Nút điều khiển chung */}
        {/* Nút điều khiển chung */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {state?.status === 'ready' && (
            <button
              type="button"
              onClick={handleOpenExam}
              style={{ whiteSpace: 'nowrap', flexShrink: 0, minHeight: '44px' }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition shadow-sm cursor-pointer flex items-center gap-2"
            >
              <span>🚀</span>
              <span>Mở đề & Bắt đầu tính giờ</span>
            </button>
          )}

          {state?.status === 'in_progress' && (
            <>
              <button
                type="button"
                onClick={() => handleExtendTime(5)}
                disabled={extending}
                style={{
                  backgroundColor: '#FFFBEB',
                  color: '#92400E',
                  border: '1px solid #FCD34D',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
                className="transition hover:bg-amber-100"
              >
                <span>⏱️</span>
                <span>+5 phút (Toàn lớp)</span>
              </button>
              <button
                type="button"
                onClick={handleCloseExam}
                style={{
                  backgroundColor: '#E11D48',
                  color: '#FFFFFF',
                  border: '1px solid #BE123C',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
                className="transition hover:bg-rose-700 shadow-sm"
              >
                <span>🔒</span>
                <span>Thu bài & Khóa thi</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const batchNum = state?.batchIndex ?? 1;
                  if (
                    window.confirm(
                      `🏁 Thầy/Cô có chắc chắn muốn kết thúc Ca ${batchNum} của tiết học này không?\n\n` +
                      `Hệ thống sẽ tự động thu bài của toàn bộ thí sinh, lưu kết quả an toàn vào sổ điểm và chuyển sang trạng thái chờ Ca ${batchNum + 1} ở tiết sau.`
                    )
                  ) {
                    handleCloseExam();
                    if (doEnd) {
                      doEnd();
                    }
                  }
                }}
                style={{
                  backgroundColor: '#4F46E5',
                  color: '#FFFFFF',
                  border: '1px solid #4338CA',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)',
                }}
                className="transition hover:bg-indigo-700"
                title={`Kết thúc Ca ${state?.batchIndex ?? 1} của tiết học này và lưu điểm vào hệ thống`}
              >
                <span>🏁</span>
                <span>Kết thúc Ca {state?.batchIndex ?? 1}</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleExportExcel}
            style={{
              backgroundColor: '#059669',
              color: '#FFFFFF',
              border: '1px solid #047857',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
            }}
            className="transition hover:bg-emerald-700 shadow-sm"
            title="Xuất bảng điểm, phân tích câu hỏi và ma trận làm bài sang file Excel"
          >
            <span>📥</span>
            <span>Xuất Excel (.xlsx)</span>
          </button>

          {doEnd && (
            <button
              type="button"
              onClick={() => {
                if (state?.status === 'in_progress') {
                  const batchNum = state?.batchIndex ?? 1;
                  if (
                    window.confirm(
                      `⚠️ Ca ${batchNum} của kỳ thi đang diễn ra!\n\n` +
                      `Thầy/Cô có chắc chắn muốn kết thúc ca thi này và trở về bàn làm việc không?\n\n` +
                      `Toàn bộ bài nộp của học sinh sẽ được thu và lưu an toàn vào hệ thống.`
                    )
                  ) {
                    handleCloseExam();
                    doEnd();
                  }
                } else {
                  doEnd();
                }
              }}
              style={{
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                border: '1px solid #020617',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
              }}
              className="transition hover:bg-black shadow-sm"
            >
              <span>⏹️</span>
              <span>{state?.status === 'closed' ? 'Trở về bàn làm việc' : `Kết thúc Ca ${state?.batchIndex ?? 1} & Trở về`}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Thống kê sĩ số & Cảnh báo nhanh */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 text-center">
          <div className="text-2xl font-black text-slate-800">{totalCount}</div>
          <div className="text-xs text-slate-500 font-medium mt-0.5">Thí sinh trong phòng</div>
        </div>
        <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200/60 text-center">
          <div className="text-2xl font-black text-blue-700">{activeCount}</div>
          <div className="text-xs text-blue-600 font-medium mt-0.5">Đang làm bài</div>
        </div>
        <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200/60 text-center">
          <div className="text-2xl font-black text-emerald-700">{submittedCount}</div>
          <div className="text-xs text-emerald-600 font-medium mt-0.5">Đã nộp bài</div>
        </div>
        <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200/60 text-center">
          <div className="text-2xl font-black text-amber-700">{alertCount}</div>
          <div className="text-xs text-amber-700 font-medium mt-0.5">Có cảnh báo (Focus/Idle)</div>
        </div>
      </div>

      {/* 2.5 Thanh chuyển đổi Tab & Nút xuất Excel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('monitor')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 transition ${
              viewMode === 'monitor'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>📋</span> Giám sát phòng thi
          </button>
          <button
            onClick={() => setViewMode('report')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 transition ${
              viewMode === 'report'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>📊</span> Báo cáo & Phổ điểm
          </button>
        </div>

        <button
          onClick={handleExportExcel}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs w-fit"
        >
          <span>📥</span> Xuất Excel (.xlsx)
        </button>
      </div>

      {viewMode === 'monitor' ? (
        /* 3. Bảng Giám sát Live chi tiết từng thí sinh (Task 4.3) */
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
          {/* Thanh lọc & tìm kiếm */}
          <div className="p-3 bg-slate-50 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Tabs bộ lọc */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
              <button
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filterTab === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Tất cả ({totalCount})
              </button>
              <button
                onClick={() => setFilterTab('in_progress')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filterTab === 'in_progress'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Đang làm ({activeCount})
              </button>
              <button
                onClick={() => setFilterTab('submitted')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filterTab === 'submitted'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Đã nộp ({submittedCount})
              </button>
              <button
                onClick={() => setFilterTab('alerts')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                  filterTab === 'alerts'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200'
                }`}
              >
                <span>⚠️ Cảnh báo</span>
                <span>({alertCount})</span>
              </button>
            </div>

            {/* Ô tìm kiếm tên */}
            <div className="relative">
              <input
                type="text"
                value={searchName}
                onChange={e => setSearchName(e.target.value)}
                placeholder="Tìm kiếm thí sinh..."
                className="px-3 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 w-full sm:w-48"
              />
            </div>
          </div>

          {/* Danh sách giám sát thời gian thực */}
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {filteredParticipants.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                Không có thí sinh nào phù hợp với bộ lọc hiện tại.
              </div>
            ) : (
              filteredParticipants.map(p => {
                const answersCount = p.answeredCount ?? Object.keys(p.answers || {}).length;
                const percent = p.progressPercent ?? (state.totalQuestions > 0 ? Math.round((answersCount / state.totalQuestions) * 100) : 0);
                const isIdle = !p.isSubmitted && p.lastActiveAt ? (currentTime - p.lastActiveAt >= 120000) : false;
                const idleMinutes = p.lastActiveAt ? Math.floor((currentTime - p.lastActiveAt) / 60000) : 0;

                return (
                  <div
                    key={p.participantId}
                    className={`p-4 mb-3 rounded-2xl border transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      p.isFocusLost
                        ? 'bg-rose-50/70 border-rose-300'
                        : isIdle
                        ? 'bg-amber-50/60 border-amber-300'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Cột 1: Thông tin học sinh */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm tracking-tight">{p.displayName}</span>
                        {p.isSubmitted ? (
                          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300">
                            ✓ Đã nộp bài
                          </span>
                        ) : p.authenticated ? (
                          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-800 ring-1 ring-blue-300">
                            ✎ Đang làm bài
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-800 ring-1 ring-amber-300">
                            🔒 Chưa mở đề
                          </span>
                        )}
                        {(p.extendedMinutes ?? 0) > 0 && (
                          <span className="px-2 py-1 rounded-md text-xs font-bold bg-purple-100 text-purple-700">
                            +{p.extendedMinutes} phút
                          </span>
                        )}
                      </div>

                      {/* Câu đang làm & Tiến độ % hoàn thành */}
                      <div className="flex items-center gap-3.5 mt-2.5 text-xs text-slate-500 flex-wrap">
                        <span>
                          Đang làm:{' '}
                          <strong className="text-slate-800 font-bold">
                            {p.currentQuestionIndex !== null && p.currentQuestionIndex !== undefined
                              ? `Câu ${p.currentQuestionIndex + 1}/${state.totalQuestions}`
                              : '—'}
                          </strong>
                        </span>
                        <span className="text-slate-300">|</span>
                        <div className="flex items-center gap-2">
                          <span>Tiến độ: <strong className="text-slate-800 font-bold">{answersCount}/{state.totalQuestions}</strong> ({percent}%)</span>
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div
                              className="h-full bg-blue-600 rounded-full transition-all duration-300"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Cột 2: Cảnh báo Mất focus & Đứng im (Live Telemetry) */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {/* Cảnh báo mất focus */}
                      {p.isFocusLost ? (
                        <span className="px-3 py-1.5 rounded-xl bg-rose-100 text-rose-800 font-bold animate-pulse flex items-center gap-1.5 border border-rose-300">
                          <span>🔴</span> Đang rời màn hình!
                        </span>
                      ) : (p.focusLostCount ?? 0) > 0 ? (
                        <span className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center gap-1.5 border border-amber-300">
                          <span>⚠️</span> Rời màn hình: {p.focusLostCount} lần
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-50 text-slate-500 font-medium hidden sm:inline border border-slate-100">
                          ✓ Focus ổn định
                        </span>
                      )}

                      {/* Cảnh báo đứng im (Idle) */}
                      {isIdle && (
                        <span className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center gap-1.5 border border-amber-300">
                          <span>💤</span> Đứng im {idleMinutes}p
                        </span>
                      )}
                    </div>

                    {/* Cột 3: Nút can thiệp & Xem bài làm */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedStudentForReview(p)}
                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs border border-blue-200 transition flex items-center gap-1 cursor-pointer"
                        title="Xem trực tiếp bài làm của thí sinh"
                      >
                        <span>👁️</span>
                        <span>Xem bài</span>
                      </button>

                      {!p.isSubmitted && p.authenticated && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleExtendStudentTime(p.participantId, 5)}
                            className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold rounded-lg text-xs border border-purple-200 transition cursor-pointer flex items-center gap-1"
                            title="Cộng thêm 5 phút riêng cho thí sinh này"
                          >
                            <span>⏱️</span>
                            <span>+5 phút</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleForceSubmit(p.participantId, p.displayName)}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg text-xs border border-rose-200 transition cursor-pointer flex items-center gap-1"
                            title="Chủ động thu bài của thí sinh"
                          >
                            <span>🔒</span>
                            <span>Thu bài</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* 4. Tab Báo cáo chuyên sâu: Phổ điểm & Tỷ lệ sai từng câu (Task 4.4) */
        <div className="flex flex-col gap-5">
          {/* 4.1 Thẻ chỉ số tổng quan */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200/70 text-center">
              <div className="text-2xl font-black text-blue-800">{overviewReport.averageScore}</div>
              <div className="text-xs text-blue-600 font-semibold mt-0.5">Điểm trung bình</div>
            </div>
            <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/70 text-center">
              <div className="text-2xl font-black text-emerald-800">{overviewReport.highestScore}</div>
              <div className="text-xs text-emerald-600 font-semibold mt-0.5">Điểm cao nhất</div>
            </div>
            <div className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-200/70 text-center">
              <div className="text-2xl font-black text-rose-800">{overviewReport.lowestScore}</div>
              <div className="text-xs text-rose-600 font-semibold mt-0.5">Điểm thấp nhất</div>
            </div>
            <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/70 text-center">
              <div className="text-2xl font-black text-amber-800">{overviewReport.passRate}%</div>
              <div className="text-xs text-amber-700 font-semibold mt-0.5">
                Tỷ lệ đạt ({overviewReport.passCount}/{overviewReport.totalParticipants})
              </div>
            </div>
          </div>

          {/* 4.2 Biểu đồ Phổ điểm (Score Distribution) */}
          <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <span>📈</span> Phổ điểm kỳ thi (Phân bố điểm số)
              </h4>
              <span className="text-xs text-slate-500">
                Tổng: {overviewReport.totalParticipants} thí sinh
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {overviewReport.buckets.map(b => (
                <div key={b.id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700">{b.label}</span>
                    <span className="text-slate-500">
                      <strong>{b.count}</strong> em ({b.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-200/70 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${b.percentage}%`,
                        backgroundColor: b.color,
                      }}
                    />
                  </div>
                  {b.studentNames.length > 0 && (
                    <div className="text-[11px] text-slate-400 truncate">
                      Danh sách: {b.studentNames.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 4.3 Phân tích tỷ lệ sai từng câu hỏi */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <span>🎯</span> Phân tích câu hỏi (Tỷ lệ làm sai)
              </h4>
              <span className="text-xs text-slate-500 font-medium">
                {questionErrors.length} câu hỏi
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {questionErrors.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Chưa có dữ liệu câu hỏi.
                </div>
              ) : (
                [...questionErrors]
                  .sort((a, b) => b.errorRate - a.errorRate)
                  .map(q => {
                    const isHighError = q.errorRate >= 50;
                    return (
                      <div
                        key={q.questionId}
                        className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                          isHighError ? 'bg-rose-50/30' : 'bg-white'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-700">Câu {q.order}</span>
                            <span className="text-xs text-slate-500 truncate max-w-md">
                              {q.stemText || `Mã: ${q.questionId}`}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5 py-0.5 rounded bg-slate-100">
                              {q.type}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs shrink-0">
                          <span className="text-slate-500">
                            Đúng: <strong className="text-emerald-600">{q.correctCount}</strong>
                          </span>
                          <span className="text-slate-500">
                            Sai: <strong className="text-rose-600">{q.incorrectCount}</strong>
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                              isHighError
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            Tỷ lệ sai: {q.errorRate}%
                          </span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* 4.4 Bảng xếp hạng điểm số thí sinh */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <span>🏆</span> Bảng điểm thí sinh
              </h4>
              <span className="text-xs text-slate-500 font-medium">
                {effectiveResults.length} bài thi
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {effectiveResults.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Chưa có kết quả thi.
                </div>
              ) : (
                effectiveResults.map((res, idx) => (
                  <div
                    key={res.participantId}
                    className="p-3 flex items-center justify-between gap-2 bg-white hover:bg-slate-50 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-black text-slate-600 w-6 text-center">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </span>
                      <span className="font-bold text-slate-800">{res.displayName}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">
                        Đúng: <strong>{res.correctCount}/{res.totalQuestions}</strong>
                      </span>
                      <span className="text-sm font-black text-blue-600">
                        {res.score}/{res.maxScore}
                      </span>
                      <span className="px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
                        {res.percentage}%
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const target = state.participants?.[res.participantId];
                          if (target) setSelectedStudentForReview(target);
                        }}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs border border-blue-200 transition cursor-pointer"
                        title="Xem trực tiếp bài làm của thí sinh này"
                      >
                        👁️ Xem bài
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Xem trực tiếp kết quả bài làm của từng học sinh (Vấn đề 7) */}
      {selectedStudentForReview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">📝</span>
                  <h3 className="font-bold text-slate-800 text-base">
                    Chi tiết bài làm: {selectedStudentForReview.displayName}
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    selectedStudentForReview.isSubmitted
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedStudentForReview.isSubmitted ? 'Đã nộp bài' : 'Đang làm bài'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                  <span>Tiến độ: <strong>{selectedStudentForReview.answeredCount ?? Object.keys(selectedStudentForReview.answers || {}).length}/{state.totalQuestions}</strong> câu</span>
                  {selectedStudentForReview.result && (
                    <span>Điểm: <strong className="text-blue-600">{selectedStudentForReview.result.score}/{selectedStudentForReview.result.maxScore}</strong> ({selectedStudentForReview.result.percentage}%)</span>
                  )}
                  {selectedStudentForReview.submittedAt && (
                    <span>Nộp lúc: {new Date(selectedStudentForReview.submittedAt).toLocaleTimeString('vi-VN')}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentForReview(null)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Danh sách câu hỏi */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {selectedStudentForReview.reviewData && selectedStudentForReview.reviewData.length > 0 ? (
                // Nếu server đã sinh reviewData
                selectedStudentForReview.reviewData.map((revItem, idx: number) => {
                  const rev = revItem as Record<string, unknown>;
                  return (
                  <div
                    key={String(rev['questionId'] || idx)}
                    className={`p-4 rounded-xl border shadow-xs ${
                      rev['isCorrect']
                        ? 'bg-emerald-50/50 border-emerald-300'
                        : rev['studentAnswer'] !== undefined && rev['studentAnswer'] !== null && rev['studentAnswer'] !== ''
                        ? 'bg-rose-50/50 border-rose-300'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold mb-2">
                      <span className="text-slate-800 font-extrabold">Câu {String(rev['order'] || idx + 1)} ({String(rev['points'] || 1)} điểm)</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        rev['isCorrect']
                          ? 'bg-emerald-100 text-emerald-800'
                          : rev['studentAnswer'] !== undefined && rev['studentAnswer'] !== null && rev['studentAnswer'] !== ''
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {rev['isCorrect'] ? '✓ Đúng' : (rev['studentAnswer'] !== undefined && rev['studentAnswer'] !== null && rev['studentAnswer'] !== '' ? '✗ Sai' : '⚪ Chưa làm')}
                      </span>
                    </div>

                    {/* Nội dung câu hỏi hỗ trợ KaTeX */}
                    <div
                      className="text-sm font-semibold text-slate-900 mb-2 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: renderLatexInText(String(rev['stemText'] || '')) }}
                    />

                    {/* Hình ảnh đính kèm nếu có */}
                    {Array.isArray(rev['stemImages']) && (rev['stemImages'] as string[]).length > 0 && (
                      <div className="flex flex-wrap gap-2 my-2.5">
                        {(rev['stemImages'] as string[]).map((imgUrl: string, imgIdx: number) => (
                          <img
                            key={imgIdx}
                            src={resolveAssetUrl(imgUrl)}
                            alt="Hình ảnh câu hỏi"
                            className="max-h-56 max-w-full rounded-xl border border-slate-200 object-contain shadow-xs bg-white"
                          />
                        ))}
                      </div>
                    )}

                    {/* Các lựa chọn nếu là trắc nghiệm */}
                    {Boolean(rev['options']) && Array.isArray(rev['options']) && (
                      <div className="space-y-1.5 mb-2.5">
                        {(rev['options'] as Array<Record<string, unknown>>).map((opt) => {
                          const isStudentPick = rev['studentChoiceLabel'] === opt['label'] || rev['studentAnswer'] === opt['index'];
                          const isCorrectOpt = rev['correctChoiceLabel'] === opt['label'];
                          return (
                            <div
                              key={String(opt['index'])}
                              className={`p-2.5 rounded-lg text-xs flex items-center gap-2.5 border transition ${
                                isCorrectOpt
                                  ? 'bg-emerald-100/80 border-emerald-400 font-bold text-emerald-950 shadow-xs'
                                  : isStudentPick
                                  ? 'bg-rose-100/80 border-rose-400 font-bold text-rose-950 shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              <span className="w-5 h-5 rounded-full flex items-center justify-center bg-slate-200/90 font-bold text-[11px] shrink-0">
                                {String(opt['label'] || '')}
                              </span>
                              <span
                                className="flex-1 leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: renderLatexInText(String(opt['text'] || '')) }}
                              />
                              {isCorrectOpt && <span className="text-emerald-700 text-xs font-extrabold shrink-0">✓ Đáp án đúng</span>}
                              {isStudentPick && !isCorrectOpt && <span className="text-rose-700 text-xs font-extrabold shrink-0">✗ Đã chọn</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Nếu không có options (câu đúng/sai hoặc câu ngắn) */}
                    {(!rev['options'] || !Array.isArray(rev['options'])) && (
                      <div className="text-xs space-y-1.5 bg-white p-3 rounded-lg border border-slate-200">
                        <div>HS đã chọn: <strong>{String(rev['studentAnswer'] ?? 'Chưa làm')}</strong></div>
                        <div className="text-emerald-700 font-semibold">Đáp án đúng: <strong>{String(rev['correctAnswer'] ?? '—')}</strong></div>
                      </div>
                    )}

                    {Boolean(rev['explanation']) && (
                      <div
                        className="mt-2 text-xs text-slate-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: '💡 <strong>Giải thích:</strong> ' + renderLatexInText(String(rev['explanation'])) }}
                      />
                    )}
                  </div>
                );
              })
              ) : (
                (() => {
                  const studentQOrder = selectedStudentForReview.questionOrder ?? [];
                  const publicList = state.publicQuestions || [];
                  const orderedPublic = (() => {
                    if (!studentQOrder || studentQOrder.length === 0) return publicList;
                    const map = new Map(publicList.map(item => [item.id, item]));
                    const res: typeof publicList = [];
                    for (const qId of studentQOrder) {
                      const found = map.get(qId);
                      if (found) res.push(found);
                    }
                    for (const item of publicList) {
                      if (!res.some(r => r.id === item.id)) res.push(item);
                    }
                    return res;
                  })();

                  return orderedPublic.map((qItem, idx: number) => {
                    const q = qItem as unknown as Record<string, unknown>;
                    const qId = String(q['id'] || '');
                    const studentRawAnswer = selectedStudentForReview.answers?.[qId];
                    const hasAnswered = studentRawAnswer !== undefined && studentRawAnswer !== null && studentRawAnswer !== '';
                    const stemText = typeof q['stem'] === 'object' && q['stem'] ? (String((q['stem'] as Record<string, unknown>)['text'] || '')) : String(q['stem'] || '');
                    const stemObj = q['stem'] as Record<string, unknown> | undefined;
                    const qImages = (stemObj && Array.isArray(stemObj['images']))
                      ? (stemObj['images'] as string[])
                      : (Array.isArray(q['images']) ? (q['images'] as string[]) : []);

                    return (
                      <div key={qId} className="p-4 rounded-xl border border-slate-200 bg-slate-50 shadow-xs">
                        <div className="flex items-center justify-between text-xs font-bold mb-2">
                          <span className="text-slate-800 font-extrabold">Câu {idx + 1} ({String(q['points'] || 1)} điểm)</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${hasAnswered ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'}`}>
                            {hasAnswered ? 'Đã trả lời' : 'Chưa làm'}
                          </span>
                        </div>

                        {/* Nội dung câu hỏi KaTeX */}
                        <div
                          className="text-sm font-semibold text-slate-900 mb-2 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: renderLatexInText(stemText) }}
                        />

                        {/* Hình ảnh đính kèm nếu có */}
                        {qImages.length > 0 && (
                          <div className="flex flex-wrap gap-2 my-2.5">
                            {qImages.map((imgUrl: string, imgIdx: number) => (
                              <img
                                key={imgIdx}
                                src={resolveAssetUrl(imgUrl)}
                                alt="Hình ảnh câu hỏi"
                                className="max-h-56 max-w-full rounded-xl border border-slate-200 object-contain shadow-xs bg-white"
                              />
                            ))}
                          </div>
                        )}

                        {/* Các lựa chọn của câu hỏi */}
                        {q['type'] === 'mcq4' && Array.isArray(q['options']) && (() => {
                          const optionOrder = selectedStudentForReview.optionOrders?.[qId];
                          const baseOpts = q['options'] as Array<unknown>;
                          const optsToRender = (optionOrder && optionOrder.length === 4)
                            ? optionOrder.map(origIdx => baseOpts[origIdx]!)
                            : baseOpts;

                          return (
                            <div className="space-y-1.5 mb-2.5">
                              {optsToRender.map((opt, oIdx: number) => {
                                const optText = typeof opt === 'object' && opt ? String((opt as Record<string, unknown>)['text'] || '') : String(opt);
                                const optImgs = typeof opt === 'object' && opt && Array.isArray((opt as Record<string, unknown>)['images'])
                                  ? ((opt as Record<string, unknown>)['images'] as string[])
                                  : [];
                                const isPicked = hasAnswered && Number(studentRawAnswer) === oIdx;
                                const letter = ['A', 'B', 'C', 'D'][oIdx] || String(oIdx + 1);
                                return (
                                  <div
                                    key={oIdx}
                                    className={`p-2.5 rounded-lg text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border ${
                                      isPicked
                                        ? 'bg-blue-50 border-blue-300 font-bold text-blue-900'
                                        : 'bg-white border-slate-200 text-slate-700'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                      <span className="w-5 h-5 rounded-full flex items-center justify-center bg-slate-200/90 font-bold text-[11px] shrink-0">
                                        {letter}
                                      </span>
                                      {optText && (
                                        <span
                                          className="flex-1 leading-relaxed"
                                          dangerouslySetInnerHTML={{ __html: renderLatexInText(optText) }}
                                        />
                                      )}
                                    </div>
                                    {optImgs.length > 0 && (
                                      <div className="flex flex-wrap gap-2 ml-7 sm:ml-0">
                                        {optImgs.map((iUrl, iIdx) => (
                                          <img
                                            key={iIdx}
                                            src={resolveAssetUrl(iUrl)}
                                            alt={`Ảnh phương án ${letter}`}
                                            className="max-h-28 rounded-lg border border-slate-200 object-contain bg-white"
                                          />
                                        ))}
                                      </div>
                                    )}
                                    {isPicked && <span className="text-blue-700 text-xs font-extrabold shrink-0">✓ Đã chọn</span>}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}

                        <div className="text-xs bg-white p-2.5 rounded-lg border border-slate-200">
                          <span>Câu trả lời của HS: </span>
                          <strong className="text-blue-700">
                            {hasAnswered
                              ? (q['type'] === 'mcq4'
                                  ? `Lựa chọn (${['A', 'B', 'C', 'D'][Number(studentRawAnswer)] || studentRawAnswer})`
                                  : String(studentRawAnswer))
                              : 'Chưa làm'}
                          </strong>
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>

            {/* Footer Modal */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedStudentForReview(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper kiểm tra câu hỏi đã được làm hay chưa
function isQuestionAnswered(q: QuestionPublic, ans: unknown): boolean {
  if (ans === undefined || ans === null) return false;
  if (q.type === 'mcq4') return typeof ans === 'number' && ans >= 0 && ans <= 3;
  if (q.type === 'tf') return typeof ans === 'boolean';
  if (q.type === 'tf_group') {
    if (Array.isArray(ans)) {
      return ans.some(v => typeof v === 'boolean');
    }
    return false;
  }
  if (q.type === 'short') {
    if (typeof ans === 'string') return ans.trim().length > 0;
    if (typeof ans === 'object' && ans !== null && 'text' in ans) {
      return String((ans as { text: unknown }).text ?? '').trim().length > 0;
    }
  }
  if (q.type === 'matching') {
    const pairs =
      typeof ans === 'object' && ans !== null && 'pairs' in ans
        ? (ans as { pairs: Record<string, string | null> }).pairs
        : (ans as Record<string, string | null>);
    return pairs ? Object.values(pairs).some(v => Boolean(v)) : false;
  }
  if (q.type === 'cloze_drag') {
    const filled =
      typeof ans === 'object' && ans !== null && 'filled' in ans
        ? (ans as { filled: Record<string, string | null> }).filled
        : (ans as Record<string, string | null>);
    return filled ? Object.values(filled).some(v => Boolean(v)) : false;
  }
  return false;
}

/**
 * Giao diện Học sinh: Nhập mật khẩu & Làm bài thi đầy đủ (Task 4.2)
 */
export const ExamStudentView: React.FC<ExamStudentViewProps> = ({
  state,
  participantId,
  sendIntent,
  onSendIntent,
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const doSend = sendIntent || onSendIntent || (() => {});

  const currentParticipant = state?.participants?.[participantId];
  const displayName = currentParticipant?.displayName || 'Thí sinh';
  const isAuthenticated = Boolean(currentParticipant?.authenticated);
  const isSubmitted = Boolean(currentParticipant?.isSubmitted);

  // State làm bài thi
  const [answers, setAnswers] = useState<Record<string, unknown>>(
    () => currentParticipant?.answers ?? {}
  );
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Record<string, boolean>>({});
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showGridModal, setShowGridModal] = useState(false);
  const [showFocusWarning, setShowFocusWarning] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const autoSubmittedRef = React.useRef(false);

  // Đồng bộ đáp án từ server khi có cập nhật (hỗ trợ khôi phục khi tải lại trang / rớt mạng)
  React.useEffect(() => {
    if (currentParticipant?.answers) {
      setAnswers(prev => ({ ...prev, ...currentParticipant.answers }));
    }
  }, [currentParticipant?.answers]);

  // Cập nhật đồng hồ đếm ngược mỗi 1 giây
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Lắng nghe sự kiện chuyển tab / mất focus (Task 4.3 Focus Lost detection)
  React.useEffect(() => {
    if (state?.status !== 'in_progress' || isSubmitted) return;

    const handleVisibilityChange = () => {
      const isLost = document.hidden;
      doSend({
        type: 'report_status',
        isFocusLost: isLost,
      });
      if (isLost) {
        setShowFocusWarning(true);
      }
    };

    const handleBlur = () => {
      doSend({
        type: 'report_status',
        isFocusLost: true,
      });
      setShowFocusWarning(true);
    };

    const handleFocus = () => {
      doSend({
        type: 'report_status',
        isFocusLost: false,
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [state?.status, isSubmitted, doSend]);

  // Chế độ Thi An Toàn (Exam Kiosk Mode) trên EduClass Desktop Client
  React.useEffect(() => {
    const desktopBridge = (window as unknown as { educlassStudent?: { lockKioskMode?: () => void; unlockKioskMode?: () => void } }).educlassStudent;
    if (!desktopBridge) return;

    if (state?.status === 'in_progress' && !isSubmitted) {
      desktopBridge.lockKioskMode?.();
    } else {
      desktopBridge.unlockKioskMode?.();
    }

    return () => {
      desktopBridge.unlockKioskMode?.();
    };
  }, [state?.status, isSubmitted]);

  // Tính thời gian còn lại (hỗ trợ cả thời gian gia hạn riêng theo từng thí sinh - Task 4.3)
  const effectiveExpiresAt = currentParticipant?.individualExpiresAt ?? state?.expiresAt;
  const remainingMs = effectiveExpiresAt
    ? Math.max(0, effectiveExpiresAt - currentTime)
    : (state?.durationMinutes ?? 0) * 60 * 1000;
  const remainingSeconds = Math.floor(remainingMs / 1000);
  const minutesLeft = Math.floor(remainingSeconds / 60);
  const secondsLeft = remainingSeconds % 60;
  const formattedTime = `${String(minutesLeft).padStart(2, '0')}:${String(secondsLeft).padStart(2, '0')}`;

  // Tự nộp bài khi hết giờ (Task 4.2 & 4.3 Auto-submit on time up)
  React.useEffect(() => {
    if (
      state?.status === 'in_progress' &&
      effectiveExpiresAt &&
      currentTime >= effectiveExpiresAt &&
      !isSubmitted
    ) {
      if (!autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        doSend({ type: 'submit_exam' });
      }
    }
  }, [state?.status, effectiveExpiresAt, currentTime, isSubmitted, doSend]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setErrorMsg('Vui lòng nhập mật khẩu kỳ thi');
      return;
    }
    setErrorMsg('');
    doSend({
      type: 'unlock_exam',
      password: passwordInput.trim(),
    });
  };

  // 0. Nếu học sinh đã thi ở ca trước (khóa thi trùng theo ca)
  const isLockedFromPreviousBatch =
    errorMsg.includes('ALREADY_SUBMITTED') ||
    errorMsg.includes('ca trước') ||
    errorMsg.includes('hoàn thành bài thi ở ca trước');

  if (isLockedFromPreviousBatch) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto min-h-[400px]">
        <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-4xl mb-4 shadow-sm">
          🎓
        </div>
        <h3 className="text-2xl font-black text-slate-800 mb-1">Đã thi ở ca trước</h3>
        <p className="text-sm text-slate-500 mb-4">
          Bạn đã hoàn thành bài thi ở ca thi trước. Kết quả của bạn đã được ghi nhận vào hệ thống.
        </p>
        <div className="px-4 py-3 bg-emerald-50 border border-emerald-200/80 rounded-xl text-emerald-800 text-sm font-semibold">
          Không cần làm lại bài thi. Hãy nhường phòng máy cho các bạn ca sau nhé!
        </div>
      </div>
    );
  }

  // 1. Nếu kỳ thi có mật khẩu và học sinh chưa mở khóa
  if (state?.hasPassword && !isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center p-6 max-w-sm mx-auto text-center min-h-[400px]">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-3xl mb-4 shadow-sm">
          🔒
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-1">{state?.title || 'Kỳ thi có mật khẩu'}</h3>
        <p className="text-sm text-slate-500 mb-6">
          Kỳ thi này được bảo vệ bằng mật khẩu. Vui lòng nhập mật khẩu do giáo viên cung cấp để mở đề thi.
        </p>

        <form onSubmit={handleUnlock} className="w-full flex flex-col gap-3">
          <input
            type="text"
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            placeholder="Nhập mật khẩu kỳ thi..."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-center font-semibold text-lg tracking-wider focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 min-h-[48px]"
            autoFocus
          />
          {errorMsg && <p className="text-xs text-rose-600 font-medium">{errorMsg}</p>}
          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-sm text-base min-h-[48px]"
          >
            Mở đề thi
          </button>
        </form>
      </div>
    );
  }

  // 2. Nếu đã hoàn thành / nộp bài
  if (isSubmitted) {
    const answeredCount = Object.keys(answers).length;
    const res = currentParticipant?.result;
    const allowScore = state?.allowViewScore !== false;
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto min-h-[400px]">
        <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-4xl mb-4 shadow-sm">
          ✅
        </div>
        <h3 className="text-2xl font-black text-slate-800 mb-1">Đã nộp bài thành công!</h3>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-bold text-slate-700 mb-3">
          <span>👤 Thí sinh:</span>
          <span className="text-blue-700 font-bold">{displayName}</span>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Bài thi của bạn đã được hệ thống lưu lại an toàn. Bạn đã trả lời {answeredCount}/{state?.totalQuestions} câu hỏi.
        </p>

        {/* Khối hiển thị Điểm thi */}
        {res && allowScore && (
          <div className="w-full bg-blue-50/60 border-2 border-blue-200 rounded-2xl p-4 mb-4 shadow-xs text-center">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Kết quả bài thi</div>
            <div className="text-sm font-extrabold text-blue-900 mb-2">Thí sinh: {displayName}</div>
            <div className="text-3xl font-black text-blue-600 mb-1">
              {res.score} / {res.maxScore ?? 10}đ
            </div>
            <div className="text-xs font-bold text-emerald-700">
              Đúng {res.correctCount}/{res.totalQuestions} câu ({res.percentage}%)
            </div>
          </div>
        )}

        <div className="px-4 py-3 bg-emerald-50 border border-emerald-200/80 rounded-xl text-emerald-800 text-sm font-semibold">
          Vui lòng đợi thầy/cô tổng kết và công bố kết quả.
        </div>
      </div>
    );
  }

  // 3. Nếu kỳ thi ở trạng thái ready (chờ giáo viên mở đề)
  if (state?.status === 'ready') {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto min-h-[400px]">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-3xl mb-4 animate-pulse">
          ⏳
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-1">{state?.title}</h3>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-bold text-slate-700 mb-2">
          <span>👤 Thí sinh:</span>
          <span className="text-blue-700 font-bold">{displayName}</span>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Thời gian làm bài: {state?.durationMinutes} phút ({state?.totalQuestions} câu hỏi)
        </p>
        <div className="px-4 py-2.5 bg-amber-50 text-amber-800 border border-amber-200/60 rounded-xl text-xs font-semibold">
          Đã sẵn sàng · Chờ giáo viên mở đề thi...
        </div>
      </div>
    );
  }

  // 4. Nếu kỳ thi đã đóng
  if (state?.status === 'closed') {
    const res = currentParticipant?.result;
    const allowScore = state?.allowViewScore !== false;
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto min-h-[400px]">
        <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-3xl mb-4">
          🏁
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-1">Kỳ thi đã kết thúc</h3>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-bold text-slate-700 mb-3">
          <span>👤 Thí sinh:</span>
          <span className="text-blue-700 font-bold">{displayName}</span>
        </div>
        <p className="text-sm text-slate-500 mb-4">Thời gian làm bài thi đã khép lại.</p>

        {/* Khối hiển thị Điểm thi */}
        {res && allowScore && (
          <div className="w-full bg-blue-50/60 border-2 border-blue-200 rounded-2xl p-4 mb-4 shadow-xs text-center">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Kết quả bài thi</div>
            <div className="text-sm font-extrabold text-blue-900 mb-2">Thí sinh: {displayName}</div>
            <div className="text-3xl font-black text-blue-600 mb-1">
              {res.score} / {res.maxScore ?? 10}đ
            </div>
            <div className="text-xs font-bold text-emerald-700">
              Đúng {res.correctCount}/{res.totalQuestions} câu ({res.percentage}%)
            </div>
          </div>
        )}
      </div>
    );
  }

  // 5. Giao diện làm bài chi tiết (in_progress)
  // Sắp xếp các câu hỏi theo thứ tự riêng biệt của học sinh (questionOrder)
  const questionOrder = currentParticipant?.questionOrder ?? [];
  const publicList = state?.publicQuestions ?? [];
  const orderedQuestions: QuestionPublic[] = (() => {
    if (!questionOrder || questionOrder.length === 0) {
      return publicList;
    }
    const map = new Map(publicList.map(q => [q.id, q]));
    const result: QuestionPublic[] = [];
    for (const qId of questionOrder) {
      const q = map.get(qId);
      if (q) result.push(q);
    }
    for (const q of publicList) {
      if (!result.some(r => r.id === q.id)) {
        result.push(q);
      }
    }
    return result;
  })();

  const totalQuestions = orderedQuestions.length;
  const answeredCount = orderedQuestions.filter(q =>
    isQuestionAnswered(q, answers[q.id])
  ).length;
  const unansweredCount = Math.max(0, totalQuestions - answeredCount);
  const bookmarkedCount = Object.values(bookmarkedQuestions).filter(Boolean).length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  // Xử lý lưu đáp án tức thì (Tự lưu từng lần chọn)
  const handleSaveAnswer = (questionId: string, answer: unknown) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
    doSend({
      type: 'save_answer',
      questionId,
      answer,
    });
  };

  // Toggle đánh dấu câu hỏi xem lại
  const toggleBookmark = (questionId: string) => {
    setBookmarkedQuestions(prev => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  // Cuộn mượt đến câu hỏi tương ứng (kèm báo cáo câu đang làm - Task 4.3)
  const scrollToQuestion = (questionId: string, qIndex?: number) => {
    setShowGridModal(false);
    doSend({
      type: 'report_status',
      currentQuestionId: questionId,
      ...(qIndex !== undefined ? { currentQuestionIndex: qIndex } : {}),
    });
    const elem = document.getElementById(`exam-q-${questionId}`);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Xác nhận nộp bài (bước 2)
  const handleConfirmSubmit = () => {
    setShowSubmitModal(false);
    doSend({ type: 'submit_exam' });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FFF9F0]/40 pb-20">
      {/* Banner cảnh báo mất focus (Task 4.3 Focus Warning) */}
      {showFocusWarning && (
        <div className="bg-rose-600 text-white px-4 py-2.5 text-xs font-bold text-center flex items-center justify-between shadow-sm z-50 sticky top-0">
          <div className="flex items-center gap-1.5 mx-auto">
            <span>⚠️</span>
            <span>
              Cảnh báo: Bạn vừa rời khỏi màn hình làm bài thi! Hành vi này đã được ghi nhận trên hệ thống giám sát.
            </span>
          </div>
          <button
            onClick={() => setShowFocusWarning(false)}
            className="text-white hover:text-rose-200 text-sm font-black px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Header cố định trên đầu (Sticky Header) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 shadow-xs">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          {/* Tên kỳ thi, Tên học sinh & Tiến độ */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-base font-bold text-slate-800 truncate">{state?.title}</h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700 shrink-0">
                <span>👤</span>
                <span className="truncate max-w-[140px] sm:max-w-[200px]">{displayName}</span>
              </span>
              {(currentParticipant?.extendedMinutes ?? 0) > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 shrink-0">
                  +{currentParticipant?.extendedMinutes}p
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-500 font-medium">
                Đã làm: <strong className="text-blue-600">{answeredCount}</strong>/{totalQuestions}
              </span>
              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Đồng hồ đếm ngược (Countdown Timer) */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-black transition ${
              remainingSeconds <= 60
                ? 'bg-rose-50 text-rose-600 border-rose-300 animate-pulse'
                : remainingSeconds <= 300
                ? 'bg-amber-50 text-amber-700 border-amber-300'
                : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}
          >
            <span>⏱</span>
            <span>{formattedTime}</span>
          </div>

          {/* Nút mở Lưới câu & Nút Nộp bài */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowGridModal(true)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition flex items-center gap-1.5 min-h-[48px]"
              title="Xem danh sách câu hỏi"
            >
              <span>📋</span>
              <span>Lưới câu</span>
            </button>

            <button
              onClick={() => setShowSubmitModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition shadow-sm min-h-[48px]"
            >
              Nộp bài
            </button>
          </div>
        </div>
      </header>

      {/* 2. Thân nội dung bài thi */}
      <main className="max-w-2xl mx-auto w-full p-4 flex flex-col gap-5">
        {/* Lưới câu tóm tắt nhanh ở đầu bài thi */}
        <section className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span>📋</span> Danh sách câu hỏi ({totalQuestions} câu)
            </h3>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" /> Đã làm ({answeredCount})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> Đánh dấu ({bookmarkedCount})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-slate-200 inline-block" /> Chưa làm ({unansweredCount})
              </span>
            </div>
          </div>

          {/* Lưới nút các câu (Question Grid theo PLAN 7.3) */}
          <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
            {orderedQuestions.map((q, idx) => {
              const isAnswered = isQuestionAnswered(q, answers[q.id]);
              const isBookmarked = Boolean(bookmarkedQuestions[q.id]);
              return (
                <button
                  key={q.id}
                  onClick={() => scrollToQuestion(q.id, idx)}
                  className={`min-w-[40px] h-[40px] rounded-xl flex items-center justify-center text-sm font-bold transition shadow-xs cursor-pointer ${
                    isBookmarked
                      ? 'bg-amber-400 text-amber-950 border-2 border-amber-500 ring-2 ring-amber-100'
                      : isAnswered
                      ? 'bg-blue-600 text-white border border-blue-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {idx + 1}
                  {isBookmarked && <span className="text-[10px] ml-0.5">🚩</span>}
                </button>
              );
            })}
          </div>
        </section>

        {/* Danh sách câu hỏi cuộn dọc */}
        <div className="flex flex-col gap-4">
          {orderedQuestions.map((q, idx) => {
            const isAnswered = isQuestionAnswered(q, answers[q.id]);
            const isBookmarked = Boolean(bookmarkedQuestions[q.id]);
            const currentAns = answers[q.id];

            return (
              <article
                key={q.id}
                id={`exam-q-${q.id}`}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col gap-4 scroll-mt-24"
              >
                {/* Tiêu đề câu & Nút đánh dấu */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-extrabold rounded-lg text-sm">
                      Câu {idx + 1}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">({q.points} điểm)</span>
                    {isAnswered && (
                      <span className="text-xs text-emerald-600 font-semibold flex items-center gap-0.5">
                        ✓ Đã lưu
                      </span>
                    )}
                  </div>

                  {/* Nút Đánh dấu xem lại (Bookmark Button) */}
                  <button
                    onClick={() => toggleBookmark(q.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 min-h-[48px] ${
                      isBookmarked
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    <span>{isBookmarked ? '🚩' : '🏳️'}</span>
                    <span>{isBookmarked ? 'Đã đánh dấu' : 'Đánh dấu'}</span>
                  </button>
                </div>

                {/* Nội dung câu hỏi (Stem) */}
                <div className="text-base sm:text-lg font-medium text-slate-800 leading-relaxed">
                  {typeof q.stem === 'string' ? q.stem : q.stem.text}
                </div>

                {/* Ảnh minh họa nếu có */}
                {typeof q.stem === 'object' && q.stem.images && q.stem.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 my-2">
                    {q.stem.images.map((img, i) => (
                      <img
                        key={i}
                        src={resolveAssetUrl(img)}
                        alt={`Ảnh minh họa câu ${idx + 1}`}
                        className="max-h-48 rounded-xl border border-slate-200 object-contain"
                      />
                    ))}
                  </div>
                )}

                {/* Khu vực lựa chọn đáp án theo loại câu hỏi */}
                {/* 1. Trắc nghiệm 4 lựa chọn (MCQ4) */}
                {q.type === 'mcq4' && (
                  <div className="flex flex-col gap-2.5 pt-1">
                    {(() => {
                      // Nếu có bảng xáo phương án của thí sinh
                      const optionOrder = currentParticipant?.optionOrders?.[q.id];
                      const optionsToRender =
                        optionOrder && optionOrder.length === 4
                          ? optionOrder.map(shuffledIdx => q.options[shuffledIdx]!)
                          : q.options;

                      const labels = ['A', 'B', 'C', 'D'];

                      return optionsToRender.map((opt, optIdx) => {
                        const optText = typeof opt === 'string' ? opt : opt.text;
                        const optImgs = typeof opt === 'object' && opt && Array.isArray(opt.images) ? opt.images : [];
                        const isSelected = currentAns === optIdx;

                        return (
                          <button
                            key={optIdx}
                            onClick={() => handleSaveAnswer(q.id, optIdx)}
                            className={`w-full p-3.5 rounded-xl border-2 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition min-h-[48px] ${
                              isSelected
                                ? 'bg-blue-50 border-blue-600 text-blue-950 font-semibold shadow-xs'
                                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                                  isSelected
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                              >
                                {labels[optIdx]}
                              </span>
                              {optText && <span className="text-base leading-normal">{optText}</span>}
                            </div>
                            {optImgs.length > 0 && (
                              <div className="flex flex-wrap gap-2 ml-11 sm:ml-0">
                                {optImgs.map((iUrl, iIdx) => (
                                  <img
                                    key={iIdx}
                                    src={resolveAssetUrl(iUrl)}
                                    alt={`Ảnh phương án ${labels[optIdx]}`}
                                    className="max-h-36 rounded-lg border border-slate-200 object-contain bg-white shadow-xs"
                                  />
                                ))}
                              </div>
                            )}
                          </button>
                        );
                      });
                    })()}
                  </div>
                )}

                {/* 2. Đúng / Sai (TF) */}
                {q.type === 'tf' && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      onClick={() => handleSaveAnswer(q.id, true)}
                      className={`p-3.5 rounded-xl border-2 font-bold text-base flex items-center justify-center gap-2 transition min-h-[48px] ${
                        currentAns === true
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-800 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <span>✔</span> Đúng
                    </button>
                    <button
                      onClick={() => handleSaveAnswer(q.id, false)}
                      className={`p-3.5 rounded-xl border-2 font-bold text-base flex items-center justify-center gap-2 transition min-h-[48px] ${
                        currentAns === false
                          ? 'bg-rose-50 border-rose-600 text-rose-800 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <span>✖</span> Sai
                    </button>
                  </div>
                )}

                {/* 3. Chùm Đúng / Sai (TF_GROUP) */}
                {q.type === 'tf_group' && (
                  <div className="flex flex-col gap-3 pt-1">
                    {q.items.map((it, itemIdx) => {
                      const itemText = typeof it.text === 'string' ? it.text : it.text.text;
                      const itemImgs = typeof it.text === 'object' && it.text && Array.isArray(it.text.images) ? it.text.images : [];
                      const groupAnswers = Array.isArray(currentAns)
                        ? (currentAns as Array<boolean | null>)
                        : [null, null, null, null];
                      const itemVal = groupAnswers[itemIdx];

                      const setGroupChoice = (val: boolean) => {
                        const next = [...groupAnswers];
                        next[itemIdx] = val;
                        handleSaveAnswer(q.id, next);
                      };

                      return (
                        <div
                          key={itemIdx}
                          className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-slate-800">
                              <strong>{String.fromCharCode(97 + itemIdx)})</strong> {itemText}
                            </span>
                            {itemImgs.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2 ml-4">
                                {itemImgs.map((iUrl, iIdx) => (
                                  <img
                                    key={iIdx}
                                    src={resolveAssetUrl(iUrl)}
                                    alt={`Ảnh ý ${String.fromCharCode(97 + itemIdx)}`}
                                    className="max-h-32 rounded-lg border border-slate-200 object-contain bg-white shadow-xs"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => setGroupChoice(true)}
                              className={`px-3 py-2 rounded-lg font-bold text-xs transition min-h-[48px] min-w-[64px] ${
                                itemVal === true
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              Đúng
                            </button>
                            <button
                              onClick={() => setGroupChoice(false)}
                              className={`px-3 py-2 rounded-lg font-bold text-xs transition min-h-[48px] min-w-[64px] ${
                                itemVal === false
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              Sai
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 4. Trả lời ngắn (SHORT) */}
                {q.type === 'short' && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={typeof currentAns === 'string' ? currentAns : ''}
                      onChange={e => handleSaveAnswer(q.id, e.target.value)}
                      placeholder="Nhập câu trả lời của bạn..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-base font-semibold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 min-h-[48px]"
                    />
                  </div>
                )}

                {/* 5. Ghép nối (MATCHING) */}
                {q.type === 'matching' && (
                  <div className="space-y-3 pt-1">
                    <div className="text-xs text-slate-500 font-bold uppercase">
                      Ghép từng mục Cột A với mục tương ứng ở Cột B:
                    </div>
                    {q.leftItems.map((left, lIdx) => {
                      const leftText =
                        typeof left.text === 'object' && left.text ? left.text.text : String(left.text);
                      const currentPairs =
                        typeof currentAns === 'object' && currentAns !== null
                          ? 'pairs' in currentAns
                            ? (currentAns as { pairs: Record<string, string | null> }).pairs
                            : (currentAns as Record<string, string | null>)
                          : {};
                      const currentSelectedRight = currentPairs[left.id] || '';

                      return (
                        <div
                          key={left.id}
                          className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="text-sm sm:text-base font-semibold text-slate-800">
                            <strong>{lIdx + 1}.</strong> {leftText}
                          </div>
                          <select
                            value={currentSelectedRight}
                            onChange={e => {
                              const newPairs = {
                                ...currentPairs,
                                [left.id]: e.target.value || null,
                              };
                              handleSaveAnswer(q.id, { pairs: newPairs });
                            }}
                            className="min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">-- Ghép với Cột B --</option>
                            {q.rightItems.map((right, rIdx) => {
                              const rightText =
                                typeof right.text === 'object' && right.text
                                  ? right.text.text
                                  : String(right.text);
                              return (
                                <option key={right.id} value={right.id}>
                                  {String.fromCharCode(65 + rIdx)}. {rightText}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 6. Điền từ (CLOZE_DRAG) */}
                {q.type === 'cloze_drag' && (
                  <div className="space-y-3 pt-1">
                    {/* Ngân hàng từ khóa */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="text-xs text-slate-500 font-bold mb-2 uppercase">
                        Từ khóa lựa chọn:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {q.wordBank.map((word, wIdx) => (
                          <span
                            key={wIdx}
                            className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold shadow-xs"
                          >
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Đoạn văn bản mẫu */}
                    <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 text-sm sm:text-base text-slate-800 leading-relaxed font-medium">
                      {q.template}
                    </div>

                    {/* Điền các ô trống */}
                    <div className="space-y-2">
                      {q.blanks.map(b => {
                        const currentFilled =
                          typeof currentAns === 'object' && currentAns !== null
                            ? 'filled' in currentAns
                              ? (currentAns as { filled: Record<string, string | null> }).filled
                              : (currentAns as Record<string, string | null>)
                            : {};
                        const currentVal = currentFilled[b.id] || '';

                        return (
                          <div
                            key={b.id}
                            className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200"
                          >
                            <span className="text-xs sm:text-sm font-bold text-slate-600 min-w-[70px]">
                              Ô [{b.id}]:
                            </span>
                            <select
                              value={currentVal}
                              onChange={e => {
                                const newFilled = {
                                  ...currentFilled,
                                  [b.id]: e.target.value || null,
                                };
                                handleSaveAnswer(q.id, { filled: newFilled });
                              }}
                              className="flex-1 min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">-- Chọn từ điền vào --</option>
                              {q.wordBank.map((w, wIdx) => (
                                <option key={wIdx} value={w}>
                                  {w}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {/* Nút nộp bài lớn ở cuối bài */}
        <div className="text-center pt-4 pb-12">
          <button
            onClick={() => setShowSubmitModal(true)}
            className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg rounded-2xl shadow-md transition min-h-[48px]"
          >
            Hoàn thành & Nộp bài thi
          </button>
        </div>
      </main>

      {/* 3. Modal Nộp bài 2 bước (2-Step Submit Confirmation Modal) */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-2xl mx-auto">
              📝
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-slate-800">Xác nhận nộp bài thi?</h3>
              <p className="text-sm text-slate-500 mt-1">
                Vui lòng kiểm tra lại tiến độ làm bài của bạn trước khi nộp.
              </p>
            </div>

            {/* Bảng thống kê tiến độ trong Modal */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Đã trả lời:</span>
                <strong className="text-blue-700">
                  {answeredCount}/{totalQuestions} câu
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Thời gian còn lại:</span>
                <strong className="text-slate-800">{formattedTime}</strong>
              </div>
              {bookmarkedCount > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Đang đánh dấu xem lại:</span>
                  <strong>{bookmarkedCount} câu</strong>
                </div>
              )}
            </div>

            {/* Cảnh báo nếu còn câu chưa làm */}
            {unansweredCount > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                <span>⚠️</span>
                <span>Bạn vẫn còn {unansweredCount} câu hỏi chưa trả lời! Vui lòng hoàn thành tất cả các câu trước khi nộp bài.</span>
              </div>
            )}

            {/* Hai nút hành động 2 bước */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition min-h-[48px]"
              >
                Tiếp tục làm bài
              </button>
              {unansweredCount > 0 ? (
                <button
                  disabled
                  className="py-3 px-4 bg-slate-200 text-slate-400 font-bold rounded-xl text-sm min-h-[48px] cursor-not-allowed"
                  title="Vui lòng hoàn thành tất cả các câu hỏi để được nộp bài"
                >
                  Chưa làm xong
                </button>
              ) : (
                <button
                  onClick={handleConfirmSubmit}
                  className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition shadow-sm min-h-[48px]"
                >
                  Xác nhận nộp
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal Lưới câu chi tiết trên Mobile */}
      {showGridModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl border border-slate-100 flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">Danh sách câu hỏi</h3>
              <button
                onClick={() => setShowGridModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {orderedQuestions.map((q, idx) => {
                const isAnswered = isQuestionAnswered(q, answers[q.id]);
                const isBookmarked = Boolean(bookmarkedQuestions[q.id]);
                return (
                  <button
                    key={q.id}
                    onClick={() => scrollToQuestion(q.id, idx)}
                    className={`min-w-[40px] h-[40px] rounded-xl flex items-center justify-center text-sm font-bold transition shadow-xs cursor-pointer ${
                      isBookmarked
                        ? 'bg-amber-400 text-amber-950 border-2 border-amber-500'
                        : isAnswered
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {idx + 1}
                    {isBookmarked && <span className="text-[10px] ml-0.5">🚩</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
