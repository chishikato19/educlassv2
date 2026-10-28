import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { renderLatexInText } from '@educlass/question-kit';
import { api } from '../api/client.js';
import { COMMON_SUBJECTS, GRADES } from './BankCurriculumTree.js';
import { getDifficultyBadgeInfo } from './DifficultyFilterBar.js';
export const MatrixImportModal = ({ isOpen, onClose, onSuccess, initialGrade = 12, initialSubject = 'Toán', }) => {
    // Quản lý bước: 'config' (Cấu hình ma trận) hoặc 'preview' (Xem trước & Đổi câu)
    const [step, setStep] = useState('config');
    // Cấu hình chung
    const [title, setTitle] = useState('Đề thi sinh từ Ma trận');
    const [grade, setGrade] = useState(initialGrade);
    const [subject, setSubject] = useState(initialSubject);
    const [shuffleQuestions, setShuffleQuestions] = useState(true);
    const [shuffleOptions, setShuffleOptions] = useState(true);
    // Cây bài học ngân hàng & bài học đã chọn
    const [tree, setTree] = useState([]);
    const [isLoadingTree, setIsLoadingTree] = useState(false);
    const [selectedLessons, setSelectedLessons] = useState([]);
    // Thống kê số câu sẵn có theo từng bài (statsMap)
    const [statsMap, setStatsMap] = useState({});
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    // Số lượng câu muốn bốc theo từng bài (lesson -> MatrixCounts)
    const [countsMap, setCountsMap] = useState({});
    // Danh sách câu hỏi vừa bốc (dành cho bước Review & Swap)
    const [previewQuestions, setPreviewQuestions] = useState([]);
    const [swappingIndex, setSwappingIndex] = useState(null);
    const [swapMessage, setSwapMessage] = useState(null);
    // Trạng thái sinh đề
    const [isGenerating, setIsGenerating] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    if (!isOpen)
        return null;
    // 1. Tải cây bài học ngân hàng theo Khối và Môn
    const loadTree = useCallback(async () => {
        setIsLoadingTree(true);
        try {
            const data = await api.getBankTree({ grade, subject });
            setTree(data);
            // Mặc định chọn 2-3 bài đầu tiên nếu chưa chọn bài nào
            if (selectedLessons.length === 0 && data.length > 0) {
                const initialSelected = [];
                for (const chapterNode of data) {
                    for (const les of chapterNode.lessons) {
                        if (les.totalQuestions > 0) {
                            initialSelected.push({
                                chapter: chapterNode.chapter,
                                lesson: les.lesson,
                            });
                            if (initialSelected.length >= 3)
                                break;
                        }
                    }
                    if (initialSelected.length >= 3)
                        break;
                }
                setSelectedLessons(initialSelected);
            }
        }
        catch (err) {
            console.error('Lỗi khi tải danh mục cây bài học:', err);
            setTree([]);
        }
        finally {
            setIsLoadingTree(false);
        }
    }, [grade, subject]);
    useEffect(() => {
        loadTree();
    }, [loadTree]);
    // 2. Tải thống kê số câu sẵn có theo các bài học đã chọn
    useEffect(() => {
        if (selectedLessons.length === 0) {
            setStatsMap({});
            return;
        }
        let isMounted = true;
        setIsLoadingStats(true);
        const lessonsList = selectedLessons.map(l => l.lesson);
        api
            .getMatrixStats({ grade, subject, lessons: lessonsList })
            .then(res => {
            if (isMounted) {
                setStatsMap(res.stats || {});
            }
        })
            .catch(err => {
            console.error('Lỗi khi tải thống kê ma trận:', err);
        })
            .finally(() => {
            if (isMounted)
                setIsLoadingStats(false);
        });
        return () => {
            isMounted = false;
        };
    }, [grade, subject, selectedLessons]);
    // Toggle chọn một bài học
    const handleToggleLesson = (chapter, lesson) => {
        setSelectedLessons(prev => {
            const exists = prev.some(l => l.chapter === chapter && l.lesson === lesson);
            if (exists) {
                const next = prev.filter(l => !(l.chapter === chapter && l.lesson === lesson));
                setCountsMap(cm => {
                    const updated = { ...cm };
                    delete updated[lesson];
                    return updated;
                });
                return next;
            }
            else {
                return [...prev, { chapter, lesson }];
            }
        });
    };
    // Cập nhật số câu muốn bốc cho một bài
    const handleUpdateCount = (lesson, diff, valStr) => {
        const num = Math.max(0, parseInt(valStr, 10) || 0);
        setCountsMap(prev => {
            const current = prev[lesson] || { nb: 0, th: 0, vd: 0, vdc: 0 };
            return {
                ...prev,
                [lesson]: {
                    ...current,
                    [diff]: num,
                },
            };
        });
    };
    // 3. Tính toán tổng số câu và kiểm tra hợp lệ
    const totals = useMemo(() => {
        let totalNb = 0;
        let totalTh = 0;
        let totalVd = 0;
        let totalVdc = 0;
        let hasOverflow = false;
        for (const item of selectedLessons) {
            const counts = countsMap[item.lesson] || { nb: 0, th: 0, vd: 0, vdc: 0 };
            const available = statsMap[item.lesson]?.available || { nb: 0, th: 0, vd: 0, vdc: 0 };
            totalNb += counts.nb;
            totalTh += counts.th;
            totalVd += counts.vd;
            totalVdc += counts.vdc;
            if (counts.nb > available.nb ||
                counts.th > available.th ||
                counts.vd > available.vd ||
                counts.vdc > available.vdc) {
                hasOverflow = true;
            }
        }
        const totalQuestions = totalNb + totalTh + totalVd + totalVdc;
        return {
            nb: totalNb,
            th: totalTh,
            vd: totalVd,
            vdc: totalVdc,
            total: totalQuestions,
            hasOverflow,
        };
    }, [selectedLessons, countsMap, statsMap]);
    // 4. Chuyển sang bước Xem trước & Đổi câu (Review & Swap)
    const handleGoToPreview = async (e) => {
        e.preventDefault();
        if (!title.trim()) {
            setErrorMessage('Vui lòng nhập tiêu đề cho bộ đề thi');
            return;
        }
        if (selectedLessons.length === 0) {
            setErrorMessage('Vui lòng chọn ít nhất một bài học vào ma trận');
            return;
        }
        if (totals.total === 0) {
            setErrorMessage('Vui lòng nhập số câu cần bốc (tổng số câu phải lớn hơn 0)');
            return;
        }
        if (totals.hasOverflow) {
            setErrorMessage('Có câu hỏi yêu cầu vượt quá số lượng sẵn có trong kho. Vui lòng kiểm tra các ô màu đỏ!');
            return;
        }
        setIsGenerating(true);
        setErrorMessage(null);
        try {
            const requestPayload = {
                title: title.trim(),
                grade,
                subject: subject.trim(),
                matrix: selectedLessons.map(l => ({
                    chapter: l.chapter,
                    lesson: l.lesson,
                    counts: countsMap[l.lesson] || { nb: 0, th: 0, vd: 0, vdc: 0 },
                })),
                shuffleQuestions,
                shuffleOptions,
            };
            const res = await api.previewSetFromMatrix(requestPayload);
            setPreviewQuestions(res.questions);
            setSwapMessage(null);
            setStep('preview');
        }
        catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Có lỗi khi bốc câu hỏi từ ma trận');
        }
        finally {
            setIsGenerating(false);
        }
    };
    // 5. Tính năng Đổi câu tương đương (Swap Question)
    const handleSwapQuestion = async (index) => {
        const currentQ = previewQuestions[index];
        if (!currentQ)
            return;
        setSwappingIndex(index);
        setSwapMessage(null);
        try {
            // Tìm các câu hỏi cùng bài học và cùng mức độ trong ngân hàng
            const candidates = await api.getBankQuestions({
                grade,
                subject,
                chapter: currentQ.chapter,
                lesson: currentQ.lesson,
                difficulty: currentQ.difficulty,
            });
            // Lọc bỏ những câu đã nằm trong danh sách hiện tại
            const currentIds = new Set(previewQuestions.map(q => q.id));
            const availableCandidates = candidates.filter(q => !currentIds.has(q.id));
            if (availableCandidates.length > 0) {
                // Bốc ngẫu nhiên 1 câu tương đương
                const replacement = availableCandidates[Math.floor(Math.random() * availableCandidates.length)];
                const updated = [...previewQuestions];
                updated[index] = replacement;
                setPreviewQuestions(updated);
                setSwapMessage(`Đã đổi thành công Câu ${index + 1} sang một câu hỏi tương đương khác!`);
            }
            else {
                setSwapMessage(`Kho không còn câu hỏi nào khác ở "${currentQ.lesson}" với mức độ này.`);
            }
        }
        catch (err) {
            console.error('Lỗi khi đổi câu hỏi tương đương:', err);
            setSwapMessage('Không thể đổi câu hỏi lúc này!');
        }
        finally {
            setSwappingIndex(null);
        }
    };
    // 6. Xác nhận lưu bộ đề vào Question Sets
    const handleConfirmSave = async () => {
        if (previewQuestions.length === 0)
            return;
        setIsGenerating(true);
        setErrorMessage(null);
        try {
            const snapshotQuestions = previewQuestions.map(bq => {
                let content = {};
                let answer = {};
                try {
                    content = JSON.parse(bq.contentJson);
                }
                catch {
                    // fallback
                }
                try {
                    answer = JSON.parse(bq.answerJson);
                }
                catch {
                    // fallback
                }
                return {
                    type: bq.type,
                    points: bq.points,
                    ...content,
                    ...answer,
                };
            });
            const newSet = await api.createQuestionSet({
                title: title.trim(),
                subject: subject.trim(),
                grade,
                tags: ['Sinh từ Ma trận', `Khối ${grade}`, subject.trim()],
                questions: snapshotQuestions,
            });
            onSuccess(newSet.id);
            onClose();
        }
        catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Có lỗi khi lưu bộ đề thi');
        }
        finally {
            setIsGenerating(false);
        }
    };
    const levels = ['nb', 'th', 'vd', 'vdc'];
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs", children: _jsxs("div", { className: "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200", children: [_jsxs("div", { className: "px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/70", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("span", { className: "w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center text-lg", children: "\uD83C\uDFAF" }), _jsxs("div", { children: [_jsx("h3", { className: "font-bold text-base text-zinc-900 dark:text-zinc-100", children: step === 'config'
                                                ? 'Bốc Câu Hỏi Theo Ma Trận Đề Thi'
                                                : `Xem Trước & Đổi Câu — ${title}` }), _jsx("p", { className: "text-xs text-zinc-500 dark:text-zinc-400", children: step === 'config'
                                                ? 'Tự động bốc ngẫu nhiên câu hỏi theo chuẩn 4 mức độ nhận thức của Bộ GD&ĐT'
                                                : 'Kiểm tra nội dung câu hỏi và đổi câu tương đương cùng mức độ nếu cần' })] })] }), _jsx("button", { type: "button", onClick: onClose, className: "w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer", children: "\u2715" })] }), step === 'config' && (_jsxs("form", { onSubmit: handleGoToPreview, className: "flex-1 overflow-y-auto p-6 space-y-5", children: [errorMessage && (_jsx("div", { className: "p-3 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300", children: errorMessage })), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800", children: [_jsxs("div", { className: "md:col-span-2", children: [_jsx("label", { className: "block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1", children: "Ti\u00EAu \u0111\u1EC1 b\u1ED9 \u0111\u1EC1 m\u1EDBi *" }), _jsx("input", { type: "text", required: true, value: title, onChange: e => setTitle(e.target.value), placeholder: "VD: Ki\u1EC3m tra 1 ti\u1EBFt \u0110\u1EA1i s\u1ED1 12 - Ma tr\u1EADn chu\u1EA9n", className: "w-full text-xs font-semibold px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[40px]" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1", children: "Kh\u1ED1i l\u1EDBp *" }), _jsx("select", { value: grade, onChange: e => {
                                                setGrade(Number(e.target.value));
                                                setSelectedLessons([]);
                                            }, className: "w-full text-xs font-bold px-2.5 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 min-h-[40px] cursor-pointer", children: GRADES.map(g => (_jsxs("option", { value: g, children: ["Kh\u1ED1i ", g] }, g))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1", children: "M\u00F4n h\u1ECDc *" }), _jsx("select", { value: subject, onChange: e => {
                                                setSubject(e.target.value);
                                                setSelectedLessons([]);
                                            }, className: "w-full text-xs font-bold px-2.5 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 min-h-[40px] cursor-pointer", children: COMMON_SUBJECTS.map(s => (_jsx("option", { value: s, children: s }, s))) })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("label", { className: "text-xs font-bold text-zinc-800 dark:text-zinc-200", children: ["Ch\u1ECDn c\u00E1c b\u00E0i h\u1ECDc c\u1EA7n \u0111\u01B0a v\u00E0o \u0111\u1EC1 thi (", selectedLessons.length, " b\u00E0i \u0111\u00E3 ch\u1ECDn):"] }), _jsx("span", { className: "text-[11px] text-zinc-500", children: "B\u1EA5m v\u00E0o c\u00E1c b\u00E0i b\u00EAn d\u01B0\u1EDBi \u0111\u1EC3 th\u00EAm/b\u1EDBt kh\u1ECFi b\u1EA3ng ma tr\u1EADn" })] }), _jsx("div", { className: "p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 max-h-40 overflow-y-auto space-y-2", children: isLoadingTree ? (_jsx("div", { className: "py-4 text-center text-xs text-zinc-400", children: "\u0110ang t\u1EA3i danh m\u1EE5c b\u00E0i h\u1ECDc..." })) : tree.length === 0 ? (_jsxs("div", { className: "py-4 text-center text-xs text-zinc-400", children: ["Kho ng\u00E2n h\u00E0ng ch\u01B0a c\u00F3 c\u00E2u h\u1ECFi n\u00E0o cho ", subject, " Kh\u1ED1i ", grade, ". H\u00E3y th\u00EAm c\u00E2u h\u1ECFi ho\u1EB7c nh\u1EADp t\u1EEB Word tr\u01B0\u1EDBc!"] })) : (tree.map(chapterNode => (_jsxs("div", { className: "space-y-1", children: [_jsx("div", { className: "text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide", children: chapterNode.chapter }), _jsx("div", { className: "flex flex-wrap gap-1.5 pl-2", children: chapterNode.lessons.map(les => {
                                                    const isSelected = selectedLessons.some(l => l.chapter === chapterNode.chapter && l.lesson === les.lesson);
                                                    return (_jsxs("button", { type: "button", onClick: () => handleToggleLesson(chapterNode.chapter, les.lesson), className: `inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${isSelected
                                                            ? 'bg-purple-600 text-white font-semibold shadow-xs'
                                                            : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'}`, children: [_jsx("span", { children: les.lesson }), _jsx("span", { className: `text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isSelected
                                                                    ? 'bg-white/20 text-white'
                                                                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'}`, children: les.totalQuestions })] }, les.lesson));
                                                }) })] }, chapterNode.chapter)))) })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h4", { className: "text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider", children: "B\u1EA3ng C\u1EA5u H\u00ECnh Ma Tr\u1EADn S\u1ED1 C\u00E2u" }), isLoadingStats && (_jsx("span", { className: "text-xs text-purple-600 animate-pulse", children: "\u0110ang \u0111\u1ED3ng b\u1ED9 s\u1ED1 c\u00E2u c\u00F3 s\u1EB5n trong kho..." }))] }), selectedLessons.length === 0 ? (_jsx("div", { className: "p-8 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs text-zinc-400", children: "Ch\u01B0a ch\u1ECDn b\u00E0i h\u1ECDc n\u00E0o. H\u00E3y ch\u1ECDn \u00EDt nh\u1EA5t m\u1ED9t b\u00E0i h\u1ECDc \u1EDF danh s\u00E1ch ph\u00EDa tr\u00EAn!" })) : (_jsx("div", { className: "border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-x-auto shadow-xs", children: _jsxs("table", { className: "w-full text-xs text-left border-collapse", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-700 font-bold", children: [_jsx("th", { className: "p-3 min-w-[200px]", children: "B\u00E0i h\u1ECDc / Ch\u01B0\u01A1ng" }), levels.map(diff => {
                                                            const info = getDifficultyBadgeInfo(diff);
                                                            return (_jsx("th", { className: "p-3 text-center min-w-[130px]", children: _jsxs("span", { className: "inline-flex items-center gap-1", children: [_jsx("span", { children: info.shapeIcon }), _jsx("span", { children: info.label })] }) }, diff));
                                                        }), _jsx("th", { className: "p-3 text-center min-w-[80px]", children: "T\u1ED5ng c\u00E2u" }), _jsx("th", { className: "p-3 text-center w-12", children: "X\u00F3a" })] }) }), _jsx("tbody", { className: "divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900", children: selectedLessons.map(item => {
                                                    const counts = countsMap[item.lesson] || {
                                                        nb: 0,
                                                        th: 0,
                                                        vd: 0,
                                                        vdc: 0,
                                                    };
                                                    const available = statsMap[item.lesson]?.available || {
                                                        nb: 0,
                                                        th: 0,
                                                        vd: 0,
                                                        vdc: 0,
                                                    };
                                                    const rowTotal = counts.nb + counts.th + counts.vd + counts.vdc;
                                                    return (_jsxs("tr", { className: "hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors", children: [_jsxs("td", { className: "p-3", children: [_jsx("div", { className: "font-bold text-zinc-900 dark:text-zinc-100", children: item.lesson }), _jsx("div", { className: "text-[11px] text-zinc-500 truncate max-w-[220px]", children: item.chapter })] }), levels.map(diff => {
                                                                const val = counts[diff];
                                                                const avail = available[diff];
                                                                const isOver = val > avail;
                                                                return (_jsx("td", { className: "p-2 text-center align-top", children: _jsxs("div", { className: "inline-flex flex-col items-center", children: [_jsx("input", { type: "number", min: "0", max: avail, value: val === 0 ? '' : val, onChange: e => handleUpdateCount(item.lesson, diff, e.target.value), placeholder: "0", className: `w-18 text-center text-xs font-bold py-1.5 px-2 rounded-xl border focus:outline-none focus:ring-2 ${isOver
                                                                                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 ring-rose-500'
                                                                                    : val > 0
                                                                                        ? 'border-purple-400 bg-purple-50/40 text-purple-900 dark:bg-purple-950/30 dark:text-purple-200'
                                                                                        : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800'}` }), _jsx("span", { className: `text-[10px] mt-1 font-semibold ${isOver ? 'text-rose-600 font-bold' : 'text-zinc-400'}`, children: isOver ? `Kho có ${avail}!` : `Có sẵn: ${avail}` })] }) }, diff));
                                                            }), _jsx("td", { className: "p-3 text-center font-bold text-zinc-800 dark:text-zinc-200", children: rowTotal }), _jsx("td", { className: "p-3 text-center", children: _jsx("button", { type: "button", onClick: () => handleToggleLesson(item.chapter, item.lesson), title: "B\u1ECF b\u00E0i n\u00E0y kh\u1ECFi ma tr\u1EADn", className: "text-zinc-400 hover:text-rose-600 cursor-pointer text-sm", children: "\u2715" }) })] }, item.lesson));
                                                }) }), _jsx("tfoot", { children: _jsxs("tr", { className: "bg-zinc-50 dark:bg-zinc-800/90 border-t-2 border-zinc-200 dark:border-zinc-700 font-bold text-zinc-900 dark:text-zinc-100", children: [_jsxs("td", { className: "p-3", children: [_jsx("div", { children: "T\u1ED4NG C\u1ED8NG \u0110\u1EC0 THI:" }), _jsx("div", { className: "text-[11px] font-normal text-zinc-500", children: "T\u1EF7 l\u1EC7 ph\u00E2n b\u1ED5 ma tr\u1EADn" })] }), levels.map(diff => {
                                                            const sum = totals[diff];
                                                            const pct = totals.total > 0 ? Math.round((sum / totals.total) * 100) : 0;
                                                            const info = getDifficultyBadgeInfo(diff);
                                                            return (_jsxs("td", { className: "p-3 text-center", children: [_jsxs("div", { className: "text-sm text-purple-700 dark:text-purple-300", children: [sum, " c\u00E2u"] }), _jsxs("div", { className: "text-[10px] text-zinc-500", children: [pct, "% (", info.shortLabel, ")"] })] }, diff));
                                                        }), _jsxs("td", { className: "p-3 text-center text-base text-purple-600 font-extrabold", children: [totals.total, " c\u00E2u"] }), _jsx("td", {})] }) })] }) }))] }), _jsxs("div", { className: "flex flex-wrap items-center gap-6 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 text-xs", children: [_jsxs("label", { className: "inline-flex items-center gap-2 cursor-pointer font-semibold text-zinc-700 dark:text-zinc-300", children: [_jsx("input", { type: "checkbox", checked: shuffleQuestions, onChange: e => setShuffleQuestions(e.target.checked), className: "w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer" }), _jsx("span", { children: "\uD83D\uDD00 T\u1EF1 \u0111\u1ED9ng x\u00E1o tr\u1ED9n th\u1EE9 t\u1EF1 c\u00E1c c\u00E2u h\u1ECFi" })] }), _jsxs("label", { className: "inline-flex items-center gap-2 cursor-pointer font-semibold text-zinc-700 dark:text-zinc-300", children: [_jsx("input", { type: "checkbox", checked: shuffleOptions, onChange: e => setShuffleOptions(e.target.checked), className: "w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer" }), _jsx("span", { children: "\uD83D\uDD00 T\u1EF1 \u0111\u1ED9ng \u0111\u1EA3o th\u1EE9 t\u1EF1 c\u00E1c ph\u01B0\u01A1ng \u00E1n l\u1EF1a ch\u1ECDn (A, B, C, D)" })] })] }), _jsxs("div", { className: "pt-3 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800", children: [_jsx("button", { type: "button", onClick: onClose, className: "px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 min-h-[44px] cursor-pointer", children: "H\u1EE7y b\u1ECF" }), _jsx("button", { type: "submit", disabled: isGenerating ||
                                        totals.total === 0 ||
                                        totals.hasOverflow ||
                                        selectedLessons.length === 0, className: "px-6 py-2.5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/25 min-h-[44px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all", children: isGenerating
                                        ? 'Đang bốc câu hỏi...'
                                        : `👁️ Xem trước & Đổi câu (${totals.total} câu)` })] })] })), step === 'preview' && (_jsxs("div", { className: "flex-1 overflow-y-auto p-6 space-y-4", children: [swapMessage && (_jsxs("div", { className: "p-3 text-xs rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 flex items-center justify-between", children: [_jsx("span", { children: swapMessage }), _jsx("button", { type: "button", onClick: () => setSwapMessage(null), className: "text-xs text-purple-500 hover:text-purple-800 cursor-pointer font-bold", children: "\u2715" })] })), _jsxs("div", { className: "flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs", children: [_jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsxs("span", { className: "font-bold text-zinc-900 dark:text-zinc-100", children: ["Danh s\u00E1ch ", previewQuestions.length, " c\u00E2u h\u1ECFi \u0111\u00E3 b\u1ED1c:"] }), _jsx("span", { className: "text-zinc-500", children: "(B\u1EA5m n\u00FAt \"\uD83D\uDD04 \u0110\u1ED5i c\u00E2u\" tr\u00EAn t\u1EEBng c\u00E2u \u0111\u1EC3 b\u1ED1c c\u00E2u h\u1ECFi kh\u00E1c c\u00F9ng m\u1EE9c \u0111\u1ED9)" })] }), _jsx("button", { type: "button", onClick: () => setStep('config'), className: "text-purple-600 dark:text-purple-400 font-bold hover:underline cursor-pointer", children: "\u2190 Ch\u1EC9nh s\u1EEDa l\u1EA1i ma tr\u1EADn" })] }), _jsx("div", { className: "space-y-3 max-h-[50vh] overflow-y-auto pr-1", children: previewQuestions.map((q, idx) => {
                                const diffInfo = getDifficultyBadgeInfo(q.difficulty);
                                let parsedContent = { stem: { text: q.contentJson } };
                                let parsedAnswer = {};
                                try {
                                    parsedContent = JSON.parse(q.contentJson);
                                }
                                catch {
                                    // Fallback
                                }
                                try {
                                    parsedAnswer = JSON.parse(q.answerJson);
                                }
                                catch {
                                    // Fallback
                                }
                                const isSwappingThis = swappingIndex === idx;
                                return (_jsxs("div", { className: "p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/40 space-y-3 shadow-xs hover:border-purple-300 transition-all", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 flex-wrap", children: [_jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsxs("span", { className: "text-xs font-bold px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200", children: ["C\u00E2u ", idx + 1] }), _jsxs("span", { className: `inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg border ${diffInfo.badgeClass}`, children: [_jsx("span", { children: diffInfo.shapeIcon }), _jsx("span", { children: diffInfo.label })] }), _jsx("span", { className: "text-xs font-medium px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800", children: q.lesson }), _jsxs("span", { className: "text-xs font-semibold text-zinc-500", children: [q.points, " \u0111i\u1EC3m"] })] }), _jsxs("button", { type: "button", disabled: isSwappingThis, onClick: () => handleSwapQuestion(idx), title: "B\u1ED1c m\u1ED9t c\u00E2u h\u1ECFi kh\u00E1c trong kho c\u00F9ng b\u00E0i v\u00E0 c\u00F9ng m\u1EE9c \u0111\u1ED9 n\u00E0y", className: "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 transition-colors min-h-[36px] cursor-pointer disabled:opacity-60", children: [_jsx("span", { className: isSwappingThis ? 'animate-spin' : '', children: "\uD83D\uDD04" }), _jsx("span", { children: isSwappingThis ? 'Đang đổi...' : 'Đổi câu khác' })] })] }), _jsx("div", { className: "text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed", dangerouslySetInnerHTML: {
                                                __html: renderLatexInText(parsedContent.stem?.text || q.contentJson),
                                            } }), parsedContent.options && parsedContent.options.length > 0 && (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1", children: parsedContent.options.map((opt, optIdx) => {
                                                const isCorrect = parsedAnswer.correct === optIdx ||
                                                    parsedAnswer.correct === opt.id ||
                                                    parsedAnswer.correct === opt.text;
                                                const optLabel = String.fromCharCode(65 + optIdx);
                                                return (_jsxs("div", { className: `flex items-start gap-2 p-2 rounded-xl border text-xs ${isCorrect
                                                        ? 'bg-emerald-50/80 border-emerald-400 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-200 font-semibold'
                                                        : 'bg-zinc-50/60 border-zinc-200 dark:bg-zinc-900/40 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'}`, children: [_jsx("span", { className: `w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${isCorrect
                                                                ? 'bg-emerald-600 text-white'
                                                                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'}`, children: isCorrect ? '✓' : optLabel }), _jsx("div", { className: "flex-1 overflow-x-auto", dangerouslySetInnerHTML: {
                                                                __html: renderLatexInText(opt.text),
                                                            } })] }, opt.id || optIdx));
                                            }) }))] }, q.id || idx));
                            }) }), _jsxs("div", { className: "pt-3 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800", children: [_jsx("button", { type: "button", onClick: () => setStep('config'), className: "px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 min-h-[44px] cursor-pointer", children: "\u2190 Quay l\u1EA1i ma tr\u1EADn" }), _jsx("button", { type: "button", disabled: isGenerating || previewQuestions.length === 0, onClick: handleConfirmSave, className: "px-6 py-2.5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/25 min-h-[44px] cursor-pointer disabled:opacity-50 transition-all", children: isGenerating
                                        ? 'Đang lưu bộ đề...'
                                        : `💾 Xác nhận lưu vào Kho bộ đề (${previewQuestions.length} câu)` })] })] }))] }) }));
};
//# sourceMappingURL=MatrixImportModal.js.map