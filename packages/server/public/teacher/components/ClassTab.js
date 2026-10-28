import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { parseClipboardText, validateAndPreviewStudents } from '@educlass/core';
import { Button, Card, Input, Modal, Toast, UI_COLORS } from '@educlass/ui-kit';
import { ClassGroupsView } from './ClassGroupsView.js';
export const ClassTab = ({ classes, selectedClassId, students, onSelectClass, onCreateClass, onDeleteClass, onCreateStudent, onUpdateStudent, onSetStudentPin, onDeleteStudent, onImportStudents, }) => {
    // Modal states
    const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);
    const [newClassName, setNewClassName] = useState('');
    const [newClassYear, setNewClassYear] = useState(new Date().getFullYear());
    const classNameInputRef = useRef(null);
    const handleOpenCreateClassModal = () => {
        setNewClassName('');
        setNewClassYear(new Date().getFullYear());
        setIsCreateClassOpen(true);
    };
    const handleCloseCreateClassModal = () => {
        setIsCreateClassOpen(false);
        setNewClassName('');
    };
    // Tự động focus con trỏ vào ô nhập tên lớp ngay khi mở modal
    useEffect(() => {
        if (!isCreateClassOpen) {
            return () => { };
        }
        classNameInputRef.current?.focus();
        const timer = setTimeout(() => {
            classNameInputRef.current?.focus();
            classNameInputRef.current?.select();
        }, 50);
        return () => clearTimeout(timer);
    }, [isCreateClassOpen]);
    const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
    const [newStudentName, setNewStudentName] = useState('');
    const [newStudentCode, setNewStudentCode] = useState('');
    const [newStudentPin, setNewStudentPin] = useState('');
    const [newStudentAcademic, setNewStudentAcademic] = useState('dat');
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [targetStudentForPin, setTargetStudentForPin] = useState(null);
    const [pinInput, setPinInput] = useState('');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [pasteText, setPasteText] = useState('');
    const [previewResult, setPreviewResult] = useState(null);
    const [skipDuplicates, setSkipDuplicates] = useState(true);
    const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);
    const [subTab, setSubTab] = useState('students');
    const selectedClass = classes.find(c => c.id === selectedClassId);
    // Xử lý tạo lớp học
    const handleCreateClass = async () => {
        if (!newClassName.trim())
            return;
        try {
            await onCreateClass({ name: newClassName.trim(), year: newClassYear });
            setNewClassName('');
            setIsCreateClassOpen(false);
            setToastMessage('Tạo lớp học thành công!');
        }
        catch (err) {
            setToastMessage(err instanceof Error ? err.message : 'Lỗi khi tạo lớp học');
        }
    };
    // Xử lý thêm học sinh tay
    const handleAddStudent = async () => {
        if (!selectedClassId) {
            setToastMessage('Vui lòng chọn một lớp học trước.');
            return;
        }
        const trimmedName = newStudentName.trim();
        if (!trimmedName) {
            setToastMessage('Vui lòng nhập họ và tên học sinh.');
            return;
        }
        const trimmedPin = newStudentPin.trim();
        if (trimmedPin.length > 0 && trimmedPin.length < 4) {
            setToastMessage('Mã PIN phải có tối thiểu 4 ký tự số.');
            return;
        }
        const req = {
            fullName: trimmedName,
            academicPerformance: newStudentAcademic,
        };
        if (newStudentCode.trim())
            req.code = newStudentCode.trim();
        if (trimmedPin.length >= 4)
            req.pin = trimmedPin;
        setIsSubmittingStudent(true);
        try {
            await onCreateStudent(selectedClassId, req);
            setNewStudentName('');
            setNewStudentCode('');
            setNewStudentPin('');
            setNewStudentAcademic('dat');
            setIsAddStudentOpen(false);
            setToastMessage('Thêm học sinh thành công!');
        }
        catch (err) {
            setToastMessage(err instanceof Error ? err.message : 'Lỗi khi thêm học sinh.');
        }
        finally {
            setIsSubmittingStudent(false);
        }
    };
    // Xử lý đổi/reset PIN
    const handleSavePin = async () => {
        if (!targetStudentForPin)
            return;
        try {
            await onSetStudentPin(targetStudentForPin.id, pinInput.trim() ? pinInput.trim() : null);
            setIsPinModalOpen(false);
            setTargetStudentForPin(null);
            setPinInput('');
            setToastMessage('Cập nhật mã PIN thành công!');
        }
        catch (err) {
            setToastMessage(err instanceof Error ? err.message : 'Lỗi khi cập nhật mã PIN');
        }
    };
    // Xử lý xem trước khi dán từ clipboard
    const handlePreviewPaste = () => {
        if (!pasteText.trim())
            return;
        const rows = parseClipboardText(pasteText);
        const existing = students.map(s => ({ fullName: s.fullName, code: s.code ?? null }));
        const preview = validateAndPreviewStudents(rows, existing);
        setPreviewResult(preview);
    };
    // Xử lý commit import học sinh
    const handleCommitImport = async () => {
        if (!selectedClassId) {
            setToastMessage('Vui lòng chọn một lớp học trước.');
            return;
        }
        if (!previewResult)
            return;
        const importableItems = previewResult.items.filter(item => item.status !== 'error');
        if (importableItems.length === 0) {
            setToastMessage('Không có dòng dữ liệu hợp lệ nào để nhập.');
            return;
        }
        const validRowsToImport = importableItems.map(item => {
            const req = { fullName: item.fullName };
            if (item.code)
                req.code = item.code;
            // Chỉ gửi PIN nếu >= 4 ký tự để tránh lỗi validation Zod schema
            if (item.pin && item.pin.trim().length >= 4) {
                req.pin = item.pin.trim();
            }
            return req;
        });
        setIsImporting(true);
        try {
            await onImportStudents(selectedClassId, validRowsToImport, skipDuplicates);
            setIsImportModalOpen(false);
            setPasteText('');
            setPreviewResult(null);
            setToastMessage(`Đã nhập thành công học sinh vào lớp!`);
        }
        catch (err) {
            setToastMessage(err instanceof Error ? err.message : 'Lỗi khi nhập danh sách học sinh.');
        }
        finally {
            setIsImporting(false);
        }
    };
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }, children: [toastMessage && (_jsx(Toast, { message: toastMessage, type: "success", onClose: () => setToastMessage(null) })), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("h2", { style: { margin: 0, fontSize: '24px', fontWeight: 700 }, children: "Danh s\u00E1ch L\u1EDBp h\u1ECDc" }), _jsx(Button, { variant: "primary", onClick: handleOpenCreateClassModal, "data-testid": "btn-add-class", children: "+ Th\u00EAm l\u1EDBp h\u1ECDc" })] }), _jsx("div", { style: { display: 'flex', gap: '12px', flexWrap: 'wrap' }, children: classes.length === 0 ? (_jsxs("div", { style: {
                        padding: '24px',
                        textAlign: 'center',
                        width: '100%',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '16px',
                        border: `2px dashed ${UI_COLORS.border}`,
                    }, children: [_jsx("p", { style: { color: UI_COLORS.textMuted, margin: '0 0 16px 0', fontSize: '15px' }, children: "Ch\u01B0a c\u00F3 l\u1EDBp h\u1ECDc n\u00E0o. H\u00E3y b\u1EA5m \"Th\u00EAm l\u1EDBp h\u1ECDc\" \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u t\u1EA1o danh s\u00E1ch l\u1EDBp." }), _jsx(Button, { variant: "primary", onClick: handleOpenCreateClassModal, children: "+ Th\u00EAm l\u1EDBp h\u1ECDc ngay" })] })) : (classes.map(cls => {
                    const isSelected = cls.id === selectedClassId;
                    return (_jsxs("button", { type: "button", onClick: () => onSelectClass(cls.id), "data-testid": `class-item-${cls.id}`, style: {
                            padding: '12px 20px',
                            borderRadius: '16px',
                            border: `2px solid ${isSelected ? UI_COLORS.primary : UI_COLORS.border}`,
                            backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                            color: isSelected ? UI_COLORS.primary : UI_COLORS.text,
                            fontWeight: isSelected ? 700 : 500,
                            cursor: 'pointer',
                            minHeight: '48px',
                        }, children: [cls.name, " (", cls.year, ")"] }, cls.id));
                })) }), selectedClass && (_jsxs(Card, { children: [_jsxs("div", { style: {
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '16px',
                        }, children: [_jsxs("div", { children: [_jsxs("h3", { style: { margin: 0, fontSize: '20px' }, children: ["L\u1EDBp: ", selectedClass.name] }), _jsxs("span", { style: { fontSize: '14px', color: UI_COLORS.textMuted }, children: ["S\u0129 s\u1ED1: ", students.length, " h\u1ECDc sinh"] })] }), _jsxs("div", { style: { display: 'flex', gap: '8px' }, children: [subTab === 'students' && (_jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", onClick: () => setIsImportModalOpen(true), "data-testid": "btn-import-excel", children: "\uD83D\uDCCB Nh\u1EADp t\u1EEB Excel / D\u00E1n" }), _jsx(Button, { variant: "primary", onClick: () => setIsAddStudentOpen(true), "data-testid": "btn-add-student", children: "+ Th\u00EAm h\u1ECDc sinh" })] })), onDeleteClass && (_jsx(Button, { variant: "danger", onClick: () => {
                                            if (window.confirm(`Bạn có chắc chắn muốn xóa lớp ${selectedClass.name}?`)) {
                                                void onDeleteClass(selectedClass.id);
                                            }
                                        }, children: "X\u00F3a l\u1EDBp" }))] })] }), _jsxs("div", { style: {
                            display: 'flex',
                            gap: '8px',
                            borderBottom: `2px solid ${UI_COLORS.border}`,
                            marginBottom: '20px',
                        }, children: [_jsxs("button", { type: "button", onClick: () => setSubTab('students'), "data-testid": "subtab-students", style: {
                                    padding: '10px 18px',
                                    border: 'none',
                                    borderBottom: `3px solid ${subTab === 'students' ? UI_COLORS.primary : 'transparent'}`,
                                    backgroundColor: 'transparent',
                                    color: subTab === 'students' ? UI_COLORS.primary : UI_COLORS.textMuted,
                                    fontWeight: subTab === 'students' ? 700 : 500,
                                    fontSize: '15px',
                                    cursor: 'pointer',
                                    marginBottom: '-2px',
                                }, children: ["\uD83D\uDCCB Danh s\u00E1ch h\u1ECDc sinh (", students.length, ")"] }), _jsx("button", { type: "button", onClick: () => setSubTab('groups'), "data-testid": "subtab-groups", style: {
                                    padding: '10px 18px',
                                    border: 'none',
                                    borderBottom: `3px solid ${subTab === 'groups' ? UI_COLORS.primary : 'transparent'}`,
                                    backgroundColor: 'transparent',
                                    color: subTab === 'groups' ? UI_COLORS.primary : UI_COLORS.textMuted,
                                    fontWeight: subTab === 'groups' ? 700 : 500,
                                    fontSize: '15px',
                                    cursor: 'pointer',
                                    marginBottom: '-2px',
                                }, children: "\uD83D\uDC65 T\u1ED5 / Nh\u00F3m h\u1ECDc t\u1EADp" })] }), subTab === 'groups' ? (_jsx(ClassGroupsView, { classId: selectedClass.id, className: selectedClass.name, students: students, onShowToast: msg => setToastMessage(msg) })) : students.length === 0 ? (_jsx("div", { style: { padding: '32px', textAlign: 'center', color: UI_COLORS.textMuted }, children: "L\u1EDBp h\u1ECDc ch\u01B0a c\u00F3 h\u1ECDc sinh. B\u1EA5m \"Th\u00EAm h\u1ECDc sinh\" ho\u1EB7c \"Nh\u1EADp t\u1EEB Excel / D\u00E1n\" \u0111\u1EC3 th\u00EAm." })) : (_jsx("div", { style: { overflowX: 'auto' }, children: _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' }, children: [_jsx("thead", { children: _jsxs("tr", { style: { borderBottom: `2px solid ${UI_COLORS.border}` }, children: [_jsx("th", { style: { padding: '12px' }, children: "STT" }), _jsx("th", { style: { padding: '12px' }, children: "M\u00E3 HS" }), _jsx("th", { style: { padding: '12px' }, children: "H\u1ECD v\u00E0 t\u00EAn" }), _jsx("th", { style: { padding: '12px' }, children: "H\u1ECDc l\u1EF1c" }), _jsx("th", { style: { padding: '12px' }, children: "M\u00E3 PIN" }), _jsx("th", { style: { padding: '12px', textAlign: 'right' }, children: "Thao t\u00E1c" })] }) }), _jsx("tbody", { children: students.map((student, idx) => (_jsxs("tr", { style: { borderBottom: `1px solid ${UI_COLORS.border}` }, "data-testid": `student-row-${student.id}`, children: [_jsx("td", { style: { padding: '12px' }, children: idx + 1 }), _jsx("td", { style: { padding: '12px' }, children: student.code ?? '—' }), _jsx("td", { style: { padding: '12px', fontWeight: 600 }, children: student.fullName }), _jsx("td", { style: { padding: '12px' }, children: _jsxs("select", { value: student.academicPerformance || 'dat', onChange: e => {
                                                        const val = e.target.value;
                                                        if (onUpdateStudent) {
                                                            void onUpdateStudent(student.id, student.fullName, student.code ?? undefined, val);
                                                        }
                                                    }, style: {
                                                        padding: '4px 8px',
                                                        borderRadius: '8px',
                                                        fontSize: '13px',
                                                        fontWeight: 600,
                                                        border: '1px solid #CBD5E1',
                                                        backgroundColor: student.academicPerformance === 'tot'
                                                            ? '#DCFCE7'
                                                            : student.academicPerformance === 'kha'
                                                                ? '#DBEAFE'
                                                                : student.academicPerformance === 'chua_dat'
                                                                    ? '#FEE2E2'
                                                                    : '#FEF3C7',
                                                        color: student.academicPerformance === 'tot'
                                                            ? '#15803D'
                                                            : student.academicPerformance === 'kha'
                                                                ? '#1D4ED8'
                                                                : student.academicPerformance === 'chua_dat'
                                                                    ? '#B91C1C'
                                                                    : '#B45309',
                                                        cursor: 'pointer',
                                                    }, children: [_jsx("option", { value: "tot", children: "\uD83C\uDF1F T\u1ED1t" }), _jsx("option", { value: "kha", children: "\uD83D\uDC4D Kh\u00E1" }), _jsx("option", { value: "dat", children: "\uD83D\uDC4C \u0110\u1EA1t" }), _jsx("option", { value: "chua_dat", children: "\u26A0\uFE0F Ch\u01B0a \u0111\u1EA1t" })] }) }), _jsx("td", { style: { padding: '12px' }, children: _jsx("span", { style: {
                                                        padding: '4px 8px',
                                                        borderRadius: '8px',
                                                        fontSize: '12px',
                                                        backgroundColor: student.hasPin ? '#DCFCE7' : '#F1F5F9',
                                                        color: student.hasPin ? '#15803D' : '#64748B',
                                                    }, children: student.hasPin ? 'Đã đặt PIN' : 'Chưa có PIN' }) }), _jsx("td", { style: { padding: '12px', textAlign: 'right' }, children: _jsxs("div", { style: { display: 'inline-flex', gap: '6px' }, children: [_jsx(Button, { variant: "secondary", onClick: () => {
                                                                setTargetStudentForPin(student);
                                                                setPinInput('');
                                                                setIsPinModalOpen(true);
                                                            }, "data-testid": `btn-set-pin-${student.id}`, children: student.hasPin ? 'Đổi PIN' : 'Đặt PIN' }), _jsx(Button, { variant: "danger", onClick: () => {
                                                                if (window.confirm(`Xóa học sinh ${student.fullName}?`)) {
                                                                    void onDeleteStudent(student.id);
                                                                }
                                                            }, "data-testid": `btn-delete-student-${student.id}`, children: "X\u00F3a" })] }) })] }, student.id))) })] }) }))] })), _jsx(Modal, { isOpen: isCreateClassOpen, onClose: handleCloseCreateClassModal, title: "Th\u00EAm l\u1EDBp h\u1ECDc m\u1EDBi", footer: _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: '8px' }, children: [_jsx(Button, { variant: "ghost", onClick: handleCloseCreateClassModal, children: "H\u1EE7y" }), _jsx(Button, { variant: "primary", onClick: () => void handleCreateClass(), "data-testid": "btn-save-class", children: "L\u01B0u l\u1EDBp h\u1ECDc" })] }), children: _jsxs("form", { onSubmit: e => {
                        e.preventDefault();
                        void handleCreateClass();
                    }, style: { display: 'flex', flexDirection: 'column', gap: '16px' }, children: [_jsx(Input, { ref: classNameInputRef, id: "new-class-name-input", label: "T\u00EAn l\u1EDBp h\u1ECDc (v\u00ED d\u1EE5: 12A1)", value: newClassName, onChange: e => setNewClassName(e.target.value), placeholder: "Nh\u1EADp t\u00EAn l\u1EDBp...", autoFocus: true, required: true, autoComplete: "off", "data-testid": "input-class-name" }), _jsx(Input, { id: "new-class-year-input", label: "N\u0103m h\u1ECDc", type: "number", value: newClassYear.toString(), onChange: e => setNewClassYear(Number(e.target.value) || new Date().getFullYear()), "data-testid": "input-class-year" })] }) }), _jsx(Modal, { isOpen: isAddStudentOpen, onClose: () => setIsAddStudentOpen(false), title: "Th\u00EAm h\u1ECDc sinh m\u1EDBi", footer: _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: '8px' }, children: [_jsx(Button, { variant: "ghost", onClick: () => setIsAddStudentOpen(false), children: "H\u1EE7y" }), _jsx(Button, { variant: "primary", onClick: () => void handleAddStudent(), disabled: isSubmittingStudent, loading: isSubmittingStudent, "data-testid": "btn-submit-add-student", children: isSubmittingStudent ? 'Đang thêm...' : 'Thêm học sinh' })] }), children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '16px' }, children: [_jsx(Input, { label: "H\u1ECD v\u00E0 t\u00EAn h\u1ECDc sinh *", value: newStudentName, onChange: e => setNewStudentName(e.target.value), placeholder: "V\u00ED d\u1EE5: Nguy\u1EC5n V\u0103n An", autoFocus: true }), _jsx(Input, { label: "M\u00E3 h\u1ECDc sinh (t\u00F9y ch\u1ECDn)", value: newStudentCode, onChange: e => setNewStudentCode(e.target.value), placeholder: "V\u00ED d\u1EE5: HS001" }), _jsx(Input, { label: "M\u00E3 PIN \u0111\u0103ng nh\u1EADp (t\u00F9y ch\u1ECDn, t\u1ED1i thi\u1EC3u 4 s\u1ED1)", value: newStudentPin, onChange: e => setNewStudentPin(e.target.value), placeholder: "V\u00ED d\u1EE5: 1234" }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px' }, children: [_jsx("label", { style: { fontSize: '14px', fontWeight: 600, color: '#334155' }, children: "H\u1ECDc l\u1EF1c" }), _jsxs("select", { value: newStudentAcademic, onChange: e => setNewStudentAcademic(e.target.value), style: {
                                        padding: '10px 12px',
                                        borderRadius: '12px',
                                        border: '1px solid #CBD5E1',
                                        fontSize: '15px',
                                        backgroundColor: '#FFFFFF',
                                        color: '#1E293B',
                                    }, children: [_jsx("option", { value: "tot", children: "\uD83C\uDF1F T\u1ED1t" }), _jsx("option", { value: "kha", children: "\uD83D\uDC4D Kh\u00E1" }), _jsx("option", { value: "dat", children: "\uD83D\uDC4C \u0110\u1EA1t (M\u1EB7c \u0111\u1ECBnh)" }), _jsx("option", { value: "chua_dat", children: "\u26A0\uFE0F Ch\u01B0a \u0111\u1EA1t" })] })] })] }) }), _jsx(Modal, { isOpen: isPinModalOpen, onClose: () => setIsPinModalOpen(false), title: `Đặt mã PIN cho ${targetStudentForPin?.fullName ?? ''}`, footer: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', width: '100%' }, children: [targetStudentForPin?.hasPin ? (_jsx(Button, { variant: "danger", onClick: () => {
                                setPinInput('');
                                void handleSavePin();
                            }, children: "X\u00F3a m\u00E3 PIN" })) : (_jsx("span", {})), _jsxs("div", { style: { display: 'flex', gap: '8px' }, children: [_jsx(Button, { variant: "ghost", onClick: () => setIsPinModalOpen(false), children: "H\u1EE7y" }), _jsx(Button, { variant: "primary", onClick: () => void handleSavePin(), children: "L\u01B0u PIN" })] })] }), children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '16px' }, children: [_jsx("p", { style: { margin: 0, fontSize: '14px', color: UI_COLORS.textMuted }, children: "M\u00E3 PIN d\u00F9ng \u0111\u1EC3 h\u1ECDc sinh \u0111\u0103ng nh\u1EADp v\u00E0o l\u1EDBp v\u00E0 b\u1EA3o l\u01B0u v\u0129nh vi\u1EC5n \u0111i\u1EC3m EXP, danh hi\u1EC7u (c\u1EA5p account theo D6)." }), _jsx(Input, { label: "M\u00E3 PIN m\u1EDBi (t\u1ED1i thi\u1EC3u 4 s\u1ED1)", value: pinInput, onChange: e => setPinInput(e.target.value), placeholder: "Nh\u1EADp PIN m\u1EDBi...", autoFocus: true })] }) }), _jsx(Modal, { isOpen: isImportModalOpen, onClose: () => setIsImportModalOpen(false), title: "Nh\u1EADp danh s\u00E1ch h\u1ECDc sinh t\u1EEB Excel", footer: _jsxs("div", { style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%',
                    }, children: [_jsxs("label", { style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                fontSize: '14px',
                            }, children: [_jsx("input", { type: "checkbox", checked: skipDuplicates, onChange: e => setSkipDuplicates(e.target.checked) }), "T\u1EF1 \u0111\u1ED9ng b\u1ECF qua h\u1ECDc sinh b\u1ECB tr\u00F9ng l\u1EB7p"] }), _jsxs("div", { style: { display: 'flex', gap: '8px' }, children: [_jsx(Button, { variant: "ghost", onClick: () => setIsImportModalOpen(false), children: "H\u1EE7y" }), (() => {
                                    const importableCount = previewResult?.items.filter(item => item.status !== 'error').length ?? 0;
                                    return (_jsx(Button, { variant: "primary", onClick: () => void handleCommitImport(), disabled: !previewResult || importableCount === 0 || isImporting, loading: isImporting, "data-testid": "btn-confirm-import", children: isImporting ? 'Đang nhập...' : `Xác nhận nhập (${importableCount} học sinh)` }));
                                })()] })] }), children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '16px' }, children: [_jsx("p", { style: { margin: 0, fontSize: '14px', color: UI_COLORS.textMuted }, children: "Sao ch\u00E9p c\u00E1c c\u1ED9t t\u1EEB Excel (STT, M\u00E3 HS, H\u1ECD v\u00E0 t\u00EAn, M\u00E3 PIN) r\u1ED3i d\u00E1n tr\u1EF1c ti\u1EBFp v\u00E0o \u00F4 b\u00EAn d\u01B0\u1EDBi, sau \u0111\u00F3 b\u1EA5m \"Xem tr\u01B0\u1EDBc\":" }), _jsx("textarea", { rows: 5, value: pasteText, onChange: e => setPasteText(e.target.value), placeholder: "D\u00E1n d\u1EEF li\u1EC7u t\u1EEB Excel v\u00E0o \u0111\u00E2y (Ctrl+V)...", "data-testid": "textarea-paste-excel", style: {
                                width: '100%',
                                borderRadius: '12px',
                                border: `2px solid ${UI_COLORS.border}`,
                                padding: '12px',
                                fontFamily: 'monospace',
                                fontSize: '14px',
                                boxSizing: 'border-box',
                            } }), _jsx(Button, { variant: "secondary", onClick: handlePreviewPaste, "data-testid": "btn-preview-paste", children: "\uD83D\uDD0D Xem tr\u01B0\u1EDBc d\u1EEF li\u1EC7u & ph\u00E1t hi\u1EC7n tr\u00F9ng/thi\u1EBFu" }), previewResult && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }, children: [_jsxs("div", { style: { display: 'flex', gap: '16px', fontSize: '14px', fontWeight: 600 }, children: [_jsxs("span", { style: { color: UI_COLORS.success }, children: ["\u2713 H\u1EE3p l\u1EC7: ", previewResult.validCount] }), _jsxs("span", { style: { color: UI_COLORS.warning }, children: ["\u26A0 C\u1EA3nh b\u00E1o/Tr\u00F9ng: ", previewResult.warningCount] }), _jsxs("span", { style: { color: UI_COLORS.error }, children: ["\u2715 L\u1ED7i: ", previewResult.errorCount] })] }), _jsx("div", { style: {
                                        maxHeight: '240px',
                                        overflowY: 'auto',
                                        border: `1px solid ${UI_COLORS.border}`,
                                        borderRadius: '12px',
                                    }, children: _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' }, children: [_jsx("thead", { style: { backgroundColor: '#F8FAFC', position: 'sticky', top: 0 }, children: _jsxs("tr", { children: [_jsx("th", { style: { padding: '8px' }, children: "D\u00F2ng" }), _jsx("th", { style: { padding: '8px' }, children: "M\u00E3 HS" }), _jsx("th", { style: { padding: '8px' }, children: "H\u1ECD v\u00E0 t\u00EAn" }), _jsx("th", { style: { padding: '8px' }, children: "M\u00E3 PIN" }), _jsx("th", { style: { padding: '8px' }, children: "Tr\u1EA1ng th\u00E1i" })] }) }), _jsx("tbody", { children: previewResult.items.map(item => {
                                                    const isError = item.status === 'error';
                                                    const isWarning = item.status === 'warning';
                                                    const bgColor = isError ? '#FEF2F2' : isWarning ? '#FFFBEB' : '#F0FDF4';
                                                    const textColor = isError
                                                        ? UI_COLORS.error
                                                        : isWarning
                                                            ? '#B45309'
                                                            : UI_COLORS.success;
                                                    return (_jsxs("tr", { style: {
                                                            backgroundColor: bgColor,
                                                            borderBottom: `1px solid ${UI_COLORS.border}`,
                                                        }, children: [_jsx("td", { style: { padding: '8px' }, children: item.rowIndex }), _jsx("td", { style: { padding: '8px' }, children: item.code ?? '—' }), _jsx("td", { style: { padding: '8px', fontWeight: 600 }, children: item.fullName || '(Trống)' }), _jsx("td", { style: { padding: '8px' }, children: item.pin ?? '—' }), _jsx("td", { style: { padding: '8px' }, children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '2px' }, children: [_jsx("span", { style: { fontWeight: 600, color: textColor }, children: isError ? 'Lỗi' : isWarning ? 'Trùng lặp / Chú ý' : 'Hợp lệ' }), item.errors.map((e, idx) => (_jsx("span", { style: { fontSize: '11px', color: UI_COLORS.error }, children: e }, idx))), item.warnings.map((w, idx) => (_jsx("span", { style: { fontSize: '11px', color: '#B45309' }, children: w }, idx)))] }) })] }, item.rowIndex));
                                                }) })] }) })] }))] }) })] }));
};
//# sourceMappingURL=ClassTab.js.map