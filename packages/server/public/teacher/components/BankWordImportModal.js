import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId, useState } from 'react';
import { renderLatexInText } from '@educlass/question-kit';
import { api } from '../api/client.js';
import { COMMON_SUBJECTS, GRADES } from './BankCurriculumTree.js';
import { getDifficultyBadgeInfo } from './DifficultyFilterBar.js';
export const BankWordImportModal = ({ isOpen, onClose, onSuccess, currentGrade = 12, currentSubject = 'Toán', currentChapter = null, currentLesson = null, }) => {
    // Trạng thái cấu hình mặc định (khi file Word không có nhãn)
    const [grade, setGrade] = useState(currentGrade);
    const [subject, setSubject] = useState(currentSubject);
    const [defaultChapter, setDefaultChapter] = useState(currentChapter || 'Chương 1: Kiến thức nền tảng');
    const [defaultLesson, setDefaultLesson] = useState(currentLesson || 'Bài 1: Tổng quan');
    const [defaultDifficulty, setDefaultDifficulty] = useState('nb');
    // Trạng thái xử lý file & xem trước
    const [parsedData, setParsedData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [selectedFileName, setSelectedFileName] = useState('');
    const fileInputId = useId();
    if (!isOpen)
        return null;
    const readFileAsBase64 = (file) => {
        return new Promise((resolve, reject) => {
            if (typeof FileReader !== 'undefined') {
                const reader = new FileReader();
                reader.onload = () => {
                    const res = reader.result;
                    const base64 = res.includes(',') ? res.split(',')[1] : res;
                    resolve(base64 ?? '');
                };
                reader.onerror = () => reject(new Error('Không thể đọc file từ thiết bị'));
                reader.readAsDataURL(file);
            }
            else {
                file
                    .arrayBuffer()
                    .then(buf => {
                    if (typeof Buffer !== 'undefined') {
                        resolve(Buffer.from(buf).toString('base64'));
                    }
                    else {
                        const bytes = new Uint8Array(buf);
                        let binary = '';
                        for (let i = 0; i < bytes.byteLength; i++) {
                            binary += String.fromCharCode(bytes[i]);
                        }
                        resolve(window.btoa(binary));
                    }
                })
                    .catch(reject);
            }
        });
    };
    const processFile = async (file) => {
        if (!file.name.toLowerCase().endsWith('.docx')) {
            setErrorMessage('Vui lòng chọn tập tin Microsoft Word định dạng .docx');
            return;
        }
        setSelectedFileName(file.name);
        setIsLoading(true);
        setErrorMessage(null);
        try {
            await api.ensureAuthenticated();
            const base64 = await readFileAsBase64(file);
            const data = await api.importWord(base64);
            setParsedData(data);
        }
        catch (err) {
            let msg = 'Có lỗi khi đọc và phân tích file Word. Vui lòng kiểm tra lại định dạng file.';
            if (typeof err === 'string') {
                msg = err;
            }
            else if (err instanceof Error) {
                msg = err.message;
            }
            else if (err && typeof err === 'object' && 'message' in err) {
                msg = String(err.message);
            }
            setErrorMessage(msg);
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            void processFile(file);
        }
    };
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };
    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragOver(false);
    };
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            void processFile(file);
        }
    };
    // Cập nhật mức độ câu hỏi xem trước
    const handleUpdateItemDifficulty = (index, newDiff) => {
        if (!parsedData)
            return;
        const nextQuestions = [...parsedData.questions];
        const target = nextQuestions[index];
        if (target) {
            nextQuestions[index] = { ...target, difficulty: newDiff };
            setParsedData({ ...parsedData, questions: nextQuestions });
        }
    };
    // Lưu hàng loạt câu hỏi vào ngân hàng
    const handleSaveToBank = async () => {
        if (!parsedData || parsedData.questions.length === 0)
            return;
        setIsSaving(true);
        setErrorMessage(null);
        try {
            const bankItems = parsedData.questions.map(q => {
                const itemChapter = q.chapter?.trim() || defaultChapter.trim() || 'Chương 1';
                const itemLesson = q.lesson?.trim() || defaultLesson.trim() || 'Bài 1';
                const itemDifficulty = q.difficulty || defaultDifficulty;
                const itemType = q.type || 'mcq4';
                // Tách contentJson và answerJson
                let contentJson = '{}';
                let answerJson = '{}';
                if (q.type === 'mcq4') {
                    contentJson = JSON.stringify({
                        stem: q.stem,
                        options: q.options,
                    });
                    answerJson = JSON.stringify({
                        correct: q.correct,
                        ...(q.explanation ? { explanation: q.explanation.text } : {}),
                    });
                }
                else if (q.type === 'tf') {
                    contentJson = JSON.stringify({
                        stem: q.stem,
                    });
                    answerJson = JSON.stringify({
                        correct: q.correct,
                        ...(q.explanation ? { explanation: q.explanation.text } : {}),
                    });
                }
                else if (q.type === 'tf_group') {
                    contentJson = JSON.stringify({
                        stem: q.stem,
                        items: q.items,
                    });
                    answerJson = JSON.stringify({
                        items: q.items.map(it => it.correct),
                        ...(q.explanation ? { explanation: q.explanation.text } : {}),
                    });
                }
                else if (q.type === 'short') {
                    contentJson = JSON.stringify({
                        stem: q.stem,
                    });
                    answerJson = JSON.stringify({
                        acceptedAnswers: q.accepted,
                        ...(q.explanation ? { explanation: q.explanation.text } : {}),
                    });
                }
                else {
                    contentJson = JSON.stringify(q);
                    answerJson = JSON.stringify({
                        correct: q.correct,
                    });
                }
                return {
                    grade,
                    subject: subject.trim(),
                    chapter: itemChapter,
                    lesson: itemLesson,
                    difficulty: itemDifficulty,
                    type: itemType,
                    points: q.points ?? 10,
                    contentJson,
                    answerJson,
                };
            });
            const res = await api.createBatchBankQuestions(bankItems);
            onSuccess(res.count);
            onClose();
        }
        catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Lỗi khi lưu câu hỏi vào ngân hàng');
        }
        finally {
            setIsSaving(false);
        }
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs", children: _jsxs("div", { className: "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200", children: [_jsxs("div", { className: "px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/60 dark:bg-zinc-900/60", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("span", { className: "w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center text-base", children: "\uD83D\uDCC4" }), _jsxs("div", { children: [_jsx("h3", { className: "font-bold text-base text-zinc-900 dark:text-zinc-100", children: "Nh\u1EADp C\u00E2u H\u1ECFi Word V\u00E0o Ng\u00E2n H\u00E0ng" }), _jsx("p", { className: "text-xs text-zinc-500 dark:text-zinc-400", children: "T\u1EF1 \u0111\u1ED9ng nh\u1EADn di\u1EC7n [Ch\u01B0\u01A1ng], [B\u00E0i] v\u00E0 m\u1EE9c \u0111\u1ED9 [NB], [TH], [VD], [VDC]" })] })] }), _jsx("button", { type: "button", onClick: onClose, className: "w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer", children: "\u2715" })] }), _jsxs("div", { className: "flex-1 overflow-y-auto p-6 space-y-5", children: [errorMessage && (_jsx("div", { className: "p-3 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300", children: errorMessage })), _jsxs("div", { className: "p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-3", children: [_jsx("h4", { className: "text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider", children: "1. C\u1EA5u h\u00ECnh ph\u00E2n c\u1EA5p m\u1EB7c \u0111\u1ECBnh" }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1", children: "Kh\u1ED1i l\u1EDBp *" }), _jsx("select", { value: grade, onChange: e => setGrade(Number(e.target.value)), className: "w-full text-xs font-bold px-2.5 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 min-h-[40px] cursor-pointer", children: GRADES.map(g => (_jsxs("option", { value: g, children: ["Kh\u1ED1i ", g] }, g))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1", children: "M\u00F4n h\u1ECDc *" }), _jsx("select", { value: subject, onChange: e => setSubject(e.target.value), className: "w-full text-xs font-bold px-2.5 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 min-h-[40px] cursor-pointer", children: COMMON_SUBJECTS.map(s => (_jsx("option", { value: s, children: s }, s))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1", children: "Ch\u01B0\u01A1ng m\u1EB7c \u0111\u1ECBnh" }), _jsx("input", { type: "text", value: defaultChapter, onChange: e => setDefaultChapter(e.target.value), placeholder: "VD: Ch\u01B0\u01A1ng 1", className: "w-full text-xs font-semibold px-2.5 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 min-h-[40px]" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1", children: "B\u00E0i m\u1EB7c \u0111\u1ECBnh" }), _jsx("input", { type: "text", value: defaultLesson, onChange: e => setDefaultLesson(e.target.value), placeholder: "VD: B\u00E0i 1", className: "w-full text-xs font-semibold px-2.5 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 min-h-[40px]" })] })] }), _jsxs("div", { className: "flex items-center gap-3 pt-1 text-xs", children: [_jsx("span", { className: "text-[11px] font-semibold text-zinc-500 dark:text-zinc-400", children: "M\u1EE9c \u0111\u1ED9 m\u1EB7c \u0111\u1ECBnh n\u1EBFu c\u00E2u kh\u00F4ng g\u1EAFn nh\u00E3n:" }), _jsx("div", { className: "flex items-center gap-2", children: ['nb', 'th', 'vd', 'vdc'].map(diff => {
                                                const info = getDifficultyBadgeInfo(diff);
                                                return (_jsxs("button", { type: "button", onClick: () => setDefaultDifficulty(diff), className: `px-2 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${defaultDifficulty === diff ? info.activeBtnClass : info.inactiveBtnClass}`, children: [info.shapeIcon, " ", info.shortLabel] }, diff));
                                            }) })] })] }), !parsedData ? (_jsxs("div", { onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop, className: `border-2 border-dashed rounded-3xl p-8 text-center transition-all ${isDragOver
                                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                                : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 bg-zinc-50/30 dark:bg-zinc-900/30'}`, children: [_jsx("input", { id: fileInputId, type: "file", accept: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document", onChange: handleFileChange, className: "hidden" }), _jsx("div", { className: "w-16 h-16 mx-auto rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center text-3xl mb-3 shadow-xs", children: "\uD83D\uDCC4" }), _jsx("h4", { className: "text-base font-bold text-zinc-800 dark:text-zinc-200 mb-1", children: "K\u00E9o th\u1EA3 file Microsoft Word (.docx) v\u00E0o \u0111\u00E2y" }), _jsx("p", { className: "text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-4", children: "H\u1EC7 th\u1ED1ng t\u1EF1 \u0111\u1ED9ng ph\u00E1t hi\u1EC7n c\u00E1c nh\u00E3n c\u00FA ph\u00E1p [Ch\u01B0\u01A1ng: ...], [B\u00E0i: ...], [NB], [TH], [VD], [VDC] v\u00E0 h\u00ECnh \u1EA3nh \u0111\u00EDnh k\u00E8m." }), _jsx("div", { className: "flex items-center justify-center gap-3", children: _jsx("button", { type: "button", disabled: isLoading, onClick: () => document.getElementById(fileInputId)?.click(), className: "px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/20 min-h-[44px] cursor-pointer disabled:opacity-60", children: isLoading ? 'Đang đọc và phân tích file...' : 'Chọn file từ máy tính' }) }), _jsxs("div", { className: "mt-6 pt-4 border-t border-zinc-200/80 dark:border-zinc-800 text-left text-xs text-zinc-500 space-y-1 max-w-lg mx-auto", children: [_jsx("p", { className: "font-bold text-zinc-700 dark:text-zinc-300", children: "\uD83D\uDCA1 M\u1EB9o \u0111\u1ECBnh d\u1EA1ng chu\u1EA9n:" }), _jsxs("p", { children: ["\u2022 Ph\u00E2n chia b\u00E0i h\u1ECDc: G\u00F5", ' ', _jsx("code", { className: "text-blue-600 font-mono", children: "[Ch\u01B0\u01A1ng: 1]" }), " ho\u1EB7c", ' ', _jsx("code", { className: "text-blue-600 font-mono", children: "[B\u00E0i: T\u00EDnh \u0111\u01A1n \u0111i\u1EC7u]" }), "."] }), _jsxs("p", { children: ["\u2022 M\u1EE9c \u0111\u1ED9 nh\u1EADn th\u1EE9c: G\u00F5", ' ', _jsx("code", { className: "text-emerald-600 font-mono", children: "[NB] C\u00E2u 1:" }), " ho\u1EB7c", ' ', _jsx("code", { className: "text-rose-600 font-mono", children: "C\u00E2u 2 [VDC]:" }), "."] })] })] })) : (
                        /* VÙNG XEM TRƯỚC KẾT QUẢ PHÂN TÍCH */
                        _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 rounded-2xl", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-emerald-600 text-lg", children: "\u2705" }), _jsxs("div", { children: [_jsxs("span", { className: "text-xs font-bold text-emerald-900 dark:text-emerald-200", children: ["T\u1EC7p: ", selectedFileName] }), _jsxs("p", { className: "text-[11px] text-emerald-700 dark:text-emerald-400", children: ["\u0110\u00E3 nh\u1EADn di\u1EC7n th\u00E0nh c\u00F4ng ", parsedData.questions.length, " c\u00E2u h\u1ECFi h\u1EE3p l\u1EC7."] })] })] }), _jsx("button", { type: "button", onClick: () => {
                                                setParsedData(null);
                                                setSelectedFileName('');
                                            }, className: "text-xs font-semibold text-emerald-800 hover:underline px-2 py-1 cursor-pointer", children: "Ch\u1ECDn file kh\u00E1c" })] }), _jsx("div", { className: "border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden max-h-[380px] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800", children: parsedData.questions.map((q, idx) => {
                                        const effectiveDiff = q.difficulty || defaultDifficulty;
                                        const diffInfo = getDifficultyBadgeInfo(effectiveDiff);
                                        const effectiveChapter = q.chapter || defaultChapter;
                                        const effectiveLesson = q.lesson || defaultLesson;
                                        return (_jsxs("div", { className: "p-3 bg-white dark:bg-zinc-800/40 space-y-2", children: [_jsx("div", { className: "flex items-center justify-between gap-2 flex-wrap", children: _jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsxs("span", { className: "text-xs font-bold px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200", children: ["C\u00E2u ", idx + 1] }), _jsxs("select", { value: effectiveDiff, onChange: e => handleUpdateItemDifficulty(idx, e.target.value), className: `text-xs font-bold px-2 py-1 rounded-lg border cursor-pointer ${diffInfo.badgeClass}`, children: [_jsx("option", { value: "nb", children: "\u25CF NB - Nh\u1EADn bi\u1EBFt" }), _jsx("option", { value: "th", children: "\u25A0 TH - Th\u00F4ng hi\u1EC3u" }), _jsx("option", { value: "vd", children: "\u25B2 VD - V\u1EADn d\u1EE5ng" }), _jsx("option", { value: "vdc", children: "\u25C6 VDC - V\u1EADn d\u1EE5ng cao" })] }), _jsxs("span", { className: "text-[11px] font-medium px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800", children: [effectiveChapter, " \u2794 ", effectiveLesson] })] }) }), _jsx("div", { className: "text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed", dangerouslySetInnerHTML: {
                                                        __html: renderLatexInText(q.stem?.text || ''),
                                                    } }), q.type === 'mcq4' && (_jsxs("div", { className: "flex items-center gap-2 text-[11px] text-zinc-500 flex-wrap", children: [_jsx("span", { children: "\u0110\u00E1p \u00E1n \u0111\u00FAng:" }), _jsx("span", { className: "font-bold text-emerald-600", children: typeof q.correct === 'number'
                                                                ? String.fromCharCode(65 + q.correct)
                                                                : String(q.correct ?? '') })] }))] }, idx));
                                    }) })] }))] }), _jsxs("div", { className: "px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/60 dark:bg-zinc-900/60", children: [_jsx("button", { type: "button", onClick: onClose, className: "px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 min-h-[44px] cursor-pointer", children: "H\u1EE7y b\u1ECF" }), parsedData && (_jsx("button", { type: "button", disabled: isSaving || parsedData.questions.length === 0, onClick: handleSaveToBank, className: "px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/20 min-h-[44px] cursor-pointer disabled:opacity-60", children: isSaving
                                ? 'Đang lưu vào ngân hàng...'
                                : `Lưu vào Ngân hàng câu hỏi (${parsedData.questions.length} câu)` }))] })] }) }));
};
//# sourceMappingURL=BankWordImportModal.js.map