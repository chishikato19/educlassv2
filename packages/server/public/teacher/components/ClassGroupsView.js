import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { Button, Input, Modal, UI_COLORS } from '@educlass/ui-kit';
import { api } from '../api/client.js';
export const ClassGroupsView = ({ classId, className, students, onShowToast, }) => {
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(false);
    // Modal chia ngẫu nhiên
    const [isRandomizeOpen, setIsRandomizeOpen] = useState(false);
    const [groupCount, setGroupCount] = useState(4);
    const [namingStyle, setNamingStyle] = useState('nhom');
    const [autoAssignLeader, setAutoAssignLeader] = useState(true);
    const [isRandomizing, setIsRandomizing] = useState(false);
    // Modal tạo nhóm mới
    const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [isAddingGroup, setIsAddingGroup] = useState(false);
    // Modal sửa tên nhóm
    const [editingGroup, setEditingGroup] = useState(null);
    const [editGroupName, setEditGroupName] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    // Trạng thái menu chuyển nhóm cho học sinh: studentId -> boolean
    const [activeMoveMenuStudentId, setActiveMoveMenuStudentId] = useState(null);
    // Load danh sách nhóm
    const loadGroups = useCallback(async () => {
        if (!classId)
            return;
        setLoading(true);
        try {
            const data = await api.getClassGroups(classId);
            setOverview(data);
        }
        catch (err) {
            onShowToast(err instanceof Error ? err.message : 'Không thể tải danh sách nhóm');
        }
        finally {
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
        }
        catch (err) {
            onShowToast(err instanceof Error ? err.message : 'Lỗi khi chia nhóm ngẫu nhiên');
        }
        finally {
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
        }
        catch (err) {
            onShowToast(err instanceof Error ? err.message : 'Lỗi khi tạo nhóm mới');
        }
        finally {
            setIsAddingGroup(false);
        }
    };
    // Xử lý sửa tên nhóm
    const handleUpdateGroupName = async () => {
        if (!editingGroup)
            return;
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
        }
        catch (err) {
            onShowToast(err instanceof Error ? err.message : 'Lỗi khi đổi tên nhóm');
        }
        finally {
            setIsSavingEdit(false);
        }
    };
    // Xử lý xóa nhóm
    const handleDeleteGroup = async (group) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa "${group.name}"? Các bạn trong nhóm sẽ trở về trạng thái chưa phân nhóm.`)) {
            return;
        }
        try {
            await api.deleteClassGroup(group.id);
            onShowToast(`Đã xóa nhóm "${group.name}"`);
            await loadGroups();
        }
        catch (err) {
            onShowToast(err instanceof Error ? err.message : 'Lỗi khi xóa nhóm');
        }
    };
    // Chỉ định nhóm trưởng
    const handleSetLeader = async (groupId, studentId, currentLeaderId) => {
        try {
            // Nếu click vào chính nhóm trưởng hiện tại -> Hủy nhóm trưởng
            const targetLeaderId = currentLeaderId === studentId ? null : studentId;
            await api.assignGroupLeader(groupId, targetLeaderId);
            onShowToast(targetLeaderId ? 'Đã chỉ định nhóm trưởng mới ⭐' : 'Đã hủy nhóm trưởng');
            await loadGroups();
        }
        catch (err) {
            onShowToast(err instanceof Error ? err.message : 'Lỗi khi chỉ định nhóm trưởng');
        }
    };
    // Chuyển nhóm cho học sinh
    const handleMoveStudent = async (studentId, targetGroupId) => {
        setActiveMoveMenuStudentId(null);
        try {
            await api.assignStudentGroup(studentId, targetGroupId);
            onShowToast('Đã di chuyển học sinh thành công!');
            await loadGroups();
        }
        catch (err) {
            onShowToast(err instanceof Error ? err.message : 'Lỗi khi chuyển nhóm');
        }
    };
    const totalGroups = overview?.groups.length ?? 0;
    const unassignedCount = overview?.unassignedStudents.length ?? 0;
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '20px' }, children: [_jsxs("div", { style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    padding: '16px',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '16px',
                    border: `1px solid ${UI_COLORS.border}`,
                }, children: [_jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsxs("span", { style: { fontSize: '18px', fontWeight: 700, color: UI_COLORS.text }, children: ["\uD83D\uDC65 T\u1ED5 / Nh\u00F3m h\u1ECDc t\u1EADp l\u1EDBp ", className] }), _jsxs("span", { style: {
                                            fontSize: '12px',
                                            padding: '4px 8px',
                                            borderRadius: '8px',
                                            backgroundColor: totalGroups > 0 ? '#E0F2FE' : '#F1F5F9',
                                            color: totalGroups > 0 ? '#0369A1' : UI_COLORS.textMuted,
                                            fontWeight: 600,
                                        }, children: [totalGroups, " nh\u00F3m"] })] }), _jsxs("div", { style: { fontSize: '13px', color: UI_COLORS.textMuted, marginTop: '4px' }, children: [students.length, " h\u1ECDc sinh", unassignedCount > 0 && (_jsxs("span", { style: { color: '#EA580C', fontWeight: 600, marginLeft: '6px' }, children: ["(\u26A0\uFE0F ", unassignedCount, " b\u1EA1n ch\u01B0a ph\u00E2n nh\u00F3m)"] }))] })] }), _jsxs("div", { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' }, children: [_jsx(Button, { variant: "primary", onClick: () => {
                                    setGroupCount(totalGroups > 0 ? totalGroups : 4);
                                    setIsRandomizeOpen(true);
                                }, "data-testid": "btn-randomize-groups", children: "\uD83C\uDFB2 Chia \u0111\u1EC1u ng\u1EABu nhi\u00EAn" }), _jsx(Button, { variant: "secondary", onClick: () => {
                                    setNewGroupName(`Nhóm ${totalGroups + 1}`);
                                    setIsAddGroupOpen(true);
                                }, "data-testid": "btn-add-group", children: "+ Th\u00EAm nh\u00F3m" }), _jsx(Button, { variant: "secondary", onClick: () => void loadGroups(), children: "\uD83D\uDD04 T\u1EA3i l\u1EA1i" })] })] }), unassignedCount > 0 && (_jsxs("div", { style: {
                    padding: '16px',
                    backgroundColor: '#FFF7ED',
                    border: '1px solid #FFEDD5',
                    borderRadius: '16px',
                }, children: [_jsxs("div", { style: { fontSize: '14px', fontWeight: 700, color: '#C2410C', marginBottom: '8px' }, children: ["\u26A0\uFE0F H\u1ECDc sinh ch\u01B0a ph\u00E2n nh\u00F3m (", unassignedCount, " b\u1EA1n):"] }), _jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' }, children: overview?.unassignedStudents.map(st => (_jsxs("div", { style: {
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 12px',
                                backgroundColor: '#FFFFFF',
                                borderRadius: '12px',
                                border: '1px solid #FDBA74',
                                fontSize: '13px',
                            }, children: [_jsx("span", { style: { fontWeight: 600 }, children: st.fullName }), totalGroups > 0 ? (_jsxs("select", { style: {
                                        padding: '4px 8px',
                                        borderRadius: '8px',
                                        border: `1px solid ${UI_COLORS.border}`,
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                    }, value: "", onChange: e => {
                                        if (e.target.value) {
                                            void handleMoveStudent(st.id, e.target.value);
                                        }
                                    }, children: [_jsx("option", { value: "", disabled: true, children: "+ V\u00E0o nh\u00F3m..." }), overview?.groups.map(g => (_jsx("option", { value: g.id, children: g.name }, g.id)))] })) : (_jsx("span", { style: { fontSize: '11px', color: UI_COLORS.textMuted }, children: "(T\u1EA1o nh\u00F3m \u0111\u1EC3 th\u00EAm)" }))] }, st.id))) })] })), loading ? (_jsx("div", { style: { padding: '48px', textAlign: 'center', color: UI_COLORS.textMuted }, children: "\u0110ang t\u1EA3i c\u1EA5u tr\u00FAc nh\u00F3m..." })) : totalGroups === 0 ? (_jsxs("div", { style: {
                    padding: '48px',
                    textAlign: 'center',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    border: `2px dashed ${UI_COLORS.border}`,
                }, children: [_jsx("div", { style: { fontSize: '40px', marginBottom: '12px' }, children: "\uD83D\uDC65" }), _jsx("h3", { style: { margin: 0, fontSize: '18px', fontWeight: 700 }, children: "L\u1EDBp ch\u01B0a ph\u00E2n nh\u00F3m" }), _jsx("p", { style: {
                            color: UI_COLORS.textMuted,
                            fontSize: '14px',
                            maxWidth: '400px',
                            margin: '8px auto 20px',
                        }, children: "T\u1EA1o c\u00E1c nh\u00F3m h\u1ECDc t\u1EADp \u0111\u1EC3 t\u1ED5 ch\u1EE9c d\u1EF1 \u00E1n, th\u1EA3o lu\u1EADn ho\u1EB7c ho\u1EA1t \u0111\u1ED9ng nh\u00F3m. B\u1EA1n c\u00F3 th\u1EC3 chia \u0111\u1EC1u ng\u1EABu nhi\u00EAn ch\u1EC9 v\u1EDBi 1 c\u00FA click!" }), _jsx(Button, { variant: "primary", onClick: () => {
                            setGroupCount(4);
                            setIsRandomizeOpen(true);
                        }, children: "\uD83C\uDFB2 Chia \u0111\u1EC1u ng\u1EABu nhi\u00EAn 4 nh\u00F3m ngay" })] })) : (_jsx("div", { style: {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '16px',
                    alignItems: 'start',
                }, children: overview?.groups.map((item) => {
                    const { members, leader } = item;
                    const group = item;
                    return (_jsxs("div", { style: {
                            backgroundColor: '#FFFFFF',
                            borderRadius: '16px',
                            border: `2px solid ${leader ? '#FEF08A' : UI_COLORS.border}`,
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                        }, children: [_jsxs("div", { style: {
                                    padding: '14px 16px',
                                    backgroundColor: leader ? '#FEF9C3' : '#F8FAFC',
                                    borderBottom: `1px solid ${UI_COLORS.border}`,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsx("span", { style: { fontSize: '16px', fontWeight: 800, color: UI_COLORS.text }, children: group.name }), _jsxs("span", { style: {
                                                    fontSize: '11px',
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    backgroundColor: '#FFFFFF',
                                                    border: `1px solid ${UI_COLORS.border}`,
                                                    color: UI_COLORS.textMuted,
                                                    fontWeight: 600,
                                                }, children: [members.length, " HS"] })] }), _jsxs("div", { style: { display: 'flex', gap: '4px' }, children: [_jsx("button", { type: "button", title: "S\u1EEDa t\u00EAn nh\u00F3m", onClick: () => {
                                                    setEditingGroup(group);
                                                    setEditGroupName(group.name);
                                                }, style: {
                                                    border: 'none',
                                                    background: 'transparent',
                                                    cursor: 'pointer',
                                                    padding: '4px 6px',
                                                    borderRadius: '6px',
                                                    fontSize: '14px',
                                                }, children: "\u270F\uFE0F" }), _jsx("button", { type: "button", title: "X\u00F3a nh\u00F3m n\u00E0y", onClick: () => void handleDeleteGroup(group), style: {
                                                    border: 'none',
                                                    background: 'transparent',
                                                    cursor: 'pointer',
                                                    padding: '4px 6px',
                                                    borderRadius: '6px',
                                                    fontSize: '14px',
                                                }, children: "\uD83D\uDDD1\uFE0F" })] })] }), _jsxs("div", { style: {
                                    padding: '8px 16px',
                                    backgroundColor: leader ? '#FEFCE8' : '#F1F5F9',
                                    fontSize: '12px',
                                    color: leader ? '#854D0E' : UI_COLORS.textMuted,
                                    borderBottom: `1px solid ${UI_COLORS.border}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }, children: [_jsx("span", { children: "\u2B50" }), leader ? (_jsxs("span", { children: ["Nh\u00F3m tr\u01B0\u1EDFng: ", _jsx("strong", { children: leader.fullName })] })) : (_jsx("span", { children: "Ch\u01B0a c\u00F3 nh\u00F3m tr\u01B0\u1EDFng (B\u1EA5m \u2B50 c\u1EA1nh t\u00EAn b\u1EA1n b\u1EA5t k\u1EF3)" }))] }), _jsx("div", { style: {
                                    padding: '12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                    minHeight: '120px',
                                }, children: members.length === 0 ? (_jsx("div", { style: {
                                        padding: '24px 0',
                                        textAlign: 'center',
                                        color: UI_COLORS.textMuted,
                                        fontSize: '13px',
                                    }, children: "Ch\u01B0a c\u00F3 th\u00E0nh vi\u00EAn n\u00E0o" })) : (members.map((st, idx) => {
                                    const isLeader = group.leaderStudentId === st.id;
                                    const isMenuOpen = activeMoveMenuStudentId === st.id;
                                    return (_jsxs("div", { style: {
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '8px 12px',
                                            borderRadius: '10px',
                                            backgroundColor: isLeader ? '#FFFBEB' : '#F8FAFC',
                                            border: `1px solid ${isLeader ? '#FDE68A' : '#E2E8F0'}`,
                                            fontSize: '13px',
                                            position: 'relative',
                                        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsxs("span", { style: {
                                                            fontSize: '11px',
                                                            color: UI_COLORS.textMuted,
                                                            minWidth: '16px',
                                                        }, children: [idx + 1, "."] }), _jsx("span", { style: { fontWeight: isLeader ? 700 : 500, color: UI_COLORS.text }, children: st.fullName })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '6px' }, children: [_jsx("button", { type: "button", onClick: () => void handleSetLeader(group.id, st.id, group.leaderStudentId), title: isLeader ? 'Hủy quyền Nhóm trưởng' : 'Đặt làm Nhóm trưởng ⭐', style: {
                                                            border: 'none',
                                                            background: 'transparent',
                                                            cursor: 'pointer',
                                                            fontSize: '16px',
                                                            padding: '2px 4px',
                                                            borderRadius: '4px',
                                                            opacity: isLeader ? 1 : 0.4,
                                                            transition: 'opacity 0.2s',
                                                        }, children: "\u2B50" }), _jsxs("div", { style: { position: 'relative' }, children: [_jsx("button", { type: "button", title: "Chuy\u1EC3n sang nh\u00F3m kh\u00E1c", onClick: () => setActiveMoveMenuStudentId(isMenuOpen ? null : st.id), style: {
                                                                    border: `1px solid ${UI_COLORS.border}`,
                                                                    background: '#FFFFFF',
                                                                    cursor: 'pointer',
                                                                    fontSize: '12px',
                                                                    padding: '4px 8px',
                                                                    borderRadius: '6px',
                                                                    color: UI_COLORS.text,
                                                                    fontWeight: 600,
                                                                }, children: "\u21C4 Chuy\u1EC3n" }), isMenuOpen && (_jsxs("div", { style: {
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
                                                                }, children: [_jsxs("div", { style: {
                                                                            fontSize: '11px',
                                                                            color: UI_COLORS.textMuted,
                                                                            padding: '4px 8px',
                                                                        }, children: ["Chuy\u1EC3n ", st.fullName, " sang:"] }), overview.groups
                                                                        .filter(g => g.id !== group.id)
                                                                        .map(targetG => (_jsxs("button", { type: "button", onClick: () => void handleMoveStudent(st.id, targetG.id), style: {
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
                                                                        }, onMouseEnter: e => (e.currentTarget.style.backgroundColor = '#EFF6FF'), onMouseLeave: e => (e.currentTarget.style.backgroundColor = 'transparent'), children: ["\uD83D\uDC49 ", targetG.name] }, targetG.id))), _jsx("div", { style: {
                                                                            borderTop: `1px solid ${UI_COLORS.border}`,
                                                                            margin: '4px 0',
                                                                        } }), _jsx("button", { type: "button", onClick: () => void handleMoveStudent(st.id, null), style: {
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
                                                                        }, onMouseEnter: e => (e.currentTarget.style.backgroundColor = '#FEE2E2'), onMouseLeave: e => (e.currentTarget.style.backgroundColor = 'transparent'), children: "\u274C B\u1ECF kh\u1ECFi nh\u00F3m" })] }))] })] })] }, st.id));
                                })) })] }, group.id));
                }) })), isRandomizeOpen && (_jsx(Modal, { title: "\uD83C\uDFB2 Chia \u0111\u1EC1u ng\u1EABu nhi\u00EAn v\u00E0o c\u00E1c nh\u00F3m", isOpen: isRandomizeOpen, onClose: () => setIsRandomizeOpen(false), children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '16px' }, children: [_jsxs("p", { style: { fontSize: '14px', color: UI_COLORS.textMuted, margin: 0 }, children: ["H\u1EC7 th\u1ED1ng s\u1EBD x\u00E1o tr\u1ED9n ng\u1EABu nhi\u00EAn to\u00E0n b\u1ED9 ", _jsxs("strong", { children: [students.length, " h\u1ECDc sinh"] }), ' ', "c\u1EE7a l\u1EDBp ", className, " v\u00E0 chia \u0111\u1EC1u s\u0129 s\u1ED1 v\u00E0o s\u1ED1 l\u01B0\u1EE3ng nh\u00F3m b\u1EA1n ch\u1ECDn."] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }, children: "S\u1ED1 nh\u00F3m / t\u1ED5 c\u1EA7n chia:" }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [_jsx("button", { type: "button", onClick: () => setGroupCount(prev => Math.max(2, prev - 1)), style: {
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '10px',
                                                border: `1px solid ${UI_COLORS.border}`,
                                                backgroundColor: '#F8FAFC',
                                                fontSize: '18px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                            }, children: "-" }), _jsx("div", { style: {
                                                fontSize: '22px',
                                                fontWeight: 800,
                                                minWidth: '40px',
                                                textAlign: 'center',
                                            }, children: groupCount }), _jsx("button", { type: "button", onClick: () => setGroupCount(prev => Math.min(20, prev + 1)), style: {
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '10px',
                                                border: `1px solid ${UI_COLORS.border}`,
                                                backgroundColor: '#F8FAFC',
                                                fontSize: '18px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                            }, children: "+" }), _jsx("span", { style: { fontSize: '13px', color: UI_COLORS.textMuted }, children: "(T\u1ED1i thi\u1EC3u 2, t\u1ED1i \u0111a 20 nh\u00F3m)" })] })] }), _jsxs("div", { style: {
                                padding: '12px 16px',
                                backgroundColor: '#EFF6FF',
                                borderRadius: '12px',
                                border: '1px solid #BFDBFE',
                                fontSize: '13px',
                                color: '#1D4ED8',
                            }, children: ["\uD83D\uDCA1 ", _jsx("strong", { children: "D\u1EF1 t\u00EDnh ph\u00E2n b\u1ED5:" }), " M\u1ED7i nh\u00F3m kho\u1EA3ng", ' ', _jsx("strong", { children: Math.floor(students.length / Math.max(1, groupCount)) }), " \u0111\u1EBFn", ' ', _jsx("strong", { children: Math.ceil(students.length / Math.max(1, groupCount)) }), " h\u1ECDc sinh (ch\u00EAnh l\u1EC7ch t\u1ED1i \u0111a 1 b\u1EA1n)."] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }, children: "Phong c\u00E1ch \u0111\u1EB7t t\u00EAn nh\u00F3m:" }), _jsxs("div", { style: { display: 'flex', gap: '16px' }, children: [_jsxs("label", { style: {
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                            }, children: [_jsx("input", { type: "radio", name: "namingStyle", checked: namingStyle === 'nhom', onChange: () => setNamingStyle('nhom') }), "Nh\u00F3m 1, Nh\u00F3m 2, Nh\u00F3m 3..."] }), _jsxs("label", { style: {
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                            }, children: [_jsx("input", { type: "radio", name: "namingStyle", checked: namingStyle === 'to', onChange: () => setNamingStyle('to') }), "T\u1ED5 1, T\u1ED5 2, T\u1ED5 3..."] })] })] }), _jsx("div", { children: _jsxs("label", { style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                }, children: [_jsx("input", { type: "checkbox", checked: autoAssignLeader, onChange: e => setAutoAssignLeader(e.target.checked) }), _jsx("span", { style: { fontWeight: 600 }, children: "T\u1EF1 \u0111\u1ED9ng ch\u1ECDn ng\u1EABu nhi\u00EAn 1 nh\u00F3m tr\u01B0\u1EDFng cho m\u1ED7i nh\u00F3m \u2B50" })] }) }), _jsxs("div", { style: {
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '12px',
                                marginTop: '12px',
                            }, children: [_jsx(Button, { variant: "secondary", onClick: () => setIsRandomizeOpen(false), children: "H\u1EE7y" }), _jsx(Button, { variant: "primary", onClick: () => void handleRandomize(), disabled: isRandomizing, children: isRandomizing ? 'Đang chia...' : `🎲 Tiến hành chia ${groupCount} nhóm` })] })] }) })), isAddGroupOpen && (_jsx(Modal, { title: "+ Th\u00EAm nh\u00F3m h\u1ECDc t\u1EADp m\u1EDBi", isOpen: isAddGroupOpen, onClose: () => setIsAddGroupOpen(false), children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '16px' }, children: [_jsx(Input, { label: "T\u00EAn nh\u00F3m m\u1EDBi:", value: newGroupName, onChange: e => setNewGroupName(e.target.value), placeholder: "VD: Nh\u00F3m 5, T\u1ED5 5, Nh\u00F3m Stem...", autoFocus: true }), _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: '12px' }, children: [_jsx(Button, { variant: "secondary", onClick: () => setIsAddGroupOpen(false), children: "H\u1EE7y" }), _jsx(Button, { variant: "primary", onClick: () => void handleCreateGroup(), disabled: isAddingGroup, children: isAddingGroup ? 'Đang tạo...' : 'Tạo nhóm' })] })] }) })), editingGroup && (_jsx(Modal, { title: "\u270F\uFE0F \u0110\u1ED5i t\u00EAn nh\u00F3m", isOpen: Boolean(editingGroup), onClose: () => setEditingGroup(null), children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '16px' }, children: [_jsx(Input, { label: "T\u00EAn nh\u00F3m:", value: editGroupName, onChange: e => setEditGroupName(e.target.value), placeholder: "Nh\u1EADp t\u00EAn nh\u00F3m...", autoFocus: true }), _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: '12px' }, children: [_jsx(Button, { variant: "secondary", onClick: () => setEditingGroup(null), children: "H\u1EE7y" }), _jsx(Button, { variant: "primary", onClick: () => void handleUpdateGroupName(), disabled: isSavingEdit, children: isSavingEdit ? 'Đang lưu...' : 'Lưu tên nhóm' })] })] }) }))] }));
};
//# sourceMappingURL=ClassGroupsView.js.map