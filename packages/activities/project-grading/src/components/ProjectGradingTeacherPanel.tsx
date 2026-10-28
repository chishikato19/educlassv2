import React, { useState } from 'react';
import type { ProjectGradingState, ProjectGradingTeacherIntent } from '@educlass/protocol';
import { Button, Modal, UI_COLORS, UI_RADII } from '@educlass/ui-kit';
import {
  calculateAllFinalScores,
  calculateGradingProgress,
  validateScore,
} from '../project-grading-logic.js';
import { ProjectGradingProjectorView } from './ProjectGradingProjectorView.js';

export interface ProjectGradingTeacherPanelProps {
  runId: string;
  state: ProjectGradingState;
  onSendIntent: (intent: ProjectGradingTeacherIntent) => void;
  onEndActivity: () => void;
  onExportExcel?: () => void;
}

export const ProjectGradingTeacherPanel: React.FC<ProjectGradingTeacherPanelProps> = ({
  runId,
  state,
  onSendIntent,
  onEndActivity,
  onExportExcel,
}) => {
  const { config, teacherGroupGrades, teacherStudentGrades } = state;
  const isFrozen = state.status === 'frozen';
  const isEnded = state.status === 'ended';

  const progress = calculateGradingProgress(state);
  const results = calculateAllFinalScores(state);

  // Tab giáo viên chấm: 'group' (chấm theo nhóm) hoặc 'student' (chấm riêng cá nhân)
  const [gradingMode, setGradingMode] = useState<'group' | 'student'>('group');

  // Input điểm nhóm: groupId -> { score, comment }
  const [groupScores, setGroupScores] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const g of config.groups) {
      initial[g.id] = teacherGroupGrades[g.id]?.score ?? 8.5;
    }
    return initial;
  });
  const [groupComments, setGroupComments] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const g of config.groups) {
      if (teacherGroupGrades[g.id]?.comment) {
        initial[g.id] = teacherGroupGrades[g.id]!.comment!;
      }
    }
    return initial;
  });

  // Input điểm riêng học sinh: participantId -> { score, comment }
  const [studentScores, setStudentScores] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const r of results) {
      if (teacherStudentGrades[r.participantId]) {
        initial[r.participantId] = teacherStudentGrades[r.participantId]!.score;
      }
    }
    return initial;
  });
  const [studentComments, setStudentComments] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const r of results) {
      if (teacherStudentGrades[r.participantId]?.comment) {
        initial[r.participantId] = teacherStudentGrades[r.participantId]!.comment!;
      }
    }
    return initial;
  });

  // Modal máy chiếu
  const [isProjectorOpen, setIsProjectorOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // 1. Khóa / Mở lượt chấm
  const handleToggleLock = () => {
    const targetStatus = isFrozen ? 'grading' : 'frozen';
    onSendIntent({
      type: 'set_grading_status',
      status: targetStatus,
    });
    showToast(
      targetStatus === 'frozen' ? '🔒 Đã tạm khóa lượt chấm của học sinh' : '🔓 Đã mở lại lượt chấm'
    );
  };

  // 2. Giáo viên lưu điểm nhóm
  const handleSaveGroupGrade = (groupId: string) => {
    const score = groupScores[groupId] ?? 8.5;
    if (!validateScore(score, config.maxScore)) {
      showToast(`Điểm số phải từ 0 đến ${config.maxScore}`);
      return;
    }
    const comment = groupComments[groupId]?.trim();
    onSendIntent({
      type: 'submit_teacher_grade',
      targetType: 'group',
      targetId: groupId,
      score,
      comment: comment || undefined,
    });
    showToast('✓ Đã lưu điểm nhóm thành công!');
  };

  // 3. Giáo viên lưu điểm riêng cho một học sinh
  const handleSaveStudentGrade = (participantId: string) => {
    const score = studentScores[participantId];
    if (score === undefined || !validateScore(score, config.maxScore)) {
      showToast(`Điểm số phải từ 0 đến ${config.maxScore}`);
      return;
    }
    const comment = studentComments[participantId]?.trim();
    onSendIntent({
      type: 'submit_teacher_grade',
      targetType: 'student',
      targetId: participantId,
      score,
      comment: comment || undefined,
    });
    showToast('✓ Đã lưu điểm riêng cho học sinh!');
  };

  // 4. Xuất file Excel dự án
  const handleExportExcelClick = () => {
    if (onExportExcel) {
      onExportExcel();
      return;
    }

    // Client-side export fallback: CSV có BOM UTF-8 mở trực tiếp trên mọi phiên bản Excel
    const headers = [
      'Xếp hạng',
      'Họ và tên',
      'Tổ / Nhóm',
      'Vai trò',
      `Tự chấm (${config.weights.self}%)`,
      `Tổ chấm (${config.weights.teamMember}%)`,
      `Chéo nhóm (${config.weights.crossTeam}%)`,
      `Giáo viên (${config.weights.teacher}%)`,
      'ĐIỂM TỔNG KẾT',
      'Nhận xét / Đóng góp',
    ];

    const rows = results.map((r, idx) => [
      r.rank ?? idx + 1,
      `"${r.displayName}"`,
      `"${r.groupName}"`,
      `"${r.isLeader ? 'Nhóm trưởng ⭐' : 'Thành viên'}"`,
      r.selfScore !== null ? r.selfScore : '-',
      r.teamMemberScore !== null ? r.teamMemberScore : '-',
      r.crossTeamScore !== null ? r.crossTeamScore : '-',
      r.teacherScore !== null ? r.teacherScore : '-',
      r.finalScore,
      `"${r.feedbackComments?.join('; ') ?? ''}"`,
    ]);

    const csvContent =
      '\uFEFF' +
      [
        `"BÁO CÁO KẾT QUẢ ĐÁNH GIÁ DỰ ÁN: ${config.title}"`,
        `"Trọng số: Tự chấm ${config.weights.self}% | Tổ chấm ${config.weights.teamMember}% | Chéo nhóm ${config.weights.crossTeam}% | Giáo viên ${config.weights.teacher}%"`,
        '',
        headers.join(','),
        ...rows.map(row => row.join(',')),
      ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BangDiemDuAn_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('📥 Đã tải xuống bảng điểm dự án!');
  };

  return (
    <div
      style={{
        padding: '24px',
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
      data-testid="project-grading-teacher-panel"
    >
      {/* Toast popup */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '10px 20px',
            borderRadius: '24px',
            fontSize: '14px',
            fontWeight: 600,
            zIndex: 9999,
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          }}
        >
          {toastMsg}
        </div>
      )}

      {/* 1. Header Bảng Điều Khiển */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          padding: '20px',
          backgroundColor: '#FFFFFF',
          borderRadius: UI_RADII.card,
          border: `1px solid ${UI_COLORS.border}`,
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '36px' }}>📋</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: UI_COLORS.text }}>
                {config.title}
              </h2>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '12px',
                  backgroundColor: isEnded ? '#F1F5F9' : isFrozen ? '#FEF08A' : '#DCFCE7',
                  color: isEnded ? UI_COLORS.textMuted : isFrozen ? '#854D0E' : '#15803D',
                }}
              >
                {isEnded ? '🏁 Đã kết thúc' : isFrozen ? '🔒 Tạm khóa chấm' : '🟢 Đang mở chấm'}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: UI_COLORS.textMuted, marginTop: '4px' }}>
              Trọng số: Tự chấm {config.weights.self}% • Tổ chấm {config.weights.teamMember}% • Chéo
              nhóm {config.weights.crossTeam}% • Giáo viên {config.weights.teacher}%
            </div>
          </div>
        </div>

        {/* Thanh công cụ giáo viên */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            onClick={handleToggleLock}
            disabled={isEnded}
            data-testid="btn-toggle-grading-lock"
          >
            {isFrozen ? '🔓 Mở lại lượt chấm' : '🔒 Khóa chấm'}
          </Button>

          <Button
            variant="secondary"
            onClick={() => setIsProjectorOpen(true)}
            data-testid="btn-open-projector"
          >
            🖥️ Mở Máy Chiếu
          </Button>

          <Button
            variant="secondary"
            onClick={handleExportExcelClick}
            data-testid="btn-export-excel"
          >
            📥 Xuất Excel
          </Button>

          <Button
            variant="danger"
            onClick={onEndActivity}
            disabled={isEnded}
            data-testid="btn-end-activity"
          >
            🏁 Kết thúc & Tổng kết
          </Button>
        </div>
      </div>

      {/* 2. Thanh đo tiến độ 4 chiều */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '16px',
            borderRadius: UI_RADII.card,
            border: `1px solid ${UI_COLORS.border}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '13px',
              color: UI_COLORS.textMuted,
            }}
          >
            <span>👤 Học sinh tự chấm</span>
            <span style={{ fontWeight: 700, color: UI_COLORS.primary }}>
              {progress.selfGrading.percentage}%
            </span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, margin: '6px 0' }}>
            {progress.selfGrading.submitted} / {progress.selfGrading.total} học sinh
          </div>
          <div
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: '#F1F5F9',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress.selfGrading.percentage}%`,
                height: '100%',
                backgroundColor: UI_COLORS.primary,
              }}
            />
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '16px',
            borderRadius: UI_RADII.card,
            border: `1px solid ${UI_COLORS.border}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '13px',
              color: UI_COLORS.textMuted,
            }}
          >
            <span>👥 Tổ chấm thành viên</span>
            <span style={{ fontWeight: 700, color: '#9333EA' }}>
              {progress.teamMemberGrading.percentage}%
            </span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, margin: '6px 0' }}>
            {progress.teamMemberGrading.submitted} / {progress.teamMemberGrading.total} lượt
          </div>
          <div
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: '#F1F5F9',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress.teamMemberGrading.percentage}%`,
                height: '100%',
                backgroundColor: '#9333EA',
              }}
            />
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '16px',
            borderRadius: UI_RADII.card,
            border: `1px solid ${UI_COLORS.border}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '13px',
              color: UI_COLORS.textMuted,
            }}
          >
            <span>🔄 Chấm chéo nhóm bạn</span>
            <span style={{ fontWeight: 700, color: '#16A34A' }}>
              {progress.crossTeamGrading.percentage}%
            </span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, margin: '6px 0' }}>
            {progress.crossTeamGrading.submitted} / {progress.crossTeamGrading.total} nhóm
          </div>
          <div
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: '#F1F5F9',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress.crossTeamGrading.percentage}%`,
                height: '100%',
                backgroundColor: '#16A34A',
              }}
            />
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '16px',
            borderRadius: UI_RADII.card,
            border: `1px solid ${UI_COLORS.border}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '13px',
              color: UI_COLORS.textMuted,
            }}
          >
            <span>🎓 Điểm Giáo viên</span>
            <span style={{ fontWeight: 700, color: '#D97706' }}>
              {Math.round(
                (progress.teacherGrading.groupsGraded /
                  Math.max(1, progress.teacherGrading.totalGroups)) *
                  100
              )}
              %
            </span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, margin: '6px 0' }}>
            {progress.teacherGrading.groupsGraded} / {progress.teacherGrading.totalGroups} nhóm đã
            có điểm
          </div>
          <div
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: '#F1F5F9',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.round((progress.teacherGrading.groupsGraded / Math.max(1, progress.teacherGrading.totalGroups)) * 100)}%`,
                height: '100%',
                backgroundColor: '#D97706',
              }}
            />
          </div>
        </div>
      </div>

      {/* 3. KHU VỰC GIÁO VIÊN NHẬP ĐIỂM */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: UI_RADII.card,
          padding: '20px',
          border: `1px solid ${UI_COLORS.border}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
        data-testid="section-teacher-grading-hub"
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: UI_COLORS.text }}>
              4. Giáo viên nhập điểm đánh giá (Trọng số {config.weights.teacher}%)
            </h3>
            <div style={{ fontSize: '13px', color: UI_COLORS.textMuted, marginTop: '2px' }}>
              Bạn có thể nhập điểm chung cho cả nhóm hoặc nhập điểm điều chỉnh riêng cho từng học
              sinh.
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              backgroundColor: '#F1F5F9',
              borderRadius: '10px',
              padding: '3px',
            }}
          >
            <button
              type="button"
              onClick={() => setGradingMode('group')}
              style={{
                border: 'none',
                padding: '6px 14px',
                borderRadius: '8px',
                backgroundColor: gradingMode === 'group' ? '#FFFFFF' : 'transparent',
                fontWeight: gradingMode === 'group' ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              🏢 Chấm theo Nhóm ({config.groups.length})
            </button>
            <button
              type="button"
              onClick={() => setGradingMode('student')}
              style={{
                border: 'none',
                padding: '6px 14px',
                borderRadius: '8px',
                backgroundColor: gradingMode === 'student' ? '#FFFFFF' : 'transparent',
                fontWeight: gradingMode === 'student' ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              👤 Chấm riêng Học sinh ({results.length})
            </button>
          </div>
        </div>

        {/* Chế độ 1: Chấm theo Nhóm */}
        {gradingMode === 'group' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '16px',
            }}
          >
            {config.groups.map(group => {
              const currentGrade = teacherGroupGrades[group.id];
              const score = groupScores[group.id] ?? 8.5;
              const comment = groupComments[group.id] ?? '';

              return (
                <div
                  key={group.id}
                  style={{
                    padding: '16px',
                    borderRadius: '14px',
                    border: `1px solid ${currentGrade ? '#86EFAC' : UI_COLORS.border}`,
                    backgroundColor: currentGrade ? '#F0FDF4' : '#F8FAFC',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: '16px', fontWeight: 800, color: UI_COLORS.text }}>
                      {group.name}
                    </span>
                    {currentGrade ? (
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '8px',
                          backgroundColor: '#DCFCE7',
                          color: '#15803D',
                        }}
                      >
                        Đã chấm: {currentGrade.score}đ
                      </span>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#B45309', fontWeight: 600 }}>
                        Chưa nhập điểm
                      </span>
                    )}
                  </div>

                  {/* Nhập điểm số */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() =>
                        setGroupScores(prev => ({
                          ...prev,
                          [group.id]: Math.max(0, Math.round((score - 0.5) * 10) / 10),
                        }))
                      }
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        border: `1px solid ${UI_COLORS.border}`,
                        backgroundColor: '#FFFFFF',
                        fontSize: '18px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      -
                    </button>

                    <input
                      type="number"
                      step={config.stepScore}
                      min={0}
                      max={config.maxScore}
                      value={score}
                      data-testid={`input-teacher-group-${group.id}`}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        if (!Number.isNaN(val)) {
                          setGroupScores(prev => ({ ...prev, [group.id]: val }));
                        }
                      }}
                      style={{
                        flex: 1,
                        height: '40px',
                        textAlign: 'center',
                        fontSize: '20px',
                        fontWeight: 800,
                        color: UI_COLORS.primary,
                        borderRadius: '10px',
                        border: `1px solid ${UI_COLORS.border}`,
                        backgroundColor: '#FFFFFF',
                      }}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setGroupScores(prev => ({
                          ...prev,
                          [group.id]: Math.min(
                            config.maxScore,
                            Math.round((score + 0.5) * 10) / 10
                          ),
                        }))
                      }
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        border: `1px solid ${UI_COLORS.border}`,
                        backgroundColor: '#FFFFFF',
                        fontSize: '18px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      +
                    </button>
                  </div>

                  {/* Quick chips */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[7, 8, 8.5, 9, 9.5, 10].map(quick => (
                      <button
                        key={quick}
                        type="button"
                        onClick={() => setGroupScores(prev => ({ ...prev, [group.id]: quick }))}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: `1px solid ${score === quick ? UI_COLORS.primary : UI_COLORS.border}`,
                          backgroundColor: score === quick ? '#EFF6FF' : '#FFFFFF',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {quick}đ
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder="Nhận xét sản phẩm / thuyết trình của nhóm..."
                    value={comment}
                    onChange={e =>
                      setGroupComments(prev => ({ ...prev, [group.id]: e.target.value }))
                    }
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${UI_COLORS.border}`,
                      fontSize: '13px',
                      backgroundColor: '#FFFFFF',
                    }}
                  />

                  <Button
                    variant="primary"
                    fullWidth
                    style={{ minHeight: '40px', fontSize: '13px' }}
                    onClick={() => handleSaveGroupGrade(group.id)}
                    data-testid={`btn-teacher-save-group-${group.id}`}
                  >
                    💾 Lưu điểm nhóm này
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Chế độ 2: Chấm riêng từng Học sinh */}
        {gradingMode === 'student' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '16px',
            }}
          >
            {results.map(r => {
              const currentCustom = teacherStudentGrades[r.participantId];
              const score = studentScores[r.participantId] ?? r.teacherScore ?? 8.5;
              const comment = studentComments[r.participantId] ?? '';

              return (
                <div
                  key={r.participantId}
                  style={{
                    padding: '16px',
                    borderRadius: '14px',
                    border: `1px solid ${currentCustom ? '#F59E0B' : UI_COLORS.border}`,
                    backgroundColor: currentCustom ? '#FFFBEB' : '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: UI_COLORS.text }}>
                        {r.displayName}
                      </span>
                      <div style={{ fontSize: '12px', color: UI_COLORS.textMuted }}>
                        {r.groupName} {r.isLeader && '• ⭐ Nhóm trưởng'}
                      </div>
                    </div>

                    {currentCustom ? (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '8px',
                          backgroundColor: '#FEF3C7',
                          color: '#B45309',
                        }}
                      >
                        Điểm riêng: {currentCustom.score}đ
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: UI_COLORS.textMuted }}>
                        Theo nhóm: {r.teacherScore !== null ? `${r.teacherScore}đ` : 'Chưa có'}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      step={config.stepScore}
                      min={0}
                      max={config.maxScore}
                      value={score}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        if (!Number.isNaN(val)) {
                          setStudentScores(prev => ({ ...prev, [r.participantId]: val }));
                        }
                      }}
                      style={{
                        flex: 1,
                        height: '38px',
                        textAlign: 'center',
                        fontSize: '18px',
                        fontWeight: 700,
                        borderRadius: '8px',
                        border: `1px solid ${UI_COLORS.border}`,
                      }}
                    />
                    <Button
                      variant="primary"
                      style={{ minHeight: '38px', padding: '0 16px' }}
                      onClick={() => handleSaveStudentGrade(r.participantId)}
                      data-testid={`btn-teacher-save-student-${r.participantId}`}
                    >
                      💾 Lưu
                    </Button>
                  </div>

                  <input
                    type="text"
                    placeholder="Ghi chú đánh giá riêng bạn này..."
                    value={comment}
                    onChange={e =>
                      setStudentComments(prev => ({ ...prev, [r.participantId]: e.target.value }))
                    }
                    style={{
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: `1px solid ${UI_COLORS.border}`,
                      fontSize: '12px',
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. BẢNG TỔNG HỢP KẾT QUẢ THỜI GIAN THỰC */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: UI_RADII.card,
          padding: '20px',
          border: `1px solid ${UI_COLORS.border}`,
          overflowX: 'auto',
        }}
      >
        <h3
          style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: 700, color: UI_COLORS.text }}
        >
          🏆 Bảng Điểm Tổng Hợp Thời Gian Thực ({results.length} học sinh)
        </h3>

        <table
          style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}
        >
          <thead>
            <tr
              style={{
                borderBottom: `2px solid ${UI_COLORS.border}`,
                color: UI_COLORS.textMuted,
                fontSize: '13px',
              }}
            >
              <th style={{ padding: '10px 12px' }}>Hạng</th>
              <th style={{ padding: '10px 12px' }}>Học sinh</th>
              <th style={{ padding: '10px 12px' }}>Tổ / Nhóm</th>
              <th style={{ padding: '10px 12px' }}>Tự chấm ({config.weights.self}%)</th>
              <th style={{ padding: '10px 12px' }}>Tổ chấm ({config.weights.teamMember}%)</th>
              <th style={{ padding: '10px 12px' }}>Chéo nhóm ({config.weights.crossTeam}%)</th>
              <th style={{ padding: '10px 12px' }}>Điểm GV ({config.weights.teacher}%)</th>
              <th style={{ padding: '10px 12px', color: UI_COLORS.primary }}>TỔNG KẾT</th>
            </tr>
          </thead>
          <tbody>
            {results.map(r => (
              <tr key={r.participantId} style={{ borderBottom: `1px solid ${UI_COLORS.border}` }}>
                <td style={{ padding: '12px', fontWeight: 800 }}>
                  {r.rank === 1
                    ? '🥇 1'
                    : r.rank === 2
                      ? '🥈 2'
                      : r.rank === 3
                        ? '🥉 3'
                        : `#${r.rank}`}
                </td>
                <td style={{ padding: '12px', fontWeight: 600 }}>
                  {r.displayName} {r.isLeader && '⭐'}
                </td>
                <td style={{ padding: '12px', color: UI_COLORS.textMuted }}>{r.groupName}</td>
                <td style={{ padding: '12px' }}>
                  {r.selfScore !== null ? `${r.selfScore}đ` : '-'}
                </td>
                <td style={{ padding: '12px' }}>
                  {r.teamMemberScore !== null ? `${r.teamMemberScore}đ` : '-'}
                </td>
                <td style={{ padding: '12px' }}>
                  {r.crossTeamScore !== null ? `${r.crossTeamScore}đ` : '-'}
                </td>
                <td style={{ padding: '12px' }}>
                  {r.teacherScore !== null ? `${r.teacherScore}đ` : '-'}
                </td>
                <td
                  style={{
                    padding: '12px',
                    fontWeight: 900,
                    fontSize: '16px',
                    color: UI_COLORS.primary,
                  }}
                >
                  {r.finalScore}đ
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal máy chiếu */}
      {isProjectorOpen && (
        <Modal title="" isOpen={isProjectorOpen} onClose={() => setIsProjectorOpen(false)}>
          <div style={{ margin: '-24px', height: '80vh', overflowY: 'auto' }}>
            <ProjectGradingProjectorView
              runId={runId}
              state={state}
              onClose={() => setIsProjectorOpen(false)}
            />
          </div>
        </Modal>
      )}
    </div>
  );
};
