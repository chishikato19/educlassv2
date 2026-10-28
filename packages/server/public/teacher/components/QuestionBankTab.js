import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId, useMemo, useRef, useState } from 'react';
import { WordImportModal } from './WordImportModal.js';
import { MatrixImportModal } from './MatrixImportModal.js';
export const QuestionBankTab = ({ questionSets, isLoading = false, onRefresh, onCreateQuestionSet, onDeleteQuestionSet, onCloneQuestionSet, onExportQuestionSet, onImportQuestionSet, onOpenQuestionEditor, onImportWordQuestions, }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTag, setSelectedTag] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isWordModalOpen, setIsWordModalOpen] = useState(false);
    const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    // Form tạo bộ đề
    const [formTitle, setFormTitle] = useState('');
    const [formSubject, setFormSubject] = useState('Toán');
    const [formGrade, setFormGrade] = useState(12);
    const [formTags, setFormTags] = useState('');
    const fileInputRef = useRef(null);
    const searchInputId = useId();
    const fileInputId = useId();
    // Danh sách tags duy nhất
    const allTags = useMemo(() => {
        const set = new Set();
        for (const qs of questionSets) {
            for (const t of qs.tags) {
                if (t.trim())
                    set.add(t.trim());
            }
        }
        return Array.from(set);
    }, [questionSets]);
    // Bộ lọc
    const filteredSets = useMemo(() => {
        return questionSets.filter(qs => {
            // Tìm kiếm theo từ khóa
            if (searchTerm.trim()) {
                const term = searchTerm.trim().toLowerCase();
                const matchTitle = qs.title.toLowerCase().includes(term);
                const matchSubject = qs.subject.toLowerCase().includes(term);
                if (!matchTitle && !matchSubject)
                    return false;
            }
            // Lọc theo tag
            if (selectedTag) {
                if (!qs.tags.includes(selectedTag))
                    return false;
            }
            return true;
        });
    }, [questionSets, searchTerm, selectedTag]);
    const handleOpenCreateModal = () => {
        setFormTitle('');
        setFormSubject('Toán');
        setFormGrade(12);
        setFormTags('');
        setErrorMessage(null);
        setIsCreateModalOpen(true);
    };
    const handleCloseCreateModal = () => {
        setIsCreateModalOpen(false);
        setErrorMessage(null);
    };
    const handleSubmitCreate = async (e) => {
        e.preventDefault();
        if (!formTitle.trim()) {
            setErrorMessage('Vui lòng nhập tiêu đề bộ đề');
            return;
        }
        const tagsArray = formTags
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0);
        try {
            await onCreateQuestionSet({
                title: formTitle.trim(),
                subject: formSubject.trim(),
                grade: formGrade,
                tags: tagsArray,
            });
            handleCloseCreateModal();
        }
        catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Có lỗi khi tạo bộ đề');
        }
    };
    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            await onImportQuestionSet(parsed);
        }
        catch (err) {
            alert('Không thể nhập file .educlass: ' +
                (err instanceof Error ? err.message : 'Định dạng file không đúng'));
        }
        finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };
    const handleDownloadWordTemplate = async () => {
        try {
            const res = await fetch('/api/question-sets/templates/word');
            if (!res.ok) {
                throw new Error(`Máy chủ báo lỗi ${res.status}`);
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'de-thi-mau-educlass.docx';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }
        catch {
            window.open('/api/question-sets/templates/word', '_blank');
        }
    };
    const handleSaveWordQuestions = async (data) => {
        if (onImportWordQuestions) {
            await onImportWordQuestions(data);
        }
        else {
            await onCreateQuestionSet(data.setInfo);
        }
        setIsWordModalOpen(false);
    };
    return (_jsxs("div", { className: "p-4 max-w-6xl mx-auto space-y-6", children: [_jsxs("div", { className: "flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-800", children: "Ng\u00E2n h\u00E0ng \u0111\u1EC1 thi & B\u1ED9 c\u00E2u h\u1ECFi" }), _jsx("p", { className: "text-sm text-gray-500", children: "Qu\u1EA3n l\u00FD, t\u1EA1o m\u1EDBi, ph\u00E2n lo\u1EA1i theo th\u1EBB, xu\u1EA5t/nh\u1EADp g\u00F3i .educlass ngo\u1EA1i tuy\u1EBFn 100%" })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("input", { id: fileInputId, ref: fileInputRef, type: "file", accept: ".educlass,application/json", style: { display: 'none' }, "data-testid": "input-import-educlass", onChange: handleFileChange }), _jsx("label", { htmlFor: fileInputId, "data-testid": "btn-import-educlass", className: "cursor-pointer inline-flex items-center justify-center min-h-[48px] px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50", children: "\uD83D\uDCE5 Nh\u1EADp file .educlass" }), _jsx("button", { type: "button", "data-testid": "btn-open-word-import", onClick: () => setIsWordModalOpen(true), className: "min-h-[48px] px-4 py-2 border border-blue-600 rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 inline-flex items-center gap-1.5", children: "\uD83D\uDCC4 Nh\u1EADp t\u1EEB Word (.docx)" }), _jsx("button", { type: "button", "data-testid": "btn-open-matrix-import", onClick: () => setIsMatrixModalOpen(true), className: "min-h-[48px] px-4 py-2 border border-purple-600 rounded-md shadow-sm text-sm font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 inline-flex items-center gap-1.5 cursor-pointer transition-colors", children: "\uD83C\uDFAF B\u1ED1c t\u1EEB Ng\u00E2n h\u00E0ng (Ma tr\u1EADn)" }), _jsx("button", { type: "button", "data-testid": "btn-open-create-set", onClick: handleOpenCreateModal, className: "min-h-[48px] px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700", children: "\u2795 T\u1EA1o b\u1ED9 \u0111\u1EC1 m\u1EDBi" })] })] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex flex-col sm:flex-row items-center gap-3", children: [_jsx("div", { className: "relative w-full sm:w-80", children: _jsx("input", { id: searchInputId, type: "text", placeholder: "T\u00ECm ki\u1EBFm b\u1ED9 \u0111\u1EC1, m\u00F4n h\u1ECDc...", value: searchTerm, onChange: e => setSearchTerm(e.target.value), "data-testid": "input-search-question-sets", className: "w-full min-h-[48px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }) }), searchTerm && (_jsx("button", { type: "button", onClick: () => setSearchTerm(''), className: "min-h-[48px] px-3 text-sm text-gray-500 hover:text-gray-700", children: "X\u00F3a t\u00ECm ki\u1EBFm" }))] }), allTags.length > 0 && (_jsxs("div", { className: "flex flex-wrap items-center gap-2 pt-2", children: [_jsx("span", { className: "text-xs font-semibold text-gray-500 uppercase tracking-wider", children: "Th\u1EBB:" }), _jsx("button", { type: "button", onClick: () => setSelectedTag(null), className: `min-h-[40px] px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedTag === null
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`, children: "T\u1EA5t c\u1EA3" }), allTags.map(tag => (_jsxs("button", { type: "button", "data-testid": `tag-filter-${tag}`, onClick: () => setSelectedTag(selectedTag === tag ? null : tag), className: `min-h-[40px] px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedTag === tag
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`, children: ["\uD83C\uDFF7\uFE0F ", tag] }, tag)))] }))] }), isLoading && (_jsxs("div", { className: "py-12 text-center text-gray-500", children: [_jsx("div", { className: "animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-blue-600 rounded-full mb-2" }), _jsx("p", { children: "\u0110ang t\u1EA3i danh s\u00E1ch b\u1ED9 \u0111\u1EC1..." })] })), !isLoading && filteredSets.length === 0 && (_jsxs("div", { className: "py-16 text-center border-2 border-dashed border-gray-200 rounded-lg p-8 bg-white", children: [_jsx("div", { className: "text-4xl mb-3", children: "\uD83D\uDCDA" }), _jsx("h3", { className: "text-base font-semibold text-gray-900", children: questionSets.length === 0
                            ? 'Chưa có bộ câu hỏi nào'
                            : 'Không tìm thấy bộ đề phù hợp với bộ lọc' }), _jsx("p", { className: "mt-1 text-sm text-gray-500 max-w-md mx-auto mb-5", children: questionSets.length === 0
                            ? 'Bắt đầu bằng cách tạo bộ đề mới hoặc nhập gói đề từ file Word hay .educlass.'
                            : 'Hãy thử đổi từ khóa tìm kiếm hoặc chọn thẻ phân loại khác.' }), questionSets.length === 0 && (_jsxs("div", { className: "flex items-center justify-center gap-3", children: [_jsx("button", { type: "button", onClick: () => setIsWordModalOpen(true), className: "min-h-[44px] px-4 py-2 border border-blue-600 rounded-md text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 inline-flex items-center gap-1.5 shadow-sm", children: "\uD83D\uDCC4 Nh\u1EADp t\u1EEB Word (.docx)" }), _jsx("button", { type: "button", onClick: handleOpenCreateModal, className: "min-h-[44px] px-4 py-2 bg-blue-600 rounded-md text-sm font-medium text-white hover:bg-blue-700 shadow-sm inline-flex items-center gap-1.5", children: "\u2795 T\u1EA1o b\u1ED9 \u0111\u1EC1 m\u1EDBi" })] }))] })), !isLoading && filteredSets.length > 0 && (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: filteredSets.map(qs => (_jsxs("div", { className: "border border-gray-200 rounded-lg p-5 bg-white shadow-sm hover:shadow transition-shadow flex flex-col justify-between", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-start justify-between gap-2 mb-2", children: [_jsxs("div", { className: "flex items-center gap-1.5 flex-wrap", children: [_jsxs("span", { className: "inline-block px-2.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800", children: [qs.subject, " \u2022 L\u1EDBp ", qs.grade] }), qs.tags.some(t => t.toLowerCase().includes('ma trận')) && (_jsx("span", { "data-testid": `badge-matrix-${qs.id}`, className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200", children: "\uD83C\uDFAF Ma tr\u1EADn" }))] }), _jsxs("span", { className: "text-xs text-gray-500 font-medium", children: [qs.questionCount, " c\u00E2u h\u1ECFi"] })] }), _jsx("h3", { className: "text-lg font-bold text-gray-900 mb-2 line-clamp-2", title: qs.title, children: qs.title }), qs.tags.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-1 mb-4", children: qs.tags.map((t, idx) => (_jsxs("span", { className: "px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600", children: ["#", t] }, idx))) }))] }), _jsxs("div", { className: "pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2", children: [_jsx("button", { type: "button", "data-testid": `btn-edit-questions-${qs.id}`, onClick: () => onOpenQuestionEditor?.(qs), className: "min-h-[44px] px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 flex items-center gap-1.5 cursor-pointer", title: "Ch\u1EC9nh s\u1EEDa danh s\u00E1ch c\u00E2u h\u1ECFi v\u00E0 \u0111\u00E1p \u00E1n", children: "\u270F\uFE0F So\u1EA1n / Ch\u1EC9nh s\u1EEDa c\u00E2u h\u1ECFi" }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { type: "button", "data-testid": `btn-clone-${qs.id}`, onClick: () => onCloneQuestionSet(qs.id), title: "Nh\u00E2n b\u1EA3n b\u1ED9 \u0111\u1EC1", className: "min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded", children: "\uD83D\uDCCB" }), _jsx("button", { type: "button", "data-testid": `btn-export-${qs.id}`, onClick: () => onExportQuestionSet(qs.id), title: "Xu\u1EA5t file .educlass", className: "min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 text-gray-600 hover:text-green-600 hover:bg-gray-100 rounded", children: "\uD83D\uDCBE" }), _jsx("button", { type: "button", "data-testid": `btn-delete-${qs.id}`, onClick: () => {
                                                if (window.confirm(`Bạn có chắc chắn muốn xóa bộ đề "${qs.title}" không?\nTất cả câu hỏi và hình ảnh trong bộ đề này sẽ bị xóa khỏi hệ thống.`)) {
                                                    onDeleteQuestionSet(qs.id);
                                                }
                                            }, title: "X\u00F3a b\u1ED9 \u0111\u1EC1", className: "min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded", children: "\uD83D\uDDD1\uFE0F" })] })] })] }, qs.id))) })), isCreateModalOpen && (_jsx("div", { style: {
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    boxSizing: 'border-box',
                }, onClick: e => {
                    if (e.target === e.currentTarget)
                        handleCloseCreateModal();
                }, children: _jsxs("div", { style: {
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        maxWidth: '520px',
                        width: '100%',
                        padding: '24px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        boxSizing: 'border-box',
                    }, children: [_jsxs("div", { className: "flex justify-between items-center border-b pb-3", children: [_jsx("h2", { className: "text-xl font-bold text-gray-800", children: "T\u1EA1o b\u1ED9 c\u00E2u h\u1ECFi m\u1EDBi" }), _jsx("button", { type: "button", onClick: handleCloseCreateModal, className: "text-gray-400 hover:text-gray-600 text-2xl font-bold min-h-[44px] min-w-[44px] flex items-center justify-center", children: "\u00D7" })] }), errorMessage && (_jsx("div", { className: "p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200", children: errorMessage })), _jsxs("form", { onSubmit: handleSubmitCreate, className: "space-y-4", children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: ["Ti\u00EAu \u0111\u1EC1 b\u1ED9 \u0111\u1EC1 ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { type: "text", required: true, placeholder: "V\u00ED d\u1EE5: Ki\u1EC3m tra 1 ti\u1EBFt H\u1ECDc k\u1EF3 1", value: formTitle, onChange: e => setFormTitle(e.target.value), "data-testid": "input-set-title", className: "w-full min-h-[48px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "M\u00F4n h\u1ECDc" }), _jsx("input", { type: "text", required: true, placeholder: "To\u00E1n, V\u1EADt l\u00FD...", value: formSubject, onChange: e => setFormSubject(e.target.value), "data-testid": "input-set-subject", className: "w-full min-h-[48px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Kh\u1ED1i l\u1EDBp" }), _jsx("select", { value: formGrade, onChange: e => setFormGrade(Number(e.target.value)), "data-testid": "select-set-grade", className: "w-full min-h-[48px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white", children: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(g => (_jsxs("option", { value: g, children: ["L\u1EDBp ", g] }, g))) })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Th\u1EBB ph\u00E2n lo\u1EA1i (c\u00E1ch nhau b\u1EDFi d\u1EA5u ph\u1EA9y)" }), _jsx("input", { type: "text", placeholder: "Gi\u1EA3i t\u00EDch, Ch\u01B0\u01A1ng 1, Kh\u1EA3o s\u00E1t h\u00E0m s\u1ED1", value: formTags, onChange: e => setFormTags(e.target.value), "data-testid": "input-set-tags", className: "w-full min-h-[48px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsxs("div", { className: "flex justify-end gap-3 pt-3 border-t", children: [_jsx("button", { type: "button", onClick: handleCloseCreateModal, className: "min-h-[48px] px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50", children: "H\u1EE7y" }), _jsx("button", { type: "submit", "data-testid": "btn-submit-create-set", className: "min-h-[48px] px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700", children: "T\u1EA1o b\u1ED9 \u0111\u1EC1" })] })] })] }) })), _jsx(WordImportModal, { isOpen: isWordModalOpen, onClose: () => setIsWordModalOpen(false), onDownloadTemplate: handleDownloadWordTemplate, onSaveQuestions: handleSaveWordQuestions }), isMatrixModalOpen && (_jsx(MatrixImportModal, { isOpen: isMatrixModalOpen, onClose: () => setIsMatrixModalOpen(false), onSuccess: async () => {
                    if (onRefresh) {
                        await onRefresh();
                    }
                } }))] }));
};
//# sourceMappingURL=QuestionBankTab.js.map