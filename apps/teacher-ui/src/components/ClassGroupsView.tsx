import React, { useCallback, useEffect, useState } from 'react';
import type {
  ClassGroupDto,
  ClassGroupOverviewResponse,
  ClassGroupWithMembersDto,
  StudentDto,
} from '@educlass/protocol';
import { Button, Input, Modal, UI_COLORS } from '@educlass/ui-kit';
import { api } from '../api/client.js';

export interface ClassGroupsViewProps {
  classId: string;
  className: string;
  students: StudentDto[];
  onShowToast: (msg: string) => void;
}

export const ClassGroupsView: React.FC<ClassGroupsViewProps> = ({
  classId,
  className,
  students,
  onShowToast,
}) => {
  const [overview, setOverview] = useState<ClassGroupOverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Modal chia ngẫu nhiên
  const [isRandomizeOpen, setIsRandomizeOpen] = useState(false);
  const [groupCount, setGroupCount] = useState<number>(4);
  const [namingStyle, setNamingStyle] = useState<'nhom' | 'to'>('nhom');
  const [autoAssignLeader, setAutoAssignLeader] = useState<boolean>(true);
  const [isRandomizing, setIsRandomizing] = useState(false);

  // Modal tạo nhóm mới
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isAddingGroup, setIsAddingGroup] = useState(false);

  // Modal sửa tên nhóm
  const [editingGroup, setEditingGroup] = useState<ClassGroupDto | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Trạng thái menu chuyển nhóm cho học sinh: studentId -> boolean
  const [activeMoveMenuStudentId, setActiveMoveMenuStudentId] = useState<string | null>(null);

  // Load danh sách nhóm
  const loadGroups = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const data = await api.getClassGroups(classId);
      setOverview(data);
    } catch (err: unknown) {
      onShowToast(err instanceof Error ? err.message : 'Không thể tải danh sách nhóm');
    } finally {
      setLoading(false);
    }
  }, [classId, onShowToast]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  // Xử lý chia ngẫu nhiên
  const handleRandomize = async () => {
    if (students.length === 0) {
      onShowToast('Lớp học chưa có học sinh nào để chia nhóm');
      return;
    }
    const count = Math.max(2, Math.min(groupCount, 20));
    const prefix = namingStyle === 'to' ? 'Tổ' : 'Nhóm';
    const names = Array.from({ length: count }, (_, i) => `${prefix} ${i + 1}`);

    setIsRandomizing(true);
    try {
      const res = await api.randomizeClassGroups(classId, {
        groupCount: count,
        groupNames: names,
        autoAssignLeader,
      });
      setOverview(res);
      setIsRandomizeOpen(false);
      onShowToast(`Đã chia đều ${students.length} học sinh vào ${count} nhóm thành công!`);
    } catch (err: unknown) {
      onShowToast(err instanceof Error ? err.message : 'Lỗi khi chia nhóm ngẫu nhiên');
    } finally {
      setIsRandomizing(false);
    }
  };

  // Xử lý tạo nhóm mới thủ công
  const handleCreateGroup = async () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) {
      onShowToast('Vui lòng nhập tên nhóm');
      return;
    }
    setIsAddingGroup(true);
    try {
      await api.createClassGroup(classId, { name: trimmed });
      setNewGroupName('');
      setIsAddGroupOpen(false);
      onShowToast(`Đã tạo nhóm "${trimmed}" thành công!`);
      await loadGroups();
    } catch (err: unknown) {
      onShowToast(err instanceof Error ? err.message : 'Lỗi khi tạo nhóm mới');
    } finally {
      setIsAddingGroup(false);
    }
  };

  // Xử lý sửa tên nhóm
  const handleUpdateGroupName = async () => {
    if (!editingGroup) return;
    const trimmed = editGroupName.trim();
    if (!trimmed) {
      onShowToast('Tên nhóm không được để trống');
      return;
    }
    setIsSavingEdit(true);
    try {
      await api.updateClassGroup(editingGroup.id, { name: trimmed });
      setEditingGroup(null);
      onShowToast('Cập nhật tên nhóm thành công!');
      await loadGroups();
    } catch (err: unknown) {
      onShowToast(err instanceof Error ? err.message : 'Lỗi khi đổi tên nhóm');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Xử lý xóa nhóm
  const handleDeleteGroup = async (group: ClassGroupDto) => {
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa "${group.name}"? Các bạn trong nhóm sẽ trở về trạng thái chưa phân nhóm.`
      )
    ) {
      return;
    }
    try {
      await api.deleteClassGroup(group.id);
      onShowToast(`Đã xóa nhóm "${group.name}"`);
      await loadGroups();
    } catch (err: unknown) {
      onShowToast(err instanceof Error ? err.message : 'Lỗi khi xóa nhóm');
    }
  };

  // Chỉ định nhóm trưởng
  const handleSetLeader = async (
    groupId: string,
    studentId: string | null,
    currentLeaderId?: string | null
  ) => {
    try {
      // Nếu click vào chính nhóm trưởng hiện tại -> Hủy nhóm trưởng
      const targetLeaderId = currentLeaderId === studentId ? null : studentId;
      await api.assignGroupLeader(groupId, targetLeaderId);
      onShowToast(targetLeaderId ? 'Đã chỉ định nhóm trưởng mới ⭐' : 'Đã hủy nhóm trưởng');
      await loadGroups();
    } catch (err: unknown) {
      onShowToast(err instanceof Error ? err.message : 'Lỗi khi chỉ định nhóm trưởng');
    }
  };

  // Chuyển nhóm cho học sinh
  const handleMoveStudent = async (studentId: string, targetGroupId: string | null) => {
    setActiveMoveMenuStudentId(null);
    try {
      await api.assignStudentGroup(studentId, targetGroupId);
      onShowToast('Đã di chuyển học sinh thành công!');
      await loadGroups();
    } catch (err: unknown) {
      onShowToast(err instanceof Error ? err.message : 'Lỗi khi chuyển nhóm');
    }
  };

  const totalGroups = overview?.groups.length ?? 0;
  const unassignedCount = overview?.unassignedStudents.length ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Thanh điều khiển nhóm */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '16px',
          backgroundColor: '#F8FAFC',
          borderRadius: '16px',
          border: `1px solid ${UI_COLORS.border}`,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: UI_COLORS.text }}>
              👥 Tổ / Nhóm học tập lớp {className}
            </span>
            <span
              style={{
                fontSize: '12px',
                padding: '4px 8px',
                borderRadius: '8px',
                backgroundColor: totalGroups > 0 ? '#E0F2FE' : '#F1F5F9',
                color: totalGroups > 0 ? '#0369A1' : UI_COLORS.textMuted,
                fontWeight: 600,
              }}
            >
              {totalGroups} nhóm
            </span>
          </div>
          <div style={{ fontSize: '13px', color: UI_COLORS.textMuted, marginTop: '4px' }}>
            {students.length} học sinh
            {unassignedCount > 0 && (
              <span style={{ color: '#EA580C', fontWeight: 600, marginLeft: '6px' }}>
                (⚠️ {unassignedCount} bạn chưa phân nhóm)
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            variant="primary"
            onClick={() => {
              setGroupCount(totalGroups > 0 ? totalGroups : 4);
              setIsRandomizeOpen(true);
            }}
            data-testid="btn-randomize-groups"
          >
            🎲 Chia đều ngẫu nhiên
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setNewGroupName(`Nhóm ${totalGroups + 1}`);
              setIsAddGroupOpen(true);
            }}
            data-testid="btn-add-group"
          >
            + Thêm nhóm
          </Button>
          <Button variant="secondary" onClick={() => void loadGroups()}>
            🔄 Tải lại
          </Button>
        </div>
      </div>

      {/* Cảnh báo học sinh chưa phân nhóm */}
      {unassignedCount > 0 && (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#FFF7ED',
            border: '1px solid #FFEDD5',
            borderRadius: '16px',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#C2410C', marginBottom: '8px' }}>
            ⚠️ Học sinh chưa phân nhóm ({unassignedCount} bạn):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {overview?.unassignedStudents.map(st => (
              <div
                key={st.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #FDBA74',
                  fontSize: '13px',
                }}
              >
                <span style={{ fontWeight: 600 }}>{st.fullName}</span>
                {totalGroups > 0 ? (
                  <select
                    style={{
                      padding: '4px 8px',
                      borderRadius: '8px',
                      border: `1px solid ${UI_COLORS.border}`,
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                    value=""
                    onChange={e => {
                      if (e.target.value) {
                        void handleMoveStudent(st.id, e.target.value);
                      }
                    }}
                  >
                    <option value="" disabled>
                      + Vào nhóm...
                    </option>
                    {overview?.groups.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span style={{ fontSize: '11px', color: UI_COLORS.textMuted }}>
                    (Tạo nhóm để thêm)
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Danh sách các nhóm */}
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: UI_COLORS.textMuted }}>
          Đang tải cấu trúc nhóm...
        </div>
      ) : totalGroups === 0 ? (
        <div
          style={{
            padding: '48px',
            textAlign: 'center',
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: `2px dashed ${UI_COLORS.border}`,
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>👥</div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Lớp chưa phân nhóm</h3>
          <p
            style={{
              color: UI_COLORS.textMuted,
              fontSize: '14px',
              maxWidth: '400px',
              margin: '8px auto 20px',
            }}
          >
            Tạo các nhóm học tập để tổ chức dự án, thảo luận hoặc hoạt động nhóm. Bạn có thể chia
            đều ngẫu nhiên chỉ với 1 cú click!
          </p>
          <Button
            variant="primary"
            onClick={() => {
              setGroupCount(4);
              setIsRandomizeOpen(true);
            }}
          >
            🎲 Chia đều ngẫu nhiên 4 nhóm ngay
          </Button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px',
            alignItems: 'start',
          }}
        >
          {overview?.groups.map((item: ClassGroupWithMembersDto) => {
            const { members, leader } = item;
            const group = item;
            return (
              <div
                key={group.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  border: `2px solid ${leader ? '#FEF08A' : UI_COLORS.border}`,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Header nhóm */}
                <div
                  style={{
                    padding: '14px 16px',
                    backgroundColor: leader ? '#FEF9C3' : '#F8FAFC',
                    borderBottom: `1px solid ${UI_COLORS.border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: UI_COLORS.text }}>
                      {group.name}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        backgroundColor: '#FFFFFF',
                        border: `1px solid ${UI_COLORS.border}`,
                        color: UI_COLORS.textMuted,
                        fontWeight: 600,
                      }}
                    >
                      {members.length} HS
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      title="Sửa tên nhóm"
                      onClick={() => {
                        setEditingGroup(group);
                        setEditGroupName(group.name);
                      }}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        padding: '4px 6px',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      title="Xóa nhóm này"
                      onClick={() => void handleDeleteGroup(group)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        padding: '4px 6px',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Banner Nhóm trưởng */}
                <div
                  style={{
                    padding: '8px 16px',
                    backgroundColor: leader ? '#FEFCE8' : '#F1F5F9',
                    fontSize: '12px',
                    color: leader ? '#854D0E' : UI_COLORS.textMuted,
                    borderBottom: `1px solid ${UI_COLORS.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>⭐</span>
                  {leader ? (
                    <span>
                      Nhóm trưởng: <strong>{leader.fullName}</strong>
                    </span>
                  ) : (
                    <span>Chưa có nhóm trưởng (Bấm ⭐ cạnh tên bạn bất kỳ)</span>
                  )}
                </div>

                {/* Danh sách thành viên */}
                <div
                  style={{
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    minHeight: '120px',
                  }}
                >
                  {members.length === 0 ? (
                    <div
                      style={{
                        padding: '24px 0',
                        textAlign: 'center',
                        color: UI_COLORS.textMuted,
                        fontSize: '13px',
                      }}
                    >
                      Chưa có thành viên nào
                    </div>
                  ) : (
                    members.map((st, idx) => {
                      const isLeader = group.leaderStudentId === st.id;
                      const isMenuOpen = activeMoveMenuStudentId === st.id;

                      return (
                        <div
                          key={st.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            backgroundColor: isLeader ? '#FFFBEB' : '#F8FAFC',
                            border: `1px solid ${isLeader ? '#FDE68A' : '#E2E8F0'}`,
                            fontSize: '13px',
                            position: 'relative',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                color: UI_COLORS.textMuted,
                                minWidth: '16px',
                              }}
                            >
                              {idx + 1}.
                            </span>
                            <span
                              style={{ fontWeight: isLeader ? 700 : 500, color: UI_COLORS.text }}
                            >
                              {st.fullName}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {/* Nút phong nhóm trưởng */}
                            <button
                              type="button"
                              onClick={() =>
                                void handleSetLeader(group.id, st.id, group.leaderStudentId)
                              }
                              title={isLeader ? 'Hủy quyền Nhóm trưởng' : 'Đặt làm Nhóm trưởng ⭐'}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                fontSize: '16px',
                                padding: '2px 4px',
                                borderRadius: '4px',
                                opacity: isLeader ? 1 : 0.4,
                                transition: 'opacity 0.2s',
                              }}
                            >
                              ⭐
                            </button>

                            {/* Nút chuyển nhóm */}
                            <div style={{ position: 'relative' }}>
                              <button
                                type="button"
                                title="Chuyển sang nhóm khác"
                                onClick={() =>
                                  setActiveMoveMenuStudentId(isMenuOpen ? null : st.id)
                                }
                                style={{
                                  border: `1px solid ${UI_COLORS.border}`,
                                  background: '#FFFFFF',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  color: UI_COLORS.text,
                                  fontWeight: 600,
                                }}
                              >
                                ⇄ Chuyển
                              </button>

                              {isMenuOpen && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: '100%',
                                    marginTop: '4px',
                                    backgroundColor: '#FFFFFF',
                                    borderRadius: '10px',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                                    border: `1px solid ${UI_COLORS.border}`,
                                    zIndex: 50,
                                    minWidth: '160px',
                                    padding: '4px',
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: '11px',
                                      color: UI_COLORS.textMuted,
                                      padding: '4px 8px',
                                    }}
                                  >
                                    Chuyển {st.fullName} sang:
                                  </div>
                                  {overview.groups
                                    .filter(g => g.id !== group.id)
                                    .map(targetG => (
                                      <button
                                        key={targetG.id}
                                        type="button"
                                        onClick={() => void handleMoveStudent(st.id, targetG.id)}
                                        style={{
                                          display: 'block',
                                          width: '100%',
                                          textAlign: 'left',
                                          padding: '6px 8px',
                                          borderRadius: '6px',
                                          border: 'none',
                                          background: 'transparent',
                                          cursor: 'pointer',
                                          fontSize: '12px',
                                          fontWeight: 500,
                                        }}
                                        onMouseEnter={e =>
                                          (e.currentTarget.style.backgroundColor = '#EFF6FF')
                                        }
                                        onMouseLeave={e =>
                                          (e.currentTarget.style.backgroundColor = 'transparent')
                                        }
                                      >
                                        👉 {targetG.name}
                                      </button>
                                    ))}
                                  <div
                                    style={{
                                      borderTop: `1px solid ${UI_COLORS.border}`,
                                      margin: '4px 0',
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => void handleMoveStudent(st.id, null)}
                                    style={{
                                      display: 'block',
                                      width: '100%',
                                      textAlign: 'left',
                                      padding: '6px 8px',
                                      borderRadius: '6px',
                                      border: 'none',
                                      background: 'transparent',
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                      color: '#DC2626',
                                    }}
                                    onMouseEnter={e =>
                                      (e.currentTarget.style.backgroundColor = '#FEE2E2')
                                    }
                                    onMouseLeave={e =>
                                      (e.currentTarget.style.backgroundColor = 'transparent')
                                    }
                                  >
                                    ❌ Bỏ khỏi nhóm
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Chia đều ngẫu nhiên */}
      {isRandomizeOpen && (
        <Modal
          title="🎲 Chia đều ngẫu nhiên vào các nhóm"
          isOpen={isRandomizeOpen}
          onClose={() => setIsRandomizeOpen(false)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '14px', color: UI_COLORS.textMuted, margin: 0 }}>
              Hệ thống sẽ xáo trộn ngẫu nhiên toàn bộ <strong>{students.length} học sinh</strong>{' '}
              của lớp {className} và chia đều sĩ số vào số lượng nhóm bạn chọn.
            </p>

            {/* Bộ chọn số lượng nhóm (Customizable Group Count) */}
            <div>
              <label
                style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}
              >
                Số nhóm / tổ cần chia:
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setGroupCount(prev => Math.max(2, prev - 1))}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    border: `1px solid ${UI_COLORS.border}`,
                    backgroundColor: '#F8FAFC',
                    fontSize: '18px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  -
                </button>
                <div
                  style={{
                    fontSize: '22px',
                    fontWeight: 800,
                    minWidth: '40px',
                    textAlign: 'center',
                  }}
                >
                  {groupCount}
                </div>
                <button
                  type="button"
                  onClick={() => setGroupCount(prev => Math.min(20, prev + 1))}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    border: `1px solid ${UI_COLORS.border}`,
                    backgroundColor: '#F8FAFC',
                    fontSize: '18px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  +
                </button>
                <span style={{ fontSize: '13px', color: UI_COLORS.textMuted }}>
                  (Tối thiểu 2, tối đa 20 nhóm)
                </span>
              </div>
            </div>

            {/* Dự tính sĩ số mỗi nhóm */}
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#EFF6FF',
                borderRadius: '12px',
                border: '1px solid #BFDBFE',
                fontSize: '13px',
                color: '#1D4ED8',
              }}
            >
              💡 <strong>Dự tính phân bổ:</strong> Mỗi nhóm khoảng{' '}
              <strong>{Math.floor(students.length / Math.max(1, groupCount))}</strong> đến{' '}
              <strong>{Math.ceil(students.length / Math.max(1, groupCount))}</strong> học sinh
              (chênh lệch tối đa 1 bạn).
            </div>

            {/* Phong cách đặt tên */}
            <div>
              <label
                style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}
              >
                Phong cách đặt tên nhóm:
              </label>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  <input
                    type="radio"
                    name="namingStyle"
                    checked={namingStyle === 'nhom'}
                    onChange={() => setNamingStyle('nhom')}
                  />
                  Nhóm 1, Nhóm 2, Nhóm 3...
                </label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  <input
                    type="radio"
                    name="namingStyle"
                    checked={namingStyle === 'to'}
                    onChange={() => setNamingStyle('to')}
                  />
                  Tổ 1, Tổ 2, Tổ 3...
                </label>
              </div>
            </div>

            {/* Tự động chỉ định nhóm trưởng */}
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                <input
                  type="checkbox"
                  checked={autoAssignLeader}
                  onChange={e => setAutoAssignLeader(e.target.checked)}
                />
                <span style={{ fontWeight: 600 }}>
                  Tự động chọn ngẫu nhiên 1 nhóm trưởng cho mỗi nhóm ⭐
                </span>
              </label>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                marginTop: '12px',
              }}
            >
              <Button variant="secondary" onClick={() => setIsRandomizeOpen(false)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleRandomize()}
                disabled={isRandomizing}
              >
                {isRandomizing ? 'Đang chia...' : `🎲 Tiến hành chia ${groupCount} nhóm`}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Thêm nhóm mới */}
      {isAddGroupOpen && (
        <Modal
          title="+ Thêm nhóm học tập mới"
          isOpen={isAddGroupOpen}
          onClose={() => setIsAddGroupOpen(false)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input
              label="Tên nhóm mới:"
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              placeholder="VD: Nhóm 5, Tổ 5, Nhóm Stem..."
              autoFocus
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <Button variant="secondary" onClick={() => setIsAddGroupOpen(false)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleCreateGroup()}
                disabled={isAddingGroup}
              >
                {isAddingGroup ? 'Đang tạo...' : 'Tạo nhóm'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Sửa tên nhóm */}
      {editingGroup && (
        <Modal
          title="✏️ Đổi tên nhóm"
          isOpen={Boolean(editingGroup)}
          onClose={() => setEditingGroup(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input
              label="Tên nhóm:"
              value={editGroupName}
              onChange={e => setEditGroupName(e.target.value)}
              placeholder="Nhập tên nhóm..."
              autoFocus
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <Button variant="secondary" onClick={() => setEditingGroup(null)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleUpdateGroupName()}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? 'Đang lưu...' : 'Lưu tên nhóm'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
