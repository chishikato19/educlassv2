import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const DIFFICULTY_CONFIG = {
    nb: {
        key: 'nb',
        label: 'Nhận biết',
        shortLabel: 'NB',
        shapeIcon: '●',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700',
        activeBtnClass: 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-500/30',
        inactiveBtnClass: 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-400 dark:bg-zinc-800 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-zinc-700',
    },
    th: {
        key: 'th',
        label: 'Thông hiểu',
        shortLabel: 'TH',
        shapeIcon: '■',
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-700',
        activeBtnClass: 'bg-sky-600 text-white border-sky-600 shadow-sm shadow-sky-500/30',
        inactiveBtnClass: 'bg-white text-sky-800 border-sky-200 hover:bg-sky-50 hover:border-sky-400 dark:bg-zinc-800 dark:text-sky-300 dark:border-sky-800 dark:hover:bg-zinc-700',
    },
    vd: {
        key: 'vd',
        label: 'Vận dụng',
        shortLabel: 'VD',
        shapeIcon: '▲',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700',
        activeBtnClass: 'bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-500/30',
        inactiveBtnClass: 'bg-white text-amber-800 border-amber-200 hover:bg-amber-50 hover:border-amber-400 dark:bg-zinc-800 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-zinc-700',
    },
    vdc: {
        key: 'vdc',
        label: 'Vận dụng cao',
        shortLabel: 'VDC',
        shapeIcon: '◆',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-700',
        activeBtnClass: 'bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-500/30',
        inactiveBtnClass: 'bg-white text-rose-800 border-rose-200 hover:bg-rose-50 hover:border-rose-400 dark:bg-zinc-800 dark:text-rose-300 dark:border-rose-800 dark:hover:bg-zinc-700',
    },
};
export function getDifficultyBadgeInfo(diff) {
    return DIFFICULTY_CONFIG[diff] ?? DIFFICULTY_CONFIG.nb;
}
export const DifficultyFilterBar = ({ selectedDifficulty, onSelectDifficulty, counts, totalCount, className = '', compact = false, }) => {
    const levels = ['nb', 'th', 'vd', 'vdc'];
    const calculatedTotal = totalCount !== undefined
        ? totalCount
        : counts
            ? counts.nb + counts.th + counts.vd + counts.vdc
            : undefined;
    return (_jsxs("div", { role: "group", "aria-label": "B\u1ED9 l\u1ECDc m\u1EE9c \u0111\u1ED9 nh\u1EADn th\u1EE9c c\u00E2u h\u1ECFi", className: `flex flex-wrap items-center gap-2 ${className}`, children: [_jsxs("button", { type: "button", onClick: () => onSelectDifficulty('all'), className: `inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold transition-all min-h-[44px] cursor-pointer ${selectedDifficulty === 'all'
                    ? 'bg-zinc-800 text-white border-zinc-800 shadow-sm shadow-zinc-800/20 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 dark:hover:bg-zinc-700'}`, children: [_jsx("span", { children: "T\u1EA5t c\u1EA3" }), calculatedTotal !== undefined && (_jsx("span", { className: `px-1.5 py-0.5 text-xs rounded-full font-bold ${selectedDifficulty === 'all'
                            ? 'bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900'
                            : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'}`, children: calculatedTotal }))] }), levels.map(lvl => {
                const info = DIFFICULTY_CONFIG[lvl];
                const isSelected = selectedDifficulty === lvl;
                const count = counts ? counts[lvl] : undefined;
                return (_jsxs("button", { type: "button", onClick: () => onSelectDifficulty(lvl), "aria-pressed": isSelected, title: `${info.label} (${info.shortLabel})`, className: `inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold transition-all min-h-[44px] cursor-pointer ${isSelected ? info.activeBtnClass : info.inactiveBtnClass}`, children: [_jsx("span", { className: "text-xs font-mono select-none", "aria-hidden": "true", children: info.shapeIcon }), _jsx("span", { children: compact ? info.shortLabel : info.label }), count !== undefined && (_jsx("span", { className: `px-1.5 py-0.5 text-xs rounded-full font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-black/5 text-current dark:bg-white/10'}`, children: count }))] }, lvl));
            })] }));
};
//# sourceMappingURL=DifficultyFilterBar.js.map