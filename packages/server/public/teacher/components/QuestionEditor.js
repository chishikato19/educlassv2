import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Mcq4QuestionSchema, TfQuestionSchema, TfGroupQuestionSchema, ShortQuestionSchema, } from '@educlass/question-kit';
import { RichTextEditor } from './RichTextEditor.js';
function generateQuestionId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `q_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
const emptyRichText = () => ({ text: '', images: [] });
export const QuestionEditor = ({ initialQuestion, onSave, onCancel, }) => {
    // State loại câu hỏi
    const [type, setType] = useState(initialQuestion?.type ?? 'mcq4');
    // Điểm số & lời giải thích
    const [points, setPoints] = useState(initialQuestion?.points ?? 10);
    const [explanation, setExplanation] = useState(initialQuestion?.explanation ?? emptyRichText());
    // Nội dung câu hỏi dẫn (stem)
    const [stem, setStem] = useState(initialQuestion?.stem ?? emptyRichText());
    // State MCQ4: options là mảng tuple 4 phần tử tương ứng A, B, C, D
    const [mcqOptions, setMcqOptions] = useState(() => {
        if (initialQuestion?.type === 'mcq4') {
            return initialQuestion.options;
        }
        return [emptyRichText(), emptyRichText(), emptyRichText(), emptyRichText()];
    });
    const [mcqCorrect, setMcqCorrect] = useState(() => {
        if (initialQuestion?.type === 'mcq4') {
            return initialQuestion.correct;
        }
        return null;
    });
    // State TF
    const [tfCorrect, setTfCorrect] = useState(() => {
        if (initialQuestion?.type === 'tf') {
            return initialQuestion.correct;
        }
        return null;
    });
    // State TF Group (4 items tương ứng a, b, c, d)
    const [tfGroupItems, setTfGroupItems] = useState(() => {
        if (initialQuestion?.type === 'tf_group') {
            return [
                initialQuestion.items[0].text,
                initialQuestion.items[1].text,
                initialQuestion.items[2].text,
                initialQuestion.items[3].text,
            ];
        }
        return [emptyRichText(), emptyRichText(), emptyRichText(), emptyRichText()];
    });
    const [tfGroupAnswers, setTfGroupAnswers] = useState(() => {
        if (initialQuestion?.type === 'tf_group') {
            return [
                initialQuestion.items[0].correct,
                initialQuestion.items[1].correct,
                initialQuestion.items[2].correct,
                initialQuestion.items[3].correct,
            ];
        }
        return [true, false, true, false];
    });
    // State Short Answer
    const [shortAccepted, setShortAccepted] = useState(() => {
        if (initialQuestion?.type === 'short') {
            return initialQuestion.accepted;
        }
        return [''];
    });
    const [shortCaseSensitive, setShortCaseSensitive] = useState(() => {
        if (initialQuestion?.type === 'short') {
            return initialQuestion.caseSensitive ?? false;
        }
        return false;
    });
    // Validation Error State
    const [errorMessage, setErrorMessage] = useState(null);
    // Xử lý lưu câu hỏi
    const handleSave = () => {
        setErrorMessage(null);
        if (!stem.text.trim()) {
            setErrorMessage('Vui lòng nhập nội dung câu hỏi.');
            return;
        }
        const qId = initialQuestion?.id ?? generateQuestionId();
        try {
            if (type === 'mcq4') {
                if (mcqCorrect === null) {
                    setErrorMessage('Vui lòng chọn đáp án đúng cho câu trắc nghiệm (A, B, C hoặc D).');
                    return;
                }
                const questionPayload = {
                    id: qId,
                    type: 'mcq4',
                    points,
                    stem,
                    options: mcqOptions,
                    correct: mcqCorrect,
                    ...(explanation.text.trim() ? { explanation } : {}),
                };
                const parsed = Mcq4QuestionSchema.safeParse(questionPayload);
                if (!parsed.success) {
                    setErrorMessage(parsed.error.errors[0]?.message ?? 'Dữ liệu câu hỏi trắc nghiệm không hợp lệ.');
                    return;
                }
                onSave(parsed.data);
            }
            else if (type === 'tf') {
                if (tfCorrect === null) {
                    setErrorMessage('Vui lòng chọn đáp án đúng cho câu hỏi Đúng / Sai.');
                    return;
                }
                const questionPayload = {
                    id: qId,
                    type: 'tf',
                    points,
                    stem,
                    correct: tfCorrect,
                    ...(explanation.text.trim() ? { explanation } : {}),
                };
                const parsed = TfQuestionSchema.safeParse(questionPayload);
                if (!parsed.success) {
                    setErrorMessage(parsed.error.errors[0]?.message ?? 'Dữ liệu câu hỏi Đúng / Sai không hợp lệ.');
                    return;
                }
                onSave(parsed.data);
            }
            else if (type === 'tf_group') {
                const questionPayload = {
                    id: qId,
                    type: 'tf_group',
                    points,
                    stem,
                    items: [
                        { text: tfGroupItems[0], correct: tfGroupAnswers[0] },
                        { text: tfGroupItems[1], correct: tfGroupAnswers[1] },
                        { text: tfGroupItems[2], correct: tfGroupAnswers[2] },
                        { text: tfGroupItems[3], correct: tfGroupAnswers[3] },
                    ],
                    ...(explanation.text.trim() ? { explanation } : {}),
                };
                const parsed = TfGroupQuestionSchema.safeParse(questionPayload);
                if (!parsed.success) {
                    setErrorMessage(parsed.error.errors[0]?.message ?? 'Dữ liệu câu hỏi Đúng / Sai nhóm không hợp lệ.');
                    return;
                }
                onSave(parsed.data);
            }
            else if (type === 'short') {
                const filteredAccepted = shortAccepted.map(s => s.trim()).filter(s => s.length > 0);
                if (filteredAccepted.length === 0) {
                    setErrorMessage('Vui lòng nhập ít nhất một đáp án được chấp nhận.');
                    return;
                }
                const questionPayload = {
                    id: qId,
                    type: 'short',
                    points,
                    stem,
                    accepted: filteredAccepted,
                    caseSensitive: shortCaseSensitive,
                    ...(explanation.text.trim() ? { explanation } : {}),
                };
                const parsed = ShortQuestionSchema.safeParse(questionPayload);
                if (!parsed.success) {
                    setErrorMessage(parsed.error.errors[0]?.message ?? 'Dữ liệu câu hỏi trả lời ngắn không hợp lệ.');
                    return;
                }
                onSave(parsed.data);
            }
        }
        catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Lỗi không xác định khi lưu câu hỏi.');
        }
    };
    const optionLabels = ['A', 'B', 'C', 'D'];
    const itemLabels = ['a', 'b', 'c', 'd'];
    return (_jsxs("div", { className: "bg-white border border-gray-200 rounded-xl p-6 shadow-sm max-w-4xl mx-auto space-y-6", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-bold text-gray-900 mb-3", children: "So\u1EA1n c\u00E2u h\u1ECFi m\u1EDBi" }), _jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-2", children: [_jsx("button", { type: "button", "data-testid": "tab-type-mcq4", onClick: () => setType('mcq4'), className: `px-3 py-2.5 text-sm font-semibold rounded-lg border min-h-[48px] flex items-center justify-center transition-colors ${type === 'mcq4'
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`, children: "Tr\u1EAFc nghi\u1EC7m 4 l\u1EF1a ch\u1ECDn" }), _jsx("button", { type: "button", "data-testid": "tab-type-tf", onClick: () => setType('tf'), className: `px-3 py-2.5 text-sm font-semibold rounded-lg border min-h-[48px] flex items-center justify-center transition-colors ${type === 'tf'
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`, children: "\u0110\u00FAng / Sai" }), _jsx("button", { type: "button", "data-testid": "tab-type-tf_group", onClick: () => setType('tf_group'), className: `px-3 py-2.5 text-sm font-semibold rounded-lg border min-h-[48px] flex items-center justify-center transition-colors ${type === 'tf_group'
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`, children: "\u0110\u00FAng / Sai nh\u00F3m (BGD)" }), _jsx("button", { type: "button", "data-testid": "tab-type-short", onClick: () => setType('short'), className: `px-3 py-2.5 text-sm font-semibold rounded-lg border min-h-[48px] flex items-center justify-center transition-colors ${type === 'short'
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`, children: "Tr\u1EA3 l\u1EDDi ng\u1EAFn" })] })] }), errorMessage && (_jsxs("div", { "data-testid": "editor-error-message", className: "bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2", children: [_jsx("span", { className: "font-bold", children: "\u26A0\uFE0F" }), _jsx("span", { children: errorMessage })] })), _jsx(RichTextEditor, { label: "N\u1ED9i dung c\u00E2u h\u1ECFi", value: stem, onChange: setStem, placeholder: "Nh\u1EADp n\u1ED9i dung c\u00E2u h\u1ECFi, g\u00F5 $x^2$ ho\u1EB7c $$\\frac{a}{b}$$ \u0111\u1EC3 vi\u1EBFt c\u00F4ng th\u1EE9c to\u00E1n KaTeX...", testIdPrefix: "stem", minRows: 4, required: true }), type === 'mcq4' && (_jsxs("div", { className: "space-y-4", children: [_jsx("h3", { className: "text-sm font-bold text-gray-800", children: "C\u00E1c l\u1EF1a ch\u1ECDn (ch\u1ECDn 1 ph\u01B0\u01A1ng \u00E1n \u0111\u00FAng):" }), optionLabels.map((optLabel, idx) => (_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "pt-2", children: _jsxs("label", { className: "flex items-center gap-2 cursor-pointer min-h-[48px] px-2 rounded hover:bg-gray-100", children: [_jsx("input", { type: "radio", name: "mcq-correct", "data-testid": `radio-option-correct-${optLabel}`, checked: mcqCorrect === idx, onChange: () => setMcqCorrect(idx), className: "w-5 h-5 text-blue-600 focus:ring-blue-500" }), _jsx("span", { className: "font-bold text-base text-gray-900", children: optLabel })] }) }), _jsx("div", { className: "flex-1", children: _jsx(RichTextEditor, { value: mcqOptions[idx], onChange: val => {
                                        const newOpts = [...mcqOptions];
                                        newOpts[idx] = val;
                                        setMcqOptions(newOpts);
                                    }, placeholder: `Nội dung lựa chọn ${optLabel}...`, testIdPrefix: `option-${optLabel}`, minRows: 2 }) })] }, optLabel)))] })), type === 'tf' && (_jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "block text-sm font-bold text-gray-800", children: "\u0110\u00E1p \u00E1n \u0111\u00FAng:" }), _jsxs("div", { className: "flex gap-4", children: [_jsxs("label", { className: "flex items-center gap-2 cursor-pointer border border-gray-300 rounded-lg px-4 py-3 min-h-[48px] hover:bg-gray-50 transition-colors", children: [_jsx("input", { type: "radio", name: "tf-correct", "data-testid": "radio-tf-true", checked: tfCorrect === true, onChange: () => setTfCorrect(true), className: "w-5 h-5 text-blue-600 focus:ring-blue-500" }), _jsx("span", { className: "font-semibold text-gray-900", children: "\u0110\u00FAng (True)" })] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer border border-gray-300 rounded-lg px-4 py-3 min-h-[48px] hover:bg-gray-50 transition-colors", children: [_jsx("input", { type: "radio", name: "tf-correct", "data-testid": "radio-tf-false", checked: tfCorrect === false, onChange: () => setTfCorrect(false), className: "w-5 h-5 text-blue-600 focus:ring-blue-500" }), _jsx("span", { className: "font-semibold text-gray-900", children: "Sai (False)" })] })] })] })), type === 'tf_group' && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-sm font-bold text-gray-800", children: "4 M\u1EC7nh \u0111\u1EC1 \u0110\u00FAng / Sai (Barem B\u1ED9 Gi\u00E1o d\u1EE5c 0.1 - 0.25 - 0.5 - 1.0):" }), _jsx("span", { className: "text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded", children: "1 \u0111\u00FAng: 0.1\u0111 | 2 \u0111\u00FAng: 0.25\u0111 | 3 \u0111\u00FAng: 0.5\u0111 | 4 \u0111\u00FAng: 1.0\u0111" })] }), itemLabels.map((itemLabel, idx) => (_jsxs("div", { className: "border border-gray-200 rounded-lg p-3 space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("span", { className: "font-bold text-sm text-gray-800", children: ["\u00DD ", itemLabel.toUpperCase(), ")"] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { type: "button", "data-testid": `item-${itemLabel}-true`, onClick: () => {
                                                    const newAns = [...tfGroupAnswers];
                                                    newAns[idx] = true;
                                                    setTfGroupAnswers(newAns);
                                                }, className: `px-3 py-1.5 text-xs font-semibold rounded min-h-[40px] transition-colors ${tfGroupAnswers[idx] === true
                                                    ? 'bg-green-600 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`, children: "\u0110\u00FAng" }), _jsx("button", { type: "button", "data-testid": `item-${itemLabel}-false`, onClick: () => {
                                                    const newAns = [...tfGroupAnswers];
                                                    newAns[idx] = false;
                                                    setTfGroupAnswers(newAns);
                                                }, className: `px-3 py-1.5 text-xs font-semibold rounded min-h-[40px] transition-colors ${tfGroupAnswers[idx] === false
                                                    ? 'bg-red-600 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`, children: "Sai" })] })] }), _jsx(RichTextEditor, { value: tfGroupItems[idx], onChange: val => {
                                    const newItems = [...tfGroupItems];
                                    newItems[idx] = val;
                                    setTfGroupItems(newItems);
                                }, placeholder: `Nội dung mệnh đề ${itemLabel.toUpperCase()}...`, testIdPrefix: `item-${itemLabel}`, minRows: 2 })] }, itemLabel)))] })), type === 'short' && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-sm font-bold text-gray-800", children: "C\u00E1c \u0111\u00E1p \u00E1n \u0111\u01B0\u1EE3c ch\u1EA5p nh\u1EADn:" }), _jsx("button", { type: "button", "data-testid": "btn-add-accepted-answer", onClick: () => setShortAccepted(prev => [...prev, '']), className: "px-3 py-2 text-xs font-medium bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 min-h-[48px] flex items-center gap-1", children: "+ Th\u00EAm \u0111\u00E1p \u00E1n ch\u1EA5p nh\u1EADn" })] }), _jsx("div", { className: "space-y-2", children: shortAccepted.map((ans, idx) => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "text", "data-testid": `input-accepted-answer-${idx}`, value: ans, onChange: e => {
                                        const newArr = [...shortAccepted];
                                        newArr[idx] = e.target.value;
                                        setShortAccepted(newArr);
                                    }, placeholder: `Đáp án hợp lệ ${idx + 1} (vd: 3.14, ba phẩy mười bốn...)`, className: "flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px]" }), shortAccepted.length > 1 && (_jsx("button", { type: "button", onClick: () => setShortAccepted(prev => prev.filter((_, i) => i !== idx)), className: "px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-md min-h-[48px]", title: "X\u00F3a \u0111\u00E1p \u00E1n n\u00E0y", children: "\u2715" }))] }, idx))) }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer pt-2", children: [_jsx("input", { type: "checkbox", checked: shortCaseSensitive, onChange: e => setShortCaseSensitive(e.target.checked), className: "w-4 h-4 text-blue-600 rounded focus:ring-blue-500" }), _jsx("span", { className: "text-sm text-gray-700", children: "Ph\u00E2n bi\u1EC7t ch\u1EEF hoa / ch\u1EEF th\u01B0\u1EDDng" })] })] })), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100", children: _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold text-gray-700 mb-1", children: "\u0110i\u1EC3m s\u1ED1 c\u00E2u h\u1ECFi:" }), _jsx("input", { type: "number", step: "0.1", min: "0", value: points, onChange: e => setPoints(parseFloat(e.target.value) || 0), className: "w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px]" })] }) }), _jsx(RichTextEditor, { label: "L\u1EDDi gi\u1EA3i th\u00EDch / H\u01B0\u1EDBng d\u1EABn gi\u1EA3i (t\u00F9y ch\u1ECDn)", value: explanation, onChange: setExplanation, placeholder: "Nh\u1EADp l\u1EDDi gi\u1EA3i chi ti\u1EBFt gi\u00FAp h\u1ECDc sinh hi\u1EC3u b\u00E0i...", testIdPrefix: "explanation", minRows: 2 }), _jsxs("div", { className: "flex items-center justify-end gap-3 pt-4 border-t border-gray-100", children: [onCancel && (_jsx("button", { type: "button", onClick: onCancel, className: "px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg min-h-[48px] transition-colors", children: "H\u1EE7y b\u1ECF" })), _jsx("button", { type: "button", "data-testid": "btn-save-question", onClick: handleSave, className: "px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm min-h-[48px] transition-colors", children: "L\u01B0u c\u00E2u h\u1ECFi" })] })] }));
};
//# sourceMappingURL=QuestionEditor.js.map