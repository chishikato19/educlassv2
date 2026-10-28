import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { renderLatexInText, resolveAssetUrl } from '@educlass/question-kit';
function getQuestionTypeBadge(type) {
    switch (type) {
        case 'mcq4':
            return {
                label: 'Trắc nghiệm 4 lựa chọn',
                badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
            };
        case 'tf':
            return {
                label: 'Đúng / Sai',
                badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            };
        case 'tf_group':
            return {
                label: 'Đúng / Sai 4 ý (BGD)',
                badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
            };
        case 'short':
            return {
                label: 'Trả lời ngắn',
                badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
            };
        case 'matching':
            return {
                label: 'Nối cặp',
                badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
            };
        case 'cloze_drag':
            return {
                label: 'Kéo thả khuyết',
                badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
            };
        default:
            return {
                label: type,
                badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
            };
    }
}
function getRichTextString(val) {
    if (typeof val === 'string')
        return val;
    if (typeof val === 'object' && val !== null && 'text' in val) {
        return String(val.text || '');
    }
    return '';
}
function getRichTextImages(val) {
    if (typeof val === 'object' && val !== null && 'images' in val) {
        const imgs = val.images;
        if (Array.isArray(imgs)) {
            return imgs.filter((item) => typeof item === 'string');
        }
    }
    return [];
}
export const QuestionCardPreview = ({ question, index, showAnswers = true, onEdit, onDelete, }) => {
    const typeInfo = getQuestionTypeBadge(question.type);
    const stemText = getRichTextString(question.stem);
    const stemImages = getRichTextImages(question.stem);
    const explanationText = getRichTextString(question.explanation);
    return (_jsxs("div", { "data-testid": `question-preview-card-${index}`, className: "bg-white border border-slate-200 rounded-xl p-4 shadow-xs transition hover:border-slate-300 space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5 flex-wrap", children: [_jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsxs("span", { className: "font-extrabold text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg", children: ["C\u00E2u ", index + 1] }), _jsx("span", { className: `text-[11px] font-semibold px-2 py-0.5 rounded-md border ${typeInfo.badgeClass}`, children: typeInfo.label }), _jsxs("span", { className: "text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md", children: [question.points ?? 10, " \u0111i\u1EC3m"] })] }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsxs("button", { type: "button", onClick: onEdit, className: "px-2.5 py-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1 min-h-[32px]", title: "Ch\u1EC9nh s\u1EEDa chi ti\u1EBFt c\u00E2u h\u1ECFi n\u00E0y", children: [_jsx("span", { children: "\u270F\uFE0F" }), _jsx("span", { children: "S\u1EEDa c\u00E2u" })] }), _jsxs("button", { type: "button", onClick: () => {
                                    if (window.confirm(`Bạn có chắc chắn muốn xóa Câu ${index + 1} này không?`)) {
                                        onDelete();
                                    }
                                }, className: "px-2.5 py-1 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1 min-h-[32px]", title: "X\u00F3a c\u00E2u h\u1ECFi kh\u1ECFi b\u1ED9 \u0111\u1EC1", children: [_jsx("span", { children: "\uD83D\uDDD1\uFE0F" }), _jsx("span", { children: "X\u00F3a" })] })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "text-sm font-semibold text-slate-800 leading-relaxed", dangerouslySetInnerHTML: {
                            __html: renderLatexInText(stemText || '(Chưa có nội dung câu hỏi)'),
                        } }), stemImages.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-2 pt-1", children: stemImages.map((img, i) => (_jsx("img", { src: resolveAssetUrl(img), alt: `Ảnh minh họa câu ${index + 1}`, className: "max-h-48 rounded-lg border border-slate-200 object-contain bg-white shadow-xs" }, i))) }))] }), showAnswers && (_jsxs("div", { className: "pt-1 border-t border-slate-50", children: [question.type === 'mcq4' && Array.isArray(question.options) && (_jsxs("div", { className: "space-y-1.5", children: [_jsxs("div", { className: "text-xs font-bold text-slate-600 mb-1 flex items-center gap-1", children: [_jsx("span", { children: "\uD83C\uDFAF C\u00E1c ph\u01B0\u01A1ng \u00E1n l\u1EF1a ch\u1ECDn:" }), _jsx("span", { className: "text-[11px] font-normal text-slate-400", children: "(Ph\u01B0\u01A1ng \u00E1n vi\u1EC1n xanh k\u00E8m nh\u00E3n \"\u0110\u00E1p \u00E1n \u0111\u00FAng\")" })] }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2", children: question.options.map((opt, optIdx) => {
                                    const optText = getRichTextString(opt);
                                    const optImages = getRichTextImages(opt);
                                    const isCorrect = question.correct === optIdx;
                                    const optLetter = String.fromCharCode(65 + optIdx); // A, B, C, D
                                    return (_jsxs("div", { className: `flex items-start gap-2.5 p-2.5 rounded-xl border text-xs leading-relaxed transition-all ${isCorrect
                                            ? 'bg-emerald-50/90 border-emerald-400 text-emerald-950 font-medium shadow-xs ring-1 ring-emerald-300'
                                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'}`, children: [_jsx("span", { className: `w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${isCorrect
                                                    ? 'bg-emerald-600 text-white shadow-xs'
                                                    : 'bg-slate-100 text-slate-600 border border-slate-200'}`, children: isCorrect ? '✓' : optLetter }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-1.5 flex-wrap", children: [_jsxs("span", { className: "font-bold text-slate-900", children: [optLetter, "."] }), _jsx("span", { className: "overflow-x-auto", dangerouslySetInnerHTML: {
                                                                    __html: renderLatexInText(optText || '(Trống)'),
                                                                } }), isCorrect && (_jsx("span", { className: "ml-auto px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300", children: "\u2713 \u0110\u00E1p \u00E1n \u0111\u00FAng" }))] }), optImages.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-2 mt-2", children: optImages.map((img, i) => (_jsx("img", { src: resolveAssetUrl(img), alt: `Ảnh lựa chọn ${optLetter}`, className: "max-h-24 rounded-md border border-slate-200 object-contain bg-white" }, i))) }))] })] }, optIdx));
                                }) })] })), question.type === 'tf' && (_jsxs("div", { className: "p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center gap-2 text-xs", children: [_jsx("span", { className: "font-bold text-slate-600", children: "\u0110\u00E1p \u00E1n chu\u1EA9n:" }), question.correct === true ? (_jsxs("span", { className: "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold", children: [_jsx("span", { children: "\u2713" }), _jsx("span", { children: "\u0110\u00DANG (True)" })] })) : (_jsxs("span", { className: "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-300 font-bold", children: [_jsx("span", { children: "\u2717" }), _jsx("span", { children: "SAI (False)" })] }))] })), question.type === 'tf_group' && Array.isArray(question.items) && (_jsxs("div", { className: "space-y-1.5", children: [_jsx("div", { className: "text-xs font-bold text-slate-600 mb-1", children: "X\u00E9t t\u00EDnh \u0110\u00FAng/Sai c\u1EE7a t\u1EEBng \u00FD:" }), _jsx("div", { className: "space-y-1.5", children: question.items.map((item, itemIdx) => {
                                    const itemText = getRichTextString(item.text);
                                    const itemImages = getRichTextImages(item.text);
                                    const isCorrect = item.correct === true;
                                    const itemLetter = String.fromCharCode(97 + itemIdx) + ')'; // a), b), c), d)
                                    return (_jsxs("div", { className: `flex items-start justify-between gap-3 p-2 rounded-lg border text-xs ${isCorrect
                                            ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                                            : 'bg-rose-50/50 border-rose-200 text-rose-950'}`, children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("span", { className: "font-bold mr-1.5 text-slate-800", children: itemLetter }), _jsx("span", { dangerouslySetInnerHTML: {
                                                            __html: renderLatexInText(itemText),
                                                        } }), itemImages.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-2 mt-1.5 ml-4", children: itemImages.map((img, i) => (_jsx("img", { src: resolveAssetUrl(img), alt: `Ảnh ý ${itemLetter}`, className: "max-h-24 rounded border border-slate-200 object-contain bg-white" }, i))) }))] }), _jsx("span", { className: `shrink-0 px-2 py-0.5 rounded text-[11px] font-bold border ${isCorrect
                                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                                    : 'bg-rose-100 text-rose-800 border-rose-300'}`, children: isCorrect ? '✓ ĐÚNG' : '✗ SAI' })] }, itemIdx));
                                }) })] })), question.type === 'short' && (_jsxs("div", { className: "p-2.5 rounded-xl bg-blue-50/60 border border-blue-200 text-xs flex items-center gap-2 flex-wrap", children: [_jsx("span", { className: "font-bold text-blue-900 shrink-0", children: "\uD83D\uDD11 \u0110\u00E1p \u00E1n \u0111\u01B0\u1EE3c ch\u1EA5p nh\u1EADn:" }), _jsx("div", { className: "flex items-center gap-1.5 flex-wrap", children: (question.accepted || []).map((ans, aIdx) => (_jsx("span", { className: "px-2 py-0.5 rounded bg-white text-blue-800 border border-blue-300 font-mono font-bold text-xs shadow-2xs", children: ans }, aIdx))) }), question.caseSensitive && (_jsx("span", { className: "text-[11px] text-slate-500 italic", children: "(Ph\u00E2n bi\u1EC7t ch\u1EEF hoa / th\u01B0\u1EDDng)" }))] })), question.type === 'matching' &&
                        Array.isArray(question.pairs) && (_jsxs("div", { className: "p-2.5 rounded-xl bg-cyan-50/60 border border-cyan-200 text-xs space-y-1.5", children: [_jsx("span", { className: "font-bold text-cyan-900", children: "\uD83D\uDD17 C\u00E1c c\u1EB7p n\u1ED1i \u0111\u00FAng:" }), _jsx("div", { className: "space-y-1", children: question.pairs.map((pair, pIdx) => (_jsxs("div", { className: "flex items-center gap-2 bg-white px-2 py-1 rounded border border-cyan-100", children: [_jsx("span", { className: "font-medium text-slate-800", children: getRichTextString(pair.left) }), _jsx("span", { className: "text-cyan-600 font-bold", children: "\u27F7" }), _jsx("span", { className: "font-medium text-slate-800", children: getRichTextString(pair.right) })] }, pIdx))) })] })), explanationText && (_jsxs("div", { className: "mt-2.5 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start gap-2", children: [_jsx("span", { className: "font-bold shrink-0", children: "\uD83D\uDCA1 L\u1EDDi gi\u1EA3i:" }), _jsx("div", { className: "flex-1 leading-relaxed", dangerouslySetInnerHTML: {
                                    __html: renderLatexInText(explanationText),
                                } })] }))] }))] }));
};
//# sourceMappingURL=QuestionCardPreview.js.map