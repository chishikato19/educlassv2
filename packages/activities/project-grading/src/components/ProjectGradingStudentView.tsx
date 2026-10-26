import React, { useState } from 'react';
import type {
  ProjectGradingState,
  ProjectGradingStudentIntent,
} from '@educlass/protocol';
import {
  findGroupByParticipantId,
  isParticipantLeader,
  validateScore,
} from '../project-grading-logic.js';
import { Button, Modal, UI_COLORS, UI_RADII } from '@educlass/ui-kit';

export interface ProjectGradingStudentViewProps {
  runId: string;
  state: ProjectGradingState;
  participantId: string;
  onSendIntent: (intent: ProjectGradingStudentIntent) => void;
  onSwitchStudent?: (() => void) | undefined;
}

export const ProjectGradingStudentView: React.FC<ProjectGradingStudentViewProps> = ({
  state,
  participantId,
  onSendIntent,
  onSwitchStudent,
}) => {
  const { config } = state;
  const myGroup = findGroupByParticipantId(config.groups, participantId);
  const isLeader = isParticipantLeader(myGroup, participantId);

  // Tab cho nhóm trưởng: 'self' | 'members' | 'cross'
  const [activeTab, setActiveTab] = useState<'self' | 'members' | 'cross'>('self');

  // Form tự chấm
  const currentSelfGrade = state.selfGrades[participantId];
  const [selfScore, setSelfScore] = useState<number>(currentSelfGrade?.score ?? 8.0);
  const [selfComment, setSelfComment] = useState<string>(currentSelfGrade?.comment ?? '');
  const [selfSaved, setSelfSaved] = useState<boolean>(Boolean(currentSelfGrade));

  // Form chấm thành viên: memberId -> { score, comment }
  const myTeamGrades = state.teamMemberGrades[participantId] ?? {};
  const [memberScores, setMemberScores] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    if (myGroup) {
      for (const mId of myGroup.memberParticipantIds) {
        if (mId !== participantId) {
          initial[mId] = myTeamGrades[mId]?.score ?? 8.0;
        }
      }
    }
    return initial;
  });
  const [memberComments, setMemberComments] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (myGroup) {
      for (const mId of myGroup.memberParticipantIds) {
        if (mId !== participantId && myTeamGrades[mId]?.comment) {
          initial[mId] = myTeamGrades[mId]!.comment!;
        }
      }
    }
    return initial;
  });

  // Form chấm chéo nhóm khác: targetGroupId -> { score, comment }
  const myCrossGrades = state.crossTeamGrades[participantId] ?? {};
  const [crossScores, setCrossScores] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const g of config.groups) {
      if (g.id !== myGroup?.id) {
        initial[g.id] = myCrossGrades[g.id]?.score ?? 8.0;
      }
    }
    return initial;
  });
  const [crossComments, setCrossComments] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const g of config.groups) {
      if (g.id !== myGroup?.id && myCrossGrades[g.id]?.comment) {
        initial[g.id] = myCrossGrades[g.id]!.comment!;
      }
    }
    return initial;
  });

  // Modal xác nhận đổi học sinh (Kiosk Mode)
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // 1. Gửi điểm tự chấm
  const handleSaveSelfGrade = () => {
    if (!validateScore(selfScore, config.maxScore)) {
      showToast(`Điểm số phải từ 0 đến ${config.maxScore}`);
      return;
    }
    onSendIntent({
      type: 'submit_self_grade',
      score: selfScore,
      comment: selfComment.trim() || undefined,
    });
    setSelfSaved(true);
    showToast('✓ Đã lưu điểm tự chấm thành công!');
  };

  // 2. Nhóm trưởng gửi điểm thành viên
  const handleSaveMemberGrade = (memberId: string) => {
    const score = memberScores[memberId] ?? 8.0;
    if (!validateScore(score, config.maxScore)) {
      showToast(`Điểm số phải từ 0 đến ${config.maxScore}`);
      return;
    }
    const comment = memberComments[memberId]?.trim();
    onSendIntent({
      type: 'submit_team_member_grade',
      memberParticipantId: memberId,
      score,
      comment: comment || undefined,
    });
    showToast('✓ Đã lưu điểm thành viên!');
  };

  // 3. Nhóm trưởng gửi điểm chéo nhóm bạn
  const handleSaveCrossGrade = (targetGroupId: string) => {
    const score = crossScores[targetGroupId] ?? 8.0;
    if (!validateScore(score, config.maxScore)) {
      showToast(`Điểm số phải từ 0 đến ${config.maxScore}`);
      return;
    }
    const comment = crossComments[targetGroupId]?.trim();
    onSendIntent({
      type: 'submit_cross_team_grade',
      targetGroupId,
      score,
      comment: comment || undefined,
    });
    showToast('✓ Đã lưu điểm nhóm bạn!');
  };

  // 4. Cơ chế Đổi học sinh khác (Kiosk / Shared Device)
  const handleConfirmSwitchStudent = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('educlass_participant_token');
    }
    setIsSwitchModalOpen(false);
    if (onSwitchStudent) {
      onSwitchStudent();
    } else if (typeof window !== 'undefined') {
      // Bắn sự kiện toàn cục để portal reset về danh sách chọn tên học sinh
      window.dispatchEvent(new CustomEvent('educlass:switch-student'));
      // Fallback reload giữ nguyên URL/query
      window.location.reload();
    }
  };

  const isFrozen = state.status === 'frozen' || state.status === 'ended';

  // Trường hợp học sinh chưa vào nhóm nào
  if (!myGroup) {
    return (
      <div
        style={{
          padding: '24px',
          maxWidth: '480px',
          margin: '0 auto',
          textAlign: 'center',
          backgroundColor: '#FFFFFF',
          borderRadius: UI_RADII.card,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚠️</div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', color: UI_COLORS.text }}>
          Chưa được phân nhóm
        </h3>
        <p style={{ fontSize: '14px', color: UI_COLORS.textMuted, marginBottom: '24px' }}>
          Bạn chưa được xếp vào nhóm/tổ nào trong tiết học này. Vui lòng báo thầy/cô để được thêm vào nhóm nhé!
        </p>
        <Button
          variant="secondary"
          fullWidth
          style={{ minHeight: '48px' }}
          onClick={() => setIsSwitchModalOpen(true)}
          data-testid="btn-kiosk-switch-unassigned"
        >
          🔁 Đổi học sinh khác vào chấm
        </Button>

        {isSwitchModalOpen && renderSwitchModal()}
      </div>
    );
  }

  // Danh sách thành viên khác cần nhóm trưởng chấm
  const otherMembers = myGroup.memberParticipantIds.filter((id) => id !== participantId);
  const gradedMembersCount = otherMembers.filter((id) => myTeamGrades[id] !== undefined).length;

  // Danh sách các nhóm khác cần chấm chéo
  const otherGroups = config.groups.filter((g) => g.id !== myGroup.id);
  const gradedCrossCount = otherGroups.filter((g) => myCrossGrades[g.id] !== undefined).length;

  function renderSwitchModal() {
    return (
      <Modal
        title="🔁 Đổi học sinh khác"
        isOpen={isSwitchModalOpen}
        onClose={() => setIsSwitchModalOpen(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: '14px', color: UI_COLORS.text }}>
            Hệ thống sẽ lưu lại điểm bạn vừa chấm và chuyển về màn hình danh sách lớp để bạn học sinh tiếp theo vào chấm trên máy này.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button
              variant="secondary"
              onClick={() => setIsSwitchModalOpen(false)}
              style={{ minHeight: '44px' }}
            >
              Ở lại
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmSwitchStudent}
              style={{ minHeight: '44px' }}
              data-testid="btn-confirm-switch-student"
            >
              Xác nhận đổi bạn khác
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <div
      style={{
        padding: '16px',
        maxWidth: '480px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
      data-testid="project-grading-student-view"
    >
      {/* Toast thông báo nhanh */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '10px 18px',
            borderRadius: '24px',
            fontSize: '14px',
            fontWeight: 600,
            zIndex: 9999,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {toastMsg}
        </div>
      )}

      {/* Header thông tin học sinh & nhóm */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: UI_RADII.card,
          padding: '16px',
          border: `1px solid ${UI_COLORS.border}`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: UI_COLORS.text }}>
            {config.title}
          </div>
          <div style={{ fontSize: '13px', color: UI_COLORS.textMuted, marginTop: '2px' }}>
            Bạn thuộc: <strong style={{ color: UI_COLORS.primary }}>{myGroup.name}</strong>
          </div>
        </div>

        <div>
          {isLeader ? (
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '12px',
                backgroundColor: '#FEF08A',
                color: '#854D0E',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              ⭐ Nhóm trưởng
            </span>
          ) : (
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: '12px',
                backgroundColor: '#F1F5F9',
                color: UI_COLORS.textMuted,
              }}
            >
              Thành viên
            </span>
          )}
        </div>
      </div>

      {/* Cảnh báo khóa chấm */}
      {isFrozen && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: UI_RADII.card,
            backgroundColor: '#FEF3C7',
            border: `1px solid #FDE68A`,
            color: '#92400E',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>🔒</span>
          <span>Thầy cô đã tạm khóa lượt chấm điểm dự án.</span>
        </div>
      )}

      {/* Tabs chuyển đổi dành riêng cho Nhóm trưởng ⭐ */}
      {isLeader && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '6px',
            backgroundColor: '#E2E8F0',
            padding: '4px',
            borderRadius: '14px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('self')}
            style={{
              minHeight: '48px',
              border: 'none',
              borderRadius: '10px',
              backgroundColor: activeTab === 'self' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'self' ? UI_COLORS.text : UI_COLORS.textMuted,
              fontWeight: activeTab === 'self' ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
            }}
            data-testid="tab-self-grading"
          >
            <span>👤 Tự chấm</span>
            <span style={{ fontSize: '10px', opacity: 0.8 }}>
              {selfSaved ? '✓ Đã xong' : 'Chưa lưu'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('members')}
            style={{
              minHeight: '48px',
              border: 'none',
              borderRadius: '10px',
              backgroundColor: activeTab === 'members' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'members' ? UI_COLORS.text : UI_COLORS.textMuted,
              fontWeight: activeTab === 'members' ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
            }}
            data-testid="tab-member-grading"
          >
            <span>👥 Thành viên</span>
            <span style={{ fontSize: '10px', opacity: 0.8 }}>
              {gradedMembersCount}/{otherMembers.length} bạn
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cross')}
            style={{
              minHeight: '48px',
              border: 'none',
              borderRadius: '10px',
              backgroundColor: activeTab === 'cross' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'cross' ? UI_COLORS.text : UI_COLORS.textMuted,
              fontWeight: activeTab === 'cross' ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
            }}
            data-testid="tab-cross-grading"
          >
            <span>🔄 Nhóm bạn</span>
            <span style={{ fontSize: '10px', opacity: 0.8 }}>
              {gradedCrossCount}/{otherGroups.length} nhóm
            </span>
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 1: FORM TỰ CHẤM ĐIỂM CÁ NHÂN (Thành viên & Nhóm trưởng) */}
      {/* ============================================================ */}
      {(!isLeader || activeTab === 'self') && (
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
          data-testid="section-self-grading"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: UI_COLORS.text }}>
                1. Tự chấm điểm cá nhân
              </h4>
              <div style={{ fontSize: '12px', color: UI_COLORS.textMuted, marginTop: '2px' }}>
                Trọng số: {config.weights.self}% • Thang điểm: 0 đến {config.maxScore}
              </div>
            </div>

            {currentSelfGrade && (
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '4px 8px',
                  borderRadius: '8px',
                  backgroundColor: '#DCFCE7',
                  color: '#15803D',
                }}
              >
                Đã lưu: {currentSelfGrade.score}/{config.maxScore}
              </span>
            )}
          </div>

          {/* Bộ nhập điểm lớn vùng chạm >= 48px */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
              Điểm số em tự đánh giá:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                disabled={isFrozen || selfScore <= 0}
                onClick={() => setSelfScore((s) => Math.max(0, Math.round((s - 0.5) * 10) / 10))}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  border: `1px solid ${UI_COLORS.border}`,
                  backgroundColor: '#F8FAFC',
                  fontSize: '20px',
                  fontWeight: 700,
                  cursor: isFrozen ? 'not-allowed' : 'pointer',
                }}
              >
                -
              </button>

              <input
                type="number"
                step={config.stepScore}
                min={0}
                max={config.maxScore}
                disabled={isFrozen}
                value={selfScore}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!Number.isNaN(val)) setSelfScore(val);
                }}
                style={{
                  flex: 1,
                  height: '48px',
                  textAlign: 'center',
                  fontSize: '24px',
                  fontWeight: 800,
                  color: UI_COLORS.primary,
                  borderRadius: '12px',
                  border: `2px solid ${UI_COLORS.primary}`,
                }}
                data-testid="input-self-score"
              />

              <button
                type="button"
                disabled={isFrozen || selfScore >= config.maxScore}
                onClick={() => setSelfScore((s) => Math.min(config.maxScore, Math.round((s + 0.5) * 10) / 10))}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  border: `1px solid ${UI_COLORS.border}`,
                  backgroundColor: '#F8FAFC',
                  fontSize: '20px',
                  fontWeight: 700,
                  cursor: isFrozen ? 'not-allowed' : 'pointer',
                }}
              >
                +
              </button>
            </div>

            {/* Quick score chips */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
              {[7, 8, 8.5, 9, 9.5, 10].map((quick) => (
                <button
                  key={quick}
                  type="button"
                  disabled={isFrozen}
                  onClick={() => setSelfScore(quick)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${selfScore === quick ? UI_COLORS.primary : UI_COLORS.border}`,
                    backgroundColor: selfScore === quick ? '#EFF6FF' : '#FFFFFF',
                    color: selfScore === quick ? UI_COLORS.primary : UI_COLORS.text,
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: isFrozen ? 'not-allowed' : 'pointer',
                  }}
                >
                  {quick}đ
                </button>
              ))}
            </div>
          </div>

          {/* Ô nhận xét */}
          {config.allowFeedbackComment && (
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Tự nhận xét về phần việc của em trong nhóm:
              </label>
              <textarea
                rows={3}
                disabled={isFrozen}
                placeholder="VD: Em đã hoàn thành đúng hạn slide thuyết trình, phối hợp tốt cùng các bạn..."
                value={selfComment}
                onChange={(e) => setSelfComment(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: `1px solid ${UI_COLORS.border}`,
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'none',
                  boxSizing: 'border-box',
                }}
                data-testid="input-self-comment"
              />
            </div>
          )}

          <Button
            variant="primary"
            fullWidth
            disabled={isFrozen}
            style={{ minHeight: '48px', fontSize: '15px', fontWeight: 700 }}
            onClick={handleSaveSelfGrade}
            data-testid="btn-save-self-grade"
          >
            💾 {currentSelfGrade ? 'Cập nhật điểm tự chấm' : 'Lưu điểm tự chấm'}
          </Button>

          {/* Màn chúc mừng & Nút Đổi học sinh Kiosk */}
          {selfSaved && (
            <div
              style={{
                marginTop: '12px',
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#166534' }}>
                🎉 Bạn đã hoàn thành tự chấm điểm!
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#15803D' }}>
                Nếu dùng chung thiết bị, hãy bấm nút bên dưới để chuyển lượt cho bạn tiếp theo vào chấm nhé.
              </p>
              <Button
                variant="kahoot_green"
                fullWidth
                style={{ minHeight: '48px', fontSize: '15px', fontWeight: 700 }}
                onClick={() => setIsSwitchModalOpen(true)}
                data-testid="btn-kiosk-switch-after-self"
              >
                🔁 Hoàn thành & Đổi học sinh khác
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: NHÓM TRƯỞNG CHẤM ĐIỂM CÁC THÀNH VIÊN TRONG NHÓM */}
      {/* ============================================================ */}
      {isLeader && activeTab === 'members' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
          data-testid="section-member-grading"
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: UI_RADII.card,
              padding: '14px 16px',
              border: `1px solid ${UI_COLORS.border}`,
            }}
          >
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: UI_COLORS.text }}>
              2. Chấm điểm các thành viên trong nhóm
            </h4>
            <div style={{ fontSize: '12px', color: UI_COLORS.textMuted, marginTop: '2px' }}>
              Trọng số: {config.weights.teamMember}% • Đánh giá mức độ tích cực và đóng góp của từng bạn.
            </div>
          </div>

          {otherMembers.length === 0 ? (
            <div
              style={{
                padding: '32px',
                textAlign: 'center',
                backgroundColor: '#FFFFFF',
                borderRadius: UI_RADII.card,
                color: UI_COLORS.textMuted,
                fontSize: '14px',
              }}
            >
              Nhóm chỉ có mình bạn, không có thành viên khác cần chấm.
            </div>
          ) : (
            otherMembers.map((memberId, idx) => {
              const currentGrade = myTeamGrades[memberId];
              const score = memberScores[memberId] ?? 8.0;
              const comment = memberComments[memberId] ?? '';

              return (
                <div
                  key={memberId}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: UI_RADII.card,
                    padding: '16px',
                    border: `1px solid ${currentGrade ? '#86EFAC' : UI_COLORS.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: UI_COLORS.textMuted, fontWeight: 700 }}>
                        #{idx + 1}
                      </span>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: UI_COLORS.text }}>
                        Thành viên ({memberId.slice(-4)})
                      </span>
                    </div>

                    {currentGrade ? (
                      <span
                        style={{
                          fontSize: '11px',
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
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '8px',
                          backgroundColor: '#FEF3C7',
                          color: '#B45309',
                        }}
                      >
                        Chưa chấm
                      </span>
                    )}
                  </div>

                  {/* Chỉnh điểm thành viên */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      disabled={isFrozen || score <= 0}
                      onClick={() =>
                        setMemberScores((prev) => ({
                          ...prev,
                          [memberId]: Math.max(0, Math.round((score - 0.5) * 10) / 10),
                        }))
                      }
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        border: `1px solid ${UI_COLORS.border}`,
                        backgroundColor: '#F8FAFC',
                        fontSize: '18px',
                        fontWeight: 700,
                        cursor: isFrozen ? 'not-allowed' : 'pointer',
                      }}
                    >
                      -
                    </button>

                    <input
                      type="number"
                      step={config.stepScore}
                      min={0}
                      max={config.maxScore}
                      disabled={isFrozen}
                      value={score}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!Number.isNaN(val)) {
                          setMemberScores((prev) => ({ ...prev, [memberId]: val }));
                        }
                      }}
                      style={{
                        flex: 1,
                        height: '40px',
                        textAlign: 'center',
                        fontSize: '20px',
                        fontWeight: 800,
                        color: UI_COLORS.text,
                        borderRadius: '10px',
                        border: `1px solid ${UI_COLORS.border}`,
                      }}
                    />

                    <button
                      type="button"
                      disabled={isFrozen || score >= config.maxScore}
                      onClick={() =>
                        setMemberScores((prev) => ({
                          ...prev,
                          [memberId]: Math.min(config.maxScore, Math.round((score + 0.5) * 10) / 10),
                        }))
                      }
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        border: `1px solid ${UI_COLORS.border}`,
                        backgroundColor: '#F8FAFC',
                        fontSize: '18px',
                        fontWeight: 700,
                        cursor: isFrozen ? 'not-allowed' : 'pointer',
                      }}
                    >
                      +
                    </button>
                  </div>

                  {config.allowFeedbackComment && (
                    <input
                      type="text"
                      disabled={isFrozen}
                      placeholder="Nhận xét thành viên này (tùy chọn)..."
                      value={comment}
                      onChange={(e) =>
                        setMemberComments((prev) => ({ ...prev, [memberId]: e.target.value }))
                      }
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: `1px solid ${UI_COLORS.border}`,
                        fontSize: '13px',
                      }}
                    />
                  )}

                  <Button
                    variant="primary"
                    fullWidth
                    disabled={isFrozen}
                    style={{ minHeight: '44px' }}
                    onClick={() => handleSaveMemberGrade(memberId)}
                    data-testid={`btn-save-member-${memberId}`}
                  >
                    💾 Lưu điểm bạn này
                  </Button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: NHÓM TRƯỞNG CHẤM CHÉO CÁC NHÓM KHÁC TRONG LỚP */}
      {/* ============================================================ */}
      {isLeader && activeTab === 'cross' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
          data-testid="section-cross-grading"
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: UI_RADII.card,
              padding: '14px 16px',
              border: `1px solid ${UI_COLORS.border}`,
            }}
          >
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: UI_COLORS.text }}>
              3. Chấm điểm chéo các nhóm bạn
            </h4>
            <div style={{ fontSize: '12px', color: UI_COLORS.textMuted, marginTop: '2px' }}>
              Trọng số: {config.weights.crossTeam}% • Đánh giá sản phẩm và phần thuyết trình của nhóm khác.
            </div>
          </div>

          {otherGroups.length === 0 ? (
            <div
              style={{
                padding: '32px',
                textAlign: 'center',
                backgroundColor: '#FFFFFF',
                borderRadius: UI_RADII.card,
                color: UI_COLORS.textMuted,
                fontSize: '14px',
              }}
            >
              Lớp chưa có nhóm khác để chấm chéo.
            </div>
          ) : (
            otherGroups.map((g) => {
              const currentGrade = myCrossGrades[g.id];
              const score = crossScores[g.id] ?? 8.0;
              const comment = crossComments[g.id] ?? '';

              return (
                <div
                  key={g.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: UI_RADII.card,
                    padding: '16px',
                    border: `1px solid ${currentGrade ? '#86EFAC' : UI_COLORS.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: UI_COLORS.text }}>
                        {g.name}
                      </span>
                      {g.leaderDisplayName && (
                        <div style={{ fontSize: '12px', color: UI_COLORS.textMuted }}>
                          Nhóm trưởng: {g.leaderDisplayName}
                        </div>
                      )}
                    </div>

                    {currentGrade ? (
                      <span
                        style={{
                          fontSize: '11px',
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
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '8px',
                          backgroundColor: '#FEF3C7',
                          color: '#B45309',
                        }}
                      >
                        Chưa chấm
                      </span>
                    )}
                  </div>

                  {/* Chỉnh điểm nhóm bạn */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      disabled={isFrozen || score <= 0}
                      onClick={() =>
                        setCrossScores((prev) => ({
                          ...prev,
                          [g.id]: Math.max(0, Math.round((score - 0.5) * 10) / 10),
                        }))
                      }
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        border: `1px solid ${UI_COLORS.border}`,
                        backgroundColor: '#F8FAFC',
                        fontSize: '18px',
                        fontWeight: 700,
                        cursor: isFrozen ? 'not-allowed' : 'pointer',
                      }}
                    >
                      -
                    </button>

                    <input
                      type="number"
                      step={config.stepScore}
                      min={0}
                      max={config.maxScore}
                      disabled={isFrozen}
                      value={score}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!Number.isNaN(val)) {
                          setCrossScores((prev) => ({ ...prev, [g.id]: val }));
                        }
                      }}
                      style={{
                        flex: 1,
                        height: '40px',
                        textAlign: 'center',
                        fontSize: '20px',
                        fontWeight: 800,
                        color: UI_COLORS.secondary,
                        borderRadius: '10px',
                        border: `1px solid ${UI_COLORS.border}`,
                      }}
                    />

                    <button
                      type="button"
                      disabled={isFrozen || score >= config.maxScore}
                      onClick={() =>
                        setCrossScores((prev) => ({
                          ...prev,
                          [g.id]: Math.min(config.maxScore, Math.round((score + 0.5) * 10) / 10),
                        }))
                      }
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        border: `1px solid ${UI_COLORS.border}`,
                        backgroundColor: '#F8FAFC',
                        fontSize: '18px',
                        fontWeight: 700,
                        cursor: isFrozen ? 'not-allowed' : 'pointer',
                      }}
                    >
                      +
                    </button>
                  </div>

                  {config.allowFeedbackComment && (
                    <input
                      type="text"
                      disabled={isFrozen}
                      placeholder="Góp ý cho sản phẩm / thuyết trình nhóm bạn..."
                      value={comment}
                      onChange={(e) =>
                        setCrossComments((prev) => ({ ...prev, [g.id]: e.target.value }))
                      }
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: `1px solid ${UI_COLORS.border}`,
                        fontSize: '13px',
                      }}
                    />
                  )}

                  <Button
                    variant="primary"
                    fullWidth
                    disabled={isFrozen}
                    style={{ minHeight: '44px' }}
                    onClick={() => handleSaveCrossGrade(g.id)}
                    data-testid={`btn-save-cross-${g.id}`}
                  >
                    💾 Lưu điểm nhóm này
                  </Button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Nút thoát đổi học sinh Kiosk luôn sẵn sàng ở chân trang */}
      <div style={{ marginTop: '12px' }}>
        <Button
          variant="secondary"
          fullWidth
          style={{ minHeight: '48px', fontSize: '15px', fontWeight: 600 }}
          onClick={() => setIsSwitchModalOpen(true)}
          data-testid="btn-bottom-switch-student"
        >
          🔁 Đổi học sinh khác vào chấm
        </Button>
      </div>

      {isSwitchModalOpen && renderSwitchModal()}
    </div>
  );
};
