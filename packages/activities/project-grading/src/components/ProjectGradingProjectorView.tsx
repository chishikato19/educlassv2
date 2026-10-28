import React, { useState } from 'react';
import type { ProjectGradingState } from '@educlass/protocol';
import { calculateAllFinalScores, calculateGradingProgress } from '../project-grading-logic.js';

export interface ProjectGradingProjectorViewProps {
  runId?: string;
  state: ProjectGradingState;
  onClose?: () => void;
}

export const ProjectGradingProjectorView: React.FC<ProjectGradingProjectorViewProps> = ({
  state,
  onClose,
}) => {
  const { config, selfGrades, teamMemberGrades, crossTeamGrades, teacherGroupGrades } = state;
  const progress = calculateGradingProgress(state);
  const results = calculateAllFinalScores(state);

  // Chế độ hiển thị: 'matrix' (tiến độ các nhóm) hoặc 'podium' (bảng vàng vinh danh)
  const isFinished = state.status === 'ended';
  const [viewMode, setViewMode] = useState<'matrix' | 'podium'>(isFinished ? 'podium' : 'matrix');

  const top1 = results.find(r => r.rank === 1);
  const top2 = results.find(r => r.rank === 2);
  const top3 = results.find(r => r.rank === 3);

  return (
    <div
      style={{
        backgroundColor: '#0F172A',
        color: '#FFFFFF',
        minHeight: '100vh',
        width: '100%',
        padding: '24px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
      data-testid="project-grading-projector-view"
    >
      {/* 1. Thanh tiêu đề máy chiếu */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#1E293B',
          padding: '16px 24px',
          borderRadius: '20px',
          border: '1px solid #334155',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '32px' }}>📊</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: '#38BDF8' }}>
              {config.title}
            </h1>
            <div style={{ fontSize: '14px', color: '#94A3B8', marginTop: '4px' }}>
              Đánh giá đa chiều 4 cột điểm • Trọng số: Tự chấm ({config.weights.self}%) • Nhóm (
              {config.weights.teamMember}%) • Chéo ({config.weights.crossTeam}%) • GV (
              {config.weights.teacher}%)
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Nút chuyển chế độ xem */}
          <div
            style={{
              display: 'flex',
              backgroundColor: '#0F172A',
              borderRadius: '12px',
              padding: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              style={{
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: viewMode === 'matrix' ? '#38BDF8' : 'transparent',
                color: viewMode === 'matrix' ? '#0F172A' : '#94A3B8',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
              }}
              data-testid="btn-projector-matrix"
            >
              📋 Tiến độ các nhóm
            </button>
            <button
              type="button"
              onClick={() => setViewMode('podium')}
              style={{
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: viewMode === 'podium' ? '#F59E0B' : 'transparent',
                color: viewMode === 'podium' ? '#0F172A' : '#94A3B8',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
              }}
              data-testid="btn-projector-podium"
            >
              🏆 Bảng vàng vinh danh
            </button>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                border: 'none',
                backgroundColor: '#334155',
                color: '#FFFFFF',
                borderRadius: '12px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ✕ Đóng
            </button>
          )}
        </div>
      </div>

      {/* 2. Thanh đo tiến độ 3 chiều tổng thể */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Tự chấm */}
        <div
          style={{
            backgroundColor: '#1E293B',
            padding: '16px',
            borderRadius: '16px',
            border: '1px solid #334155',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '13px',
              color: '#94A3B8',
            }}
          >
            <span>👤 Học sinh tự chấm</span>
            <span style={{ fontWeight: 700, color: '#38BDF8' }}>
              {progress.selfGrading.percentage}%
            </span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, margin: '6px 0', color: '#FFFFFF' }}>
            {progress.selfGrading.submitted} / {progress.selfGrading.total}{' '}
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748B' }}>học sinh</span>
          </div>
          <div
            style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#334155',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress.selfGrading.percentage}%`,
                height: '100%',
                backgroundColor: '#38BDF8',
                transition: 'width 0.3s',
              }}
            />
          </div>
        </div>

        {/* Nhóm trưởng chấm thành viên */}
        <div
          style={{
            backgroundColor: '#1E293B',
            padding: '16px',
            borderRadius: '16px',
            border: '1px solid #334155',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '13px',
              color: '#94A3B8',
            }}
          >
            <span>👥 Tổ chấm thành viên</span>
            <span style={{ fontWeight: 700, color: '#A855F7' }}>
              {progress.teamMemberGrading.percentage}%
            </span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, margin: '6px 0', color: '#FFFFFF' }}>
            {progress.teamMemberGrading.submitted} / {progress.teamMemberGrading.total}{' '}
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748B' }}>lượt</span>
          </div>
          <div
            style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#334155',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress.teamMemberGrading.percentage}%`,
                height: '100%',
                backgroundColor: '#A855F7',
                transition: 'width 0.3s',
              }}
            />
          </div>
        </div>

        {/* Chấm chéo giữa các nhóm */}
        <div
          style={{
            backgroundColor: '#1E293B',
            padding: '16px',
            borderRadius: '16px',
            border: '1px solid #334155',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '13px',
              color: '#94A3B8',
            }}
          >
            <span>🔄 Chấm chéo nhóm bạn</span>
            <span style={{ fontWeight: 700, color: '#22C55E' }}>
              {progress.crossTeamGrading.percentage}%
            </span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, margin: '6px 0', color: '#FFFFFF' }}>
            {progress.crossTeamGrading.submitted} / {progress.crossTeamGrading.total}{' '}
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748B' }}>nhóm</span>
          </div>
          <div
            style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#334155',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress.crossTeamGrading.percentage}%`,
                height: '100%',
                backgroundColor: '#22C55E',
                transition: 'width 0.3s',
              }}
            />
          </div>
        </div>

        {/* Điểm Giáo viên */}
        <div
          style={{
            backgroundColor: '#1E293B',
            padding: '16px',
            borderRadius: '16px',
            border: '1px solid #334155',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '13px',
              color: '#94A3B8',
            }}
          >
            <span>🎓 Điểm Giáo viên</span>
            <span style={{ fontWeight: 700, color: '#F59E0B' }}>
              {Math.round(
                (progress.teacherGrading.groupsGraded /
                  Math.max(1, progress.teacherGrading.totalGroups)) *
                  100
              )}
              %
            </span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, margin: '6px 0', color: '#FFFFFF' }}>
            {progress.teacherGrading.groupsGraded} / {progress.teacherGrading.totalGroups}{' '}
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748B' }}>nhóm</span>
          </div>
          <div
            style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#334155',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.round((progress.teacherGrading.groupsGraded / Math.max(1, progress.teacherGrading.totalGroups)) * 100)}%`,
                height: '100%',
                backgroundColor: '#F59E0B',
                transition: 'width 0.3s',
              }}
            />
          </div>
        </div>
      </div>

      {/* 3. NỘI DUNG CHÍNH */}
      {viewMode === 'matrix' ? (
        /* CHẾ ĐỘ MA TRẬN CÁC NHÓM TRỰC QUAN */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '20px',
            flex: 1,
          }}
        >
          {config.groups.map(group => {
            const leaderId = group.leaderParticipantId;
            const myTeamScores = leaderId ? teamMemberGrades[leaderId] || {} : {};
            const myCrossScores = leaderId ? crossTeamGrades[leaderId] || {} : {};
            const teacherGrade = teacherGroupGrades[group.id];

            return (
              <div
                key={group.id}
                style={{
                  backgroundColor: '#1E293B',
                  borderRadius: '20px',
                  border: `2px solid ${leaderId ? '#3B82F6' : '#475569'}`,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                }}
              >
                {/* Header nhóm */}
                <div
                  style={{
                    padding: '16px 20px',
                    backgroundColor: '#0F172A',
                    borderBottom: '1px solid #334155',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF' }}>
                      {group.name}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        backgroundColor: '#334155',
                        color: '#94A3B8',
                      }}
                    >
                      {group.memberParticipantIds.length} HS
                    </span>
                  </div>

                  {teacherGrade ? (
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '10px',
                        backgroundColor: '#FEF3C7',
                        color: '#92400E',
                      }}
                    >
                      GV: {teacherGrade.score}đ
                    </span>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#64748B' }}>GV chưa chấm</span>
                  )}
                </div>

                {/* Nhóm trưởng */}
                <div
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#172554',
                    borderBottom: '1px solid #1E3A8A',
                    fontSize: '13px',
                    color: '#93C5FD',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>
                    ⭐ Nhóm trưởng: <strong>{group.leaderDisplayName || 'Chưa chỉ định'}</strong>
                  </span>
                  <span>
                    Chấm chéo:{' '}
                    <strong>
                      {Object.keys(myCrossScores).length}/{Math.max(0, config.groups.length - 1)}
                    </strong>
                  </span>
                </div>

                {/* Danh sách thành viên và trạng thái nộp */}
                <div
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    flex: 1,
                  }}
                >
                  {group.memberParticipantIds.map((mId, idx) => {
                    const isMLeader = mId === leaderId;
                    const hasSelfGraded = selfGrades[mId] !== undefined;
                    const hasTeamGraded = myTeamScores[mId] !== undefined;

                    return (
                      <div
                        key={mId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          backgroundColor: '#0F172A',
                          border: '1px solid #334155',
                          fontSize: '14px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ color: '#64748B', fontSize: '12px', minWidth: '16px' }}>
                            {idx + 1}.
                          </span>
                          <span
                            style={{
                              fontWeight: isMLeader ? 700 : 500,
                              color: isMLeader ? '#FDE047' : '#E2E8F0',
                            }}
                          >
                            Học sinh ({mId.slice(-4)})
                          </span>
                          {isMLeader && <span style={{ fontSize: '12px' }}>⭐</span>}
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          {/* Badge tự chấm */}
                          <span
                            title="Tự chấm cá nhân"
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '8px',
                              backgroundColor: hasSelfGraded ? '#052E16' : '#334155',
                              color: hasSelfGraded ? '#4ADE80' : '#94A3B8',
                              fontWeight: 600,
                            }}
                          >
                            {hasSelfGraded ? `Tự: ${selfGrades[mId]!.score}đ` : 'Tự: ⏳'}
                          </span>

                          {/* Badge nhóm chấm */}
                          {!isMLeader && (
                            <span
                              title="Tổ trưởng chấm"
                              style={{
                                fontSize: '11px',
                                padding: '2px 8px',
                                borderRadius: '8px',
                                backgroundColor: hasTeamGraded ? '#3B0764' : '#334155',
                                color: hasTeamGraded ? '#C084FC' : '#94A3B8',
                                fontWeight: 600,
                              }}
                            >
                              {hasTeamGraded ? `Tổ: ${myTeamScores[mId]!.score}đ` : 'Tổ: ⏳'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* CHẾ ĐỘ BẢNG VÀNG VINH DANH (PODIUM & LEADERBOARD) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
          {/* Bục Vinh Quang Top 3 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-end',
              gap: '24px',
              padding: '30px 20px 0',
              minHeight: '260px',
            }}
          >
            {/* Top 2: Bạc */}
            {top2 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '180px',
                }}
              >
                <div style={{ fontSize: '40px' }}>🥈</div>
                <div
                  style={{ fontSize: '15px', fontWeight: 700, color: '#E2E8F0', marginTop: '4px' }}
                >
                  {top2.displayName}
                </div>
                <div style={{ fontSize: '12px', color: '#94A3B8' }}>{top2.groupName}</div>
                <div
                  style={{ fontSize: '22px', fontWeight: 900, color: '#CBD5E1', margin: '8px 0' }}
                >
                  {top2.finalScore}đ
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '110px',
                    background: 'linear-gradient(180deg, #94A3B8 0%, #475569 100%)',
                    borderRadius: '16px 16px 0 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    fontWeight: 900,
                    color: '#0F172A',
                  }}
                >
                  2
                </div>
              </div>
            )}

            {/* Top 1: Vàng - Cao nhất ở giữa */}
            {top1 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '200px',
                }}
              >
                <div style={{ fontSize: '50px' }}>👑</div>
                <div
                  style={{ fontSize: '18px', fontWeight: 800, color: '#FDE047', marginTop: '4px' }}
                >
                  {top1.displayName}
                </div>
                <div style={{ fontSize: '13px', color: '#FEF08A' }}>{top1.groupName}</div>
                <div
                  style={{ fontSize: '28px', fontWeight: 900, color: '#FACC15', margin: '8px 0' }}
                >
                  {top1.finalScore}đ
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '150px',
                    background: 'linear-gradient(180deg, #FACC15 0%, #CA8A04 100%)',
                    borderRadius: '16px 16px 0 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '36px',
                    fontWeight: 900,
                    color: '#0F172A',
                    boxShadow: '0 0 30px rgba(250, 204, 21, 0.4)',
                  }}
                >
                  1
                </div>
              </div>
            )}

            {/* Top 3: Đồng */}
            {top3 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '180px',
                }}
              >
                <div style={{ fontSize: '40px' }}>🥉</div>
                <div
                  style={{ fontSize: '15px', fontWeight: 700, color: '#E2E8F0', marginTop: '4px' }}
                >
                  {top3.displayName}
                </div>
                <div style={{ fontSize: '12px', color: '#94A3B8' }}>{top3.groupName}</div>
                <div
                  style={{ fontSize: '22px', fontWeight: 900, color: '#F97316', margin: '8px 0' }}
                >
                  {top3.finalScore}đ
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '80px',
                    background: 'linear-gradient(180deg, #EA580C 0%, #9A3412 100%)',
                    borderRadius: '16px 16px 0 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    fontWeight: 900,
                    color: '#0F172A',
                  }}
                >
                  3
                </div>
              </div>
            )}
          </div>

          {/* Bảng Chi Tiết Điểm Toàn Lớp */}
          <div
            style={{
              backgroundColor: '#1E293B',
              borderRadius: '20px',
              padding: '20px',
              border: '1px solid #334155',
              overflowX: 'auto',
            }}
          >
            <h3
              style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700, color: '#38BDF8' }}
            >
              📋 Bảng Điểm Chi Tiết 4 Cột Toàn Lớp
            </h3>

            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '14px',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '2px solid #334155', color: '#94A3B8' }}>
                  <th style={{ padding: '10px 12px' }}>Hạng</th>
                  <th style={{ padding: '10px 12px' }}>Học sinh</th>
                  <th style={{ padding: '10px 12px' }}>Nhóm</th>
                  <th style={{ padding: '10px 12px' }}>Tự chấm</th>
                  <th style={{ padding: '10px 12px' }}>Tổ chấm</th>
                  <th style={{ padding: '10px 12px' }}>Chéo nhóm</th>
                  <th style={{ padding: '10px 12px' }}>Giáo viên</th>
                  <th style={{ padding: '10px 12px', color: '#38BDF8' }}>TỔNG KẾT</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.participantId} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '12px', fontWeight: 800 }}>
                      {r.rank === 1
                        ? '🥇 1'
                        : r.rank === 2
                          ? '🥈 2'
                          : r.rank === 3
                            ? '🥉 3'
                            : `#${r.rank}`}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 600, color: '#FFFFFF' }}>
                      {r.displayName} {r.isLeader && '⭐'}
                    </td>
                    <td style={{ padding: '12px', color: '#94A3B8' }}>{r.groupName}</td>
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
                        color: '#38BDF8',
                      }}
                    >
                      {r.finalScore}đ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
