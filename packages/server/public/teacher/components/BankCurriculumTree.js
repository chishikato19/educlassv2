import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo, useState } from 'react';
export const COMMON_SUBJECTS = [
    'Toán',
    'Vật lý',
    'Hóa học',
    'Sinh học',
    'Tin học',
    'Ngữ văn',
    'Tiếng Anh',
    'Lịch sử',
    'Địa lý',
    'GDCD',
    'Khoa học tự nhiên',
    'Lịch sử và Địa lý',
    'Công nghệ',
];
export const GRADES = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
export const BankCurriculumTree = ({ tree, currentGrade, currentSubject, selectedChapter, selectedLesson, onGradeChange, onSubjectChange, onSelectLesson, onSelectChapter, onClearSelection, isLoading = false, className = '', }) => {
    // Quản lý các chương đang mở rộng trong Accordion
    const [expandedChapters, setExpandedChapters] = useState(() => {
        // Mặc định mở chương đang được chọn hoặc mở tất cả nếu có ít hơn 5 chương
        const initial = new Set();
        if (selectedChapter) {
            initial.add(selectedChapter);
        }
        else {
            tree.slice(0, 4).forEach(node => initial.add(node.chapter));
        }
        return initial;
    });
    // Tự động mở chương khi người dùng chọn một bài trong chương đó
    React.useEffect(() => {
        if (selectedChapter && !expandedChapters.has(selectedChapter)) {
            setExpandedChapters(prev => new Set([...prev, selectedChapter]));
        }
    }, [selectedChapter]);
    const toggleChapter = (chapter) => {
        setExpandedChapters(prev => {
            const next = new Set(prev);
            if (next.has(chapter)) {
                next.delete(chapter);
            }
            else {
                next.add(chapter);
            }
            return next;
        });
    };
    const expandAll = () => {
        setExpandedChapters(new Set(tree.map(node => node.chapter)));
    };
    const collapseAll = () => {
        setExpandedChapters(new Set());
    };
    const totalQuestionsInTree = useMemo(() => {
        return tree.reduce((acc, curr) => acc + curr.totalQuestions, 0);
    }, [tree]);
    return (_jsxs("div", { className: `bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col h-full overflow-hidden ${className}`, children: [_jsxs("div", { className: "p-4 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/50 space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" }), _jsx("h3", { className: "font-bold text-zinc-900 dark:text-zinc-100 text-sm", children: "C\u00E2y Ph\u00E2n C\u1EA5p Ch\u01B0\u01A1ng Tr\u00ECnh" })] }), _jsxs("span", { className: "text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800", children: [totalQuestionsInTree, " c\u00E2u"] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1", children: "Kh\u1ED1i l\u1EDBp" }), _jsx("select", { "aria-label": "Ch\u1ECDn kh\u1ED1i l\u1EDBp", value: currentGrade, onChange: e => onGradeChange(Number(e.target.value)), className: "w-full text-xs font-semibold px-2.5 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[40px] cursor-pointer", children: GRADES.map(g => (_jsxs("option", { value: g, children: ["Kh\u1ED1i ", g] }, g))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1", children: "M\u00F4n h\u1ECDc" }), _jsx("select", { "aria-label": "Ch\u1ECDn m\u00F4n h\u1ECDc", value: currentSubject, onChange: e => onSubjectChange(e.target.value), className: "w-full text-xs font-semibold px-2.5 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[40px] cursor-pointer", children: COMMON_SUBJECTS.map(s => (_jsx("option", { value: s, children: s }, s))) })] })] }), _jsxs("div", { className: "flex items-center justify-between text-xs pt-1", children: [_jsx("button", { type: "button", onClick: onClearSelection, className: `font-medium transition-colors px-2 py-1 rounded-lg cursor-pointer ${!selectedChapter && !selectedLesson
                                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'}`, children: "T\u1EA5t c\u1EA3 b\u00E0i h\u1ECDc" }), _jsxs("div", { className: "flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400", children: [_jsx("button", { type: "button", onClick: expandAll, title: "M\u1EDF r\u1ED9ng t\u1EA5t c\u1EA3 ch\u01B0\u01A1ng", className: "hover:text-blue-600 dark:hover:text-blue-400 px-1 py-0.5 rounded cursor-pointer", children: "M\u1EDF h\u1EBFt" }), _jsx("span", { children: "\u2022" }), _jsx("button", { type: "button", onClick: collapseAll, title: "Thu g\u1ECDn t\u1EA5t c\u1EA3 ch\u01B0\u01A1ng", className: "hover:text-blue-600 dark:hover:text-blue-400 px-1 py-0.5 rounded cursor-pointer", children: "Thu l\u1EA1i" })] })] })] }), _jsx("div", { className: "flex-1 overflow-y-auto p-3 space-y-2", children: isLoading ? (_jsxs("div", { className: "py-12 flex flex-col items-center justify-center text-zinc-400 gap-2", children: [_jsx("div", { className: "w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" }), _jsx("span", { className: "text-xs", children: "\u0110ang t\u1EA3i danh m\u1EE5c..." })] })) : tree.length === 0 ? (_jsxs("div", { className: "py-10 px-4 text-center", children: [_jsx("div", { className: "w-12 h-12 mx-auto rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 text-xl mb-3", children: "\uD83D\uDCDA" }), _jsx("p", { className: "text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1", children: "Ch\u01B0a c\u00F3 c\u00E2u h\u1ECFi" }), _jsxs("p", { className: "text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-3", children: ["M\u00F4n ", currentSubject, " - Kh\u1ED1i ", currentGrade, " ch\u01B0a c\u00F3 b\u00E0i h\u1ECDc n\u00E0o trong ng\u00E2n h\u00E0ng."] }), _jsx("p", { className: "text-xs text-blue-600 dark:text-blue-400 font-medium", children: "G\u1EE3i \u00FD: Nh\u1EADp t\u1EC7p Word (.docx) \u0111\u1EC3 t\u1EA1o ch\u01B0\u01A1ng b\u00E0i t\u1EF1 \u0111\u1ED9ng!" })] })) : (tree.map(chapterNode => {
                    const isExpanded = expandedChapters.has(chapterNode.chapter);
                    const isChapterSelected = selectedChapter === chapterNode.chapter && !selectedLesson;
                    return (_jsxs("div", { className: "border border-zinc-200/80 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-800/40", children: [_jsxs("div", { className: `flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors select-none ${isChapterSelected
                                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold'
                                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200'}`, onClick: () => toggleChapter(chapterNode.chapter), children: [_jsxs("div", { className: "flex items-center gap-2 flex-1 min-w-0 pr-2", children: [_jsx("span", { className: `text-xs transition-transform duration-200 ${isExpanded ? 'rotate-90' : 'rotate-0'}`, children: "\u25B6" }), _jsx("span", { className: "text-xs font-bold truncate", title: chapterNode.chapter, children: chapterNode.chapter })] }), _jsxs("div", { className: "flex items-center gap-1.5 flex-shrink-0", children: [_jsx("span", { className: "text-[11px] px-2 py-0.5 rounded-full font-bold bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300", children: chapterNode.totalQuestions }), onSelectChapter && (_jsx("button", { type: "button", title: "L\u1ECDc to\u00E0n b\u1ED9 ch\u01B0\u01A1ng n\u00E0y", onClick: e => {
                                                    e.stopPropagation();
                                                    onSelectChapter(chapterNode.chapter);
                                                }, className: "text-[11px] text-blue-600 dark:text-blue-400 hover:underline px-1 py-0.5 cursor-pointer", children: "Ch\u1ECDn" }))] })] }), isExpanded && (_jsx("div", { className: "border-t border-zinc-100 dark:border-zinc-800/70 bg-zinc-50/40 dark:bg-zinc-900/30 p-1.5 space-y-1", children: chapterNode.lessons.length === 0 ? (_jsx("div", { className: "text-[11px] text-zinc-400 py-2 text-center italic", children: "Kh\u00F4ng c\u00F3 b\u00E0i h\u1ECDc" })) : (chapterNode.lessons.map(lessonItem => {
                                    const isLessonSelected = selectedChapter === chapterNode.chapter &&
                                        selectedLesson === lessonItem.lesson;
                                    return (_jsxs("button", { type: "button", onClick: () => onSelectLesson(chapterNode.chapter, lessonItem.lesson), title: `${lessonItem.lesson} (${lessonItem.totalQuestions} câu)`, className: `w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-all min-h-[40px] cursor-pointer ${isLessonSelected
                                            ? 'bg-blue-600 text-white font-semibold shadow-xs'
                                            : 'hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'}`, children: [_jsx("span", { className: "truncate pr-2 flex-1", children: lessonItem.lesson }), _jsx("div", { className: "flex items-center gap-1 flex-shrink-0", children: _jsx("span", { className: `text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isLessonSelected
                                                        ? 'bg-white/25 text-white'
                                                        : 'bg-zinc-200/80 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'}`, children: lessonItem.totalQuestions }) })] }, lessonItem.lesson));
                                })) }))] }, chapterNode.chapter));
                })) })] }));
};
//# sourceMappingURL=BankCurriculumTree.js.map