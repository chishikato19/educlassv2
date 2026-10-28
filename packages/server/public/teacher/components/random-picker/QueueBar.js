import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ACADEMIC_PERFORMANCE_LABELS } from '@educlass/protocol';
import { Button } from '@educlass/ui-kit';
export const QueueBar = ({ queue, expReward, onGradeStudent, onRemoveFromQueue, }) => {
    if (queue.length === 0) {
        return (_jsxs("div", { className: "w-full bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4 text-center text-sm text-slate-400", children: [_jsx("span", { className: "mr-2", children: "\u23F3" }), "H\u00E0ng ch\u1EDD h\u1ECDc sinh l\u00EAn b\u1EA3ng hi\u1EC7n \u0111ang tr\u1ED1ng. Khi g\u1ECDi h\u1ECDc sinh l\u00EAn b\u1EA3ng l\u00E0m b\u00E0i, b\u1EA1n c\u00F3 th\u1EC3 b\u1EA5m \"Cho v\u00E0o h\u00E0ng ch\u1EDD\" \u0111\u1EC3 ch\u1EA5m \u0111i\u1EC3m sau."] }));
    }
    const formatWaitTime = (queuedAt) => {
        const elapsedSeconds = Math.max(0, Math.floor((Date.now() - queuedAt) / 1000));
        if (elapsedSeconds < 60)
            return `${elapsedSeconds}s trước`;
        const minutes = Math.floor(elapsedSeconds / 60);
        return `${minutes}p trước`;
    };
    return (_jsxs("div", { className: "w-full bg-white rounded-2xl border-2 border-indigo-200 shadow-lg p-4 sm:p-5", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2 mb-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xl", children: "\u23F3" }), _jsxs("h3", { className: "font-bold text-slate-800 text-base", children: ["H\u1ECDc sinh \u0111ang l\u00EAn b\u1EA3ng l\u00E0m b\u00E0i (", queue.length, ")"] })] }), _jsx("span", { className: "text-xs text-slate-500 font-medium", children: "B\u1EA5m ch\u1EA5m \u0111i\u1EC3m ngay khi h\u1ECDc sinh ho\u00E0n th\u00E0nh b\u00E0i l\u00E0m" })] }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3", children: queue.map(item => {
                    const perf = item.student.academicPerformance;
                    const perfLabel = ACADEMIC_PERFORMANCE_LABELS[perf];
                    return (_jsxs("div", { className: "flex flex-col justify-between bg-gradient-to-r from-slate-50 to-indigo-50/30 border border-indigo-100 rounded-xl p-3 shadow-sm hover:shadow-md transition", children: [_jsxs("div", { className: "flex items-start justify-between gap-2 mb-2", children: [_jsxs("div", { children: [_jsx("div", { className: "font-bold text-slate-800 text-sm leading-snug", children: item.student.name }), _jsxs("div", { className: "flex items-center gap-2 mt-0.5", children: [item.student.code && (_jsx("span", { className: "text-xs font-mono text-slate-500", children: item.student.code })), _jsx("span", { className: `text-[10px] font-bold px-1.5 py-0.2 rounded ${perf === 'tot'
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : perf === 'kha'
                                                                ? 'bg-blue-100 text-blue-800'
                                                                : 'bg-amber-100 text-amber-800'}`, children: perfLabel }), _jsx("span", { className: "text-[10px] text-slate-400", children: formatWaitTime(item.queuedAt) })] })] }), _jsx("button", { type: "button", onClick: () => onRemoveFromQueue(item.id), className: "text-slate-400 hover:text-red-500 text-sm p-1 rounded transition", title: "X\u00F3a kh\u1ECFi h\u00E0ng ch\u1EDD", children: "\u2715" })] }), _jsxs("div", { className: "flex items-center gap-2 mt-2 pt-2 border-t border-slate-200/60", children: [_jsxs(Button, { variant: "primary", onClick: () => onGradeStudent(item, true), className: "flex-1 text-xs py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold", children: ["\u2713 \u0110\u00FAng (+", expReward, " EXP)"] }), _jsx(Button, { variant: "secondary", onClick: () => onGradeStudent(item, false), className: "flex-1 text-xs py-1.5 bg-slate-200 hover:bg-red-100 hover:text-red-700 text-slate-700 font-bold", children: "\u2715 Sai (0)" })] })] }, item.id));
                }) })] }));
};
//# sourceMappingURL=QueueBar.js.map