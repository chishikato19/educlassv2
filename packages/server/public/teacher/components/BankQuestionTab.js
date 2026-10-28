import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { renderLatexInText } from '@educlass/question-kit';
import { api } from '../api/client.js';
import { BankCurriculumTree } from './BankCurriculumTree.js';
import { DifficultyFilterBar, getDifficultyBadgeInfo } from './DifficultyFilterBar.js';
import { BankWordImportModal } from './BankWordImportModal.js';
export const BankQuestionTab = ({ onShowToast, onOpenWordImport, className = '', }) => {
    // 1. Phân cấp lọc
    const [grade, setGrade] = useState(12);
    const [subject, setSubject] = useState('Toán');
    const [selectedChapter, setSelectedChapter] = useState(null);
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [selectedDifficulty, setSelectedDifficulty] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    // 2. Dữ liệu
    const [tree, setTree] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [isLoadingTree, setIsLoadingTree] = useState(false);
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
    // 3. Modal Soạn / Sửa câu hỏi
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [editorError, setEditorError] = useState(null);
    // Form states cho Modal soạn câu hỏi
    const [formChapter, setFormChapter] = useState('');
    const [formLesson, setFormLesson] = useState('');
    const [formDifficulty, setFormDifficulty] = useState('nb');
    const [formType, setFormType] = useState('mcq4');
    const [formPoints, setFormPoints] = useState(10);
    const [formStemText, setFormStemText] = useState('');
    const [formOptions, setFormOptions] = useState(['', '', '', '']);
    const [formCorrectIndex, setFormCorrectIndex] = useState(0);
    const [formExplanation, setFormExplanation] = useState('');
    // 4. Modal xác nhận xóa
    const [questionToDelete, setQuestionToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    // 5. Modal Nhập từ Word
    const [isWordModalOpen, setIsWordModalOpen] = useState(false);
    const searchInputId = useId();
    // Tải cây phân cấp
    const loadTree = useCallback(async () => {
        setIsLoadingTree(true);
        try {
            const data = await api.getBankTree({ grade, subject });
            setTree(data);
        }
        catch (err) {
            console.error('Lỗi khi tải cây chương trình:', err);
            setTree([]);
        }
        finally {
            setIsLoadingTree(false);
        }
    }, [grade, subject]);
    // Tải danh sách câu hỏi
    const loadQuestions = useCallback(async () => {
        setIsLoadingQuestions(true);
        try {
            const queryParams = {
                grade,
                subject,
            };
            if (selectedChapter)
                queryParams.chapter = selectedChapter;
            if (selectedLesson)
                queryParams.lesson = selectedLesson;
            if (selectedDifficulty !== 'all')
                queryParams.difficulty = selectedDifficulty;
            if (searchTerm.trim())
                queryParams.search = searchTerm.trim();
            const data = await api.getBankQuestions(queryParams);
            setQuestions(data);
        }
        catch (err) {
            console.error('Lỗi khi tải câu hỏi ngân hàng:', err);
            setQuestions([]);
        }
        finally {
            setIsLoadingQuestions(false);
        }
    }, [grade, subject, selectedChapter, selectedLesson, selectedDifficulty, searchTerm]);
    useEffect(() => {
        loadTree();
    }, [loadTree]);
    useEffect(() => {
        loadQuestions();
    }, [loadQuestions]);
    // Thống kê số lượng theo 4 mức độ của danh sách hiện tại
    const currentCounts = useMemo(() => {
        const counts = { nb: 0, th: 0, vd: 0, vdc: 0 };
        for (const q of questions) {
            if (q.difficulty in counts) {
                counts[q.difficulty]++;
            }
        }
        return counts;
    }, [questions]);
    // Mở modal tạo mới
    const handleOpenCreateModal = () => {
        setEditingQuestion(null);
        setFormChapter(selectedChapter || 'Chương 1');
        setFormLesson(selectedLesson || 'Bài 1');
        setFormDifficulty('nb');
        setFormType('mcq4');
        setFormPoints(10);
        setFormStemText('');
        setFormOptions(['', '', '', '']);
        setFormCorrectIndex(0);
        setFormExplanation('');
        setEditorError(null);
        setIsEditorOpen(true);
    };
    // Mở modal sửa
    const handleOpenEditModal = (q) => {
        setEditingQuestion(q);
        setFormChapter(q.chapter);
        setFormLesson(q.lesson);
        setFormDifficulty(q.difficulty);
        setFormType(q.type);
        setFormPoints(q.points);
        try {
            const content = JSON.parse(q.contentJson);
            setFormStemText(content.stem?.text || '');
            if (content.options && content.options.length > 0) {
                setFormOptions(content.options.map(o => o.text));
            }
            else {
                setFormOptions(['', '', '', '']);
            }
        }
        catch {
            setFormStemText(q.contentJson);
            setFormOptions(['', '', '', '']);
        }
        try {
            const answer = JSON.parse(q.answerJson);
            if (typeof answer.correct === 'number') {
                setFormCorrectIndex(answer.correct);
            }
            else {
                setFormCorrectIndex(0);
            }
            setFormExplanation(answer.explanation || '');
        }
        catch {
            setFormCorrectIndex(0);
            setFormExplanation('');
        }
        setEditorError(null);
        setIsEditorOpen(true);
    };
    // Lưu câu hỏi (Thêm mới hoặc Cập nhật)
    const handleSaveQuestion = async (e) => {
        e.preventDefault();
        if (!formStemText.trim()) {
            setEditorError('Vui lòng nhập nội dung câu hỏi');
            return;
        }
        if (!formChapter.trim()) {
            setEditorError('Vui lòng nhập tên chương');
            return;
        }
        if (!formLesson.trim()) {
            setEditorError('Vui lòng nhập tên bài');
            return;
        }
        // Đóng gói nội dung theo chuẩn Mcq4
        const contentPayload = {
            stem: { text: formStemText.trim() },
            options: formOptions.map((text, idx) => ({
                id: `opt_${idx}`,
                text: text.trim(),
            })),
        };
        const answerPayload = {
            correct: formCorrectIndex,
            ...(formExplanation.trim() ? { explanation: formExplanation.trim() } : {}),
        };
        setIsSaving(true);
        setEditorError(null);
        try {
            if (editingQuestion) {
                // Cập nhật
                const updateData = {
                    grade,
                    subject,
                    chapter: formChapter.trim(),
                    lesson: formLesson.trim(),
                    difficulty: formDifficulty,
                    type: formType,
                    points: formPoints,
                    contentJson: JSON.stringify(contentPayload),
                    answerJson: JSON.stringify(answerPayload),
                };
                await api.updateBankQuestion(editingQuestion.id, updateData);
                onShowToast?.('Đã cập nhật câu hỏi ngân hàng!');
            }
            else {
                // Tạo mới
                const createData = {
                    grade,
                    subject,
                    chapter: formChapter.trim(),
                    lesson: formLesson.trim(),
                    difficulty: formDifficulty,
                    type: formType,
                    points: formPoints,
                    contentJson: JSON.stringify(contentPayload),
                    answerJson: JSON.stringify(answerPayload),
                };
                await api.createBankQuestion(createData);
                onShowToast?.('Đã thêm câu hỏi vào ngân hàng!');
            }
            setIsEditorOpen(false);
            await Promise.all([loadQuestions(), loadTree()]);
        }
        catch (err) {
            setEditorError(err instanceof Error ? err.message : 'Lỗi khi lưu câu hỏi');
        }
        finally {
            setIsSaving(false);
        }
    };
    // Xác nhận xóa câu hỏi
    const handleConfirmDelete = async () => {
        if (!questionToDelete)
            return;
        setIsDeleting(true);
        try {
            const res = await api.deleteBankQuestion(questionToDelete.id);
            let msg = 'Đã xóa câu hỏi khỏi ngân hàng!';
            if (res.cleanedAssetsCount > 0) {
                msg += ` (Đã dọn dẹp ${res.cleanedAssetsCount} tệp ảnh mồ côi)`;
            }
            onShowToast?.(msg);
            setQuestionToDelete(null);
            await Promise.all([loadQuestions(), loadTree()]);
        }
        catch (err) {
            console.error('Lỗi khi xóa câu hỏi:', err);
            onShowToast?.('Không thể xóa câu hỏi!');
        }
        finally {
            setIsDeleting(false);
        }
    };
    return (_jsxs("div", { className: `flex flex-col lg:flex-row gap-5 min-h-[640px] ${className}`, children: [_jsx("div", { className: "w-full lg:w-80 xl:w-96 flex-shrink-0", children: _jsx(BankCurriculumTree, { tree: tree, currentGrade: grade, currentSubject: subject, selectedChapter: selectedChapter, selectedLesson: selectedLesson, onGradeChange: newGrade => {
                        setGrade(newGrade);
                        setSelectedChapter(null);
                        setSelectedLesson(null);
                    }, onSubjectChange: newSubj => {
                        setSubject(newSubj);
                        setSelectedChapter(null);
                        setSelectedLesson(null);
                    }, onSelectLesson: (chap, les) => {
                        setSelectedChapter(chap);
                        setSelectedLesson(les);
                    }, onSelectChapter: chap => {
                        setSelectedChapter(chap);
                        setSelectedLesson(null);
                    }, onClearSelection: () => {
                        setSelectedChapter(null);
                        setSelectedLesson(null);
                    }, isLoading: isLoadingTree }) }), _jsxs("div", { className: "flex-1 flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden p-5 space-y-4", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800/80 pb-4", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1", children: [_jsxs("span", { children: ["Kh\u1ED1i ", grade] }), _jsx("span", { children: "\u2022" }), _jsx("span", { children: subject }), selectedChapter && (_jsxs(_Fragment, { children: [_jsx("span", { children: "\u2022" }), _jsx("span", { className: "truncate max-w-[200px]", title: selectedChapter, children: selectedChapter })] }))] }), _jsxs("h2", { className: "text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2", children: [_jsx("span", { children: selectedLesson ||
                                                    (selectedChapter ? 'Tất cả bài trong chương' : 'Toàn bộ câu hỏi') }), _jsxs("span", { className: "text-xs px-2.5 py-0.5 rounded-full font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300", children: [questions.length, " c\u00E2u"] })] })] }), _jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsxs("button", { type: "button", onClick: () => {
                                            if (onOpenWordImport) {
                                                onOpenWordImport();
                                            }
                                            else {
                                                setIsWordModalOpen(true);
                                            }
                                        }, className: "inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 transition-colors min-h-[44px] cursor-pointer", children: [_jsx("span", { children: "\uD83D\uDCC4" }), _jsx("span", { children: "Nh\u1EADp t\u1EEB Word" })] }), _jsxs("button", { type: "button", onClick: handleOpenCreateModal, className: "inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition-colors min-h-[44px] cursor-pointer", children: [_jsx("span", { children: "+" }), _jsx("span", { children: "Th\u00EAm c\u00E2u h\u1ECFi" })] }), _jsx("button", { type: "button", onClick: () => {
                                            loadTree();
                                            loadQuestions();
                                        }, title: "L\u00E0m m\u1EDBi d\u1EEF li\u1EC7u", className: "px-3 py-2 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 transition-colors min-h-[44px] cursor-pointer", children: "\uD83D\uDD04" })] })] }), _jsxs("div", { className: "flex flex-col md:flex-row md:items-center justify-between gap-3", children: [_jsx(DifficultyFilterBar, { selectedDifficulty: selectedDifficulty, onSelectDifficulty: setSelectedDifficulty, counts: currentCounts, totalCount: questions.length }), _jsxs("div", { className: "relative min-w-[220px]", children: [_jsx("input", { id: searchInputId, type: "text", placeholder: "T\u00ECm ki\u1EBFm n\u1ED9i dung \u0111\u1EC1 b\u00E0i...", value: searchTerm, onChange: e => setSearchTerm(e.target.value), className: "w-full text-xs font-medium pl-8 pr-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]" }), _jsx("span", { className: "absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs", children: "\uD83D\uDD0D" })] })] }), _jsx("div", { className: "flex-1 overflow-y-auto space-y-4 pt-1", children: isLoadingQuestions ? (_jsxs("div", { className: "py-20 flex flex-col items-center justify-center text-zinc-400 gap-3", children: [_jsx("div", { className: "w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" }), _jsx("p", { className: "text-sm", children: "\u0110ang t\u1EA3i c\u00E2u h\u1ECFi ng\u00E2n h\u00E0ng..." })] })) : questions.length === 0 ? (_jsxs("div", { className: "py-16 px-4 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl", children: [_jsx("div", { className: "w-14 h-14 mx-auto rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 text-2xl mb-3", children: "\uD83D\uDCDD" }), _jsx("h4", { className: "text-base font-bold text-zinc-800 dark:text-zinc-200 mb-1", children: "Kh\u00F4ng t\u00ECm th\u1EA5y c\u00E2u h\u1ECFi ph\u00F9 h\u1EE3p" }), _jsx("p", { className: "text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mb-4", children: searchTerm
                                        ? 'Không có câu hỏi nào khớp với từ khóa tìm kiếm.'
                                        : 'Chưa có câu hỏi nào trong mục này. Bạn có thể thêm câu hỏi thủ công hoặc nhập hàng loạt từ tệp Word (.docx).' }), _jsxs("div", { className: "flex items-center justify-center gap-2", children: [_jsx("button", { type: "button", onClick: handleOpenCreateModal, className: "px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 min-h-[44px] cursor-pointer", children: "+ So\u1EA1n c\u00E2u h\u1ECFi ngay" }), onOpenWordImport && (_jsx("button", { type: "button", onClick: onOpenWordImport, className: "px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 min-h-[44px] cursor-pointer", children: "\uD83D\uDCC4 Nh\u1EADp t\u1EEB file Word" }))] })] })) : (questions.map((q, index) => {
                            const diffInfo = getDifficultyBadgeInfo(q.difficulty);
                            let parsedContent = { stem: { text: q.contentJson } };
                            let parsedAnswer = {};
                            try {
                                parsedContent = JSON.parse(q.contentJson);
                            }
                            catch {
                                // Giữ nguyên chuỗi gốc
                            }
                            try {
                                parsedAnswer = JSON.parse(q.answerJson);
                            }
                            catch {
                                // Giữ nguyên
                            }
                            return (_jsxs("div", { className: "border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 bg-white dark:bg-zinc-800/40 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-xs space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 flex-wrap", children: [_jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsxs("span", { className: "text-xs font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-700 px-2 py-0.5 rounded-lg", children: ["C\u00E2u ", index + 1] }), _jsxs("span", { className: `inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg border ${diffInfo.badgeClass}`, children: [_jsx("span", { children: diffInfo.shapeIcon }), _jsx("span", { children: diffInfo.label })] }), _jsx("span", { className: "text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800", children: q.lesson }), _jsxs("span", { className: "text-xs font-semibold text-blue-600 dark:text-blue-400", children: [q.points, " \u0111i\u1EC3m"] })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { type: "button", onClick: () => handleOpenEditModal(q), className: "px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors cursor-pointer", children: "S\u1EEDa" }), _jsx("button", { type: "button", onClick: () => setQuestionToDelete(q), className: "px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer", children: "X\u00F3a" })] })] }), _jsx("div", { className: "text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed font-normal", dangerouslySetInnerHTML: {
                                            __html: renderLatexInText(parsedContent.stem?.text || q.contentJson),
                                        } }), parsedContent.options && parsedContent.options.length > 0 && (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1", children: parsedContent.options.map((opt, optIdx) => {
                                            const isCorrect = parsedAnswer.correct === optIdx ||
                                                parsedAnswer.correct === opt.id ||
                                                parsedAnswer.correct === opt.text;
                                            const optionLabel = String.fromCharCode(65 + optIdx); // A, B, C, D
                                            return (_jsxs("div", { className: `flex items-start gap-2.5 p-2.5 rounded-xl border text-xs leading-snug transition-all ${isCorrect
                                                    ? 'bg-emerald-50/80 border-emerald-400 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-200 font-medium ring-1 ring-emerald-300'
                                                    : 'bg-zinc-50/60 border-zinc-200 dark:bg-zinc-900/40 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'}`, children: [_jsx("span", { className: `w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${isCorrect
                                                            ? 'bg-emerald-600 text-white'
                                                            : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'}`, children: isCorrect ? '✓' : optionLabel }), _jsx("div", { className: "flex-1 overflow-x-auto", dangerouslySetInnerHTML: {
                                                            __html: renderLatexInText(opt.text),
                                                        } }), isCorrect && (_jsx("span", { className: "ml-auto px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300", children: "\u0110\u00E1p \u00E1n \u0111\u00FAng" }))] }, opt.id || optIdx));
                                        }) })), typeof parsedAnswer.correct === 'boolean' &&
                                        (!parsedContent.options || parsedContent.options.length === 0) && (_jsxs("div", { className: "p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 text-xs flex items-center gap-2", children: [_jsx("span", { className: "font-bold text-zinc-600 dark:text-zinc-400", children: "\u0110\u00E1p \u00E1n chu\u1EA9n:" }), _jsx("span", { className: `px-2.5 py-0.5 rounded font-bold border ${parsedAnswer.correct
                                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                                    : 'bg-rose-100 text-rose-800 border-rose-300'}`, children: parsedAnswer.correct ? '✓ ĐÚNG (True)' : '✗ SAI (False)' })] })), parsedAnswer.explanation && (_jsxs("div", { className: "text-xs p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 flex items-start gap-2", children: [_jsx("span", { className: "font-bold flex-shrink-0", children: "\uD83D\uDCA1 L\u1EDDi gi\u1EA3i:" }), _jsx("div", { className: "flex-1 leading-relaxed", dangerouslySetInnerHTML: {
                                                    __html: renderLatexInText(parsedAnswer.explanation),
                                                } })] }))] }, q.id));
                        })) })] }), isEditorOpen && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs", children: _jsxs("div", { className: "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200", children: [_jsxs("div", { className: "px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between", children: [_jsx("h3", { className: "font-bold text-base text-zinc-900 dark:text-zinc-100", children: editingQuestion ? 'Chỉnh sửa câu hỏi ngân hàng' : 'Thêm câu hỏi mới vào ngân hàng' }), _jsx("button", { type: "button", onClick: () => setIsEditorOpen(false), className: "w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer", children: "\u2715" })] }), _jsxs("form", { onSubmit: handleSaveQuestion, className: "flex-1 overflow-y-auto p-6 space-y-4", children: [editorError && (_jsx("div", { className: "p-3 text-xs rounded-xl bg-rose-50 border border-rose-200 text-rose-700", children: editorError })), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1", children: "T\u00EAn ch\u01B0\u01A1ng *" }), _jsx("input", { type: "text", required: true, value: formChapter, onChange: e => setFormChapter(e.target.value), placeholder: "VD: Ch\u01B0\u01A1ng 1: \u1EE8ng d\u1EE5ng \u0111\u1EA1o h\u00E0m", className: "w-full text-xs font-semibold px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1", children: "T\u00EAn b\u00E0i h\u1ECDc *" }), _jsx("input", { type: "text", required: true, value: formLesson, onChange: e => setFormLesson(e.target.value), placeholder: "VD: B\u00E0i 1: T\u00EDnh \u0111\u01A1n \u0111i\u1EC7u", className: "w-full text-xs font-semibold px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]" })] })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1", children: "M\u1EE9c \u0111\u1ED9 nh\u1EADn th\u1EE9c (B\u1ED9 GD&\u0110T) *" }), _jsxs("select", { value: formDifficulty, onChange: e => setFormDifficulty(e.target.value), className: "w-full text-xs font-semibold px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] cursor-pointer", children: [_jsx("option", { value: "nb", children: "\u25CF Nh\u1EADn bi\u1EBFt (NB)" }), _jsx("option", { value: "th", children: "\u25A0 Th\u00F4ng hi\u1EC3u (TH)" }), _jsx("option", { value: "vd", children: "\u25B2 V\u1EADn d\u1EE5ng (VD)" }), _jsx("option", { value: "vdc", children: "\u25C6 V\u1EADn d\u1EE5ng cao (VDC)" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1", children: "\u0110i\u1EC3m s\u1ED1" }), _jsx("input", { type: "number", min: "1", max: "100", value: formPoints, onChange: e => setFormPoints(Number(e.target.value)), className: "w-full text-xs font-semibold px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1", children: "N\u1ED9i dung c\u00E2u h\u1ECFi (H\u1ED7 tr\u1EE3 c\u00F4ng th\u1EE9c to\u00E1n $...$ ho\u1EB7c $$...$$) *" }), _jsx("textarea", { required: true, rows: 3, value: formStemText, onChange: e => setFormStemText(e.target.value), placeholder: "Nh\u1EADp n\u1ED9i dung \u0111\u1EC1 b\u00E0i, v\u00ED d\u1EE5: Cho h\u00E0m s\u1ED1 $y = f(x)$ c\u00F3 b\u1EA3ng bi\u1EBFn thi\u00EAn nh\u01B0 sau...", className: "w-full text-xs font-medium p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "block text-xs font-bold text-zinc-700 dark:text-zinc-300", children: "C\u00E1c ph\u01B0\u01A1ng \u00E1n l\u1EF1a ch\u1ECDn (Ch\u1ECDn n\u00FAt tr\u00F2n \u0111\u1EC3 ch\u1EC9 \u0111\u1ECBnh \u0111\u00E1p \u00E1n \u0111\u00FAng) *" }), formOptions.map((optText, optIdx) => {
                                            const label = String.fromCharCode(65 + optIdx);
                                            const isChecked = formCorrectIndex === optIdx;
                                            return (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "radio", name: "correct-option-group", checked: isChecked, onChange: () => setFormCorrectIndex(optIdx), className: "w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer", title: `Chọn ${label} là đáp án đúng` }), _jsxs("span", { className: "w-5 text-xs font-bold text-zinc-600 dark:text-zinc-400", children: [label, "."] }), _jsx("input", { type: "text", value: optText, onChange: e => {
                                                            const updated = [...formOptions];
                                                            updated[optIdx] = e.target.value;
                                                            setFormOptions(updated);
                                                        }, placeholder: `Nội dung phương án ${label}`, className: `flex-1 text-xs font-medium px-3 py-2 rounded-xl border min-h-[40px] focus:outline-none focus:ring-2 focus:ring-blue-500 ${isChecked
                                                            ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200'
                                                            : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200'}` })] }, optIdx));
                                        })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1", children: "L\u1EDDi gi\u1EA3i chi ti\u1EBFt (T\u00F9y ch\u1ECDn)" }), _jsx("textarea", { rows: 2, value: formExplanation, onChange: e => setFormExplanation(e.target.value), placeholder: "Nh\u1EADp h\u01B0\u1EDBng d\u1EABn gi\u1EA3i ho\u1EB7c l\u1EDDi gi\u1EA3i chi ti\u1EBFt...", className: "w-full text-xs font-medium p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsxs("div", { className: "pt-2 flex items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800", children: [_jsx("button", { type: "button", onClick: () => setIsEditorOpen(false), className: "px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 min-h-[44px] cursor-pointer", children: "H\u1EE7y b\u1ECF" }), _jsx("button", { type: "submit", disabled: isSaving, className: "px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 min-h-[44px] cursor-pointer disabled:opacity-60", children: isSaving ? 'Đang lưu...' : 'Lưu câu hỏi' })] })] })] }) })), questionToDelete && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs", children: _jsxs("div", { className: "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200", children: [_jsx("div", { className: "w-12 h-12 mx-auto rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 text-xl", children: "\uD83D\uDDD1\uFE0F" }), _jsxs("div", { children: [_jsx("h4", { className: "font-bold text-base text-zinc-900 dark:text-zinc-100 mb-1", children: "X\u00F3a c\u00E2u h\u1ECFi kh\u1ECFi ng\u00E2n h\u00E0ng?" }), _jsx("p", { className: "text-xs text-zinc-500 dark:text-zinc-400", children: "H\u00E0nh \u0111\u1ED9ng n\u00E0y kh\u00F4ng th\u1EC3 ho\u00E0n t\u00E1c. C\u00E1c t\u1EC7p \u1EA3nh m\u1ED3 c\u00F4i (n\u1EBFu kh\u00F4ng c\u00F2n d\u00F9ng \u1EDF \u0111\u1EC1 thi n\u00E0o) s\u1EBD \u0111\u01B0\u1EE3c t\u1EF1 \u0111\u1ED9ng d\u1ECDn d\u1EB9p s\u1EA1ch s\u1EBD." })] }), _jsxs("div", { className: "flex items-center justify-center gap-2 pt-2", children: [_jsx("button", { type: "button", disabled: isDeleting, onClick: () => setQuestionToDelete(null), className: "flex-1 px-4 py-2.5 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 min-h-[44px] cursor-pointer", children: "H\u1EE7y" }), _jsx("button", { type: "button", disabled: isDeleting, onClick: handleConfirmDelete, className: "flex-1 px-4 py-2.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white min-h-[44px] cursor-pointer disabled:opacity-60", children: isDeleting ? 'Đang xóa...' : 'Xóa ngay' })] })] }) })), isWordModalOpen && (_jsx(BankWordImportModal, { isOpen: isWordModalOpen, currentGrade: grade, currentSubject: subject, currentChapter: selectedChapter, currentLesson: selectedLesson, onClose: () => setIsWordModalOpen(false), onSuccess: count => {
                    onShowToast?.(`Đã nhập thành công ${count} câu hỏi vào ngân hàng!`);
                    loadTree();
                    loadQuestions();
                } }))] }));
};
//# sourceMappingURL=BankQuestionTab.js.map