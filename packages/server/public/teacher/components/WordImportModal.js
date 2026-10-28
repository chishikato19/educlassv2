import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId, useState } from 'react';
import { renderLatexInText, resolveAssetUrl } from '@educlass/question-kit';
import { api } from '../api/client.js';
export const WordImportModal = ({ isOpen, onClose, onDownloadTemplate, onParseDocx, initialParsedResult, onSaveQuestions, }) => {
    const [parsedData, setParsedData] = useState(initialParsedResult ?? null);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);
    // Form thông tin bộ đề khi lưu
    const [setTitle, setSetTitle] = useState('Đề thi nhập từ Word');
    const [setSubject, setSetSubject] = useState('Toán');
    const [setGrade, setSetGrade] = useState(12);
    const [setTags, setSetTags] = useState('Nhập từ Word');
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
                // Fallback môi trường Node / Vitest
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
        const rawName = file.name.replace(/\.[^/.]+$/, '');
        setSetTitle(rawName);
        setIsLoading(true);
        setErrorMessage(null);
        try {
            if (onParseDocx) {
                const result = await onParseDocx(file);
                setParsedData(result);
            }
            else {
                await api.ensureAuthenticated?.();
                const base64 = await readFileAsBase64(file);
                const data = await api.importWord(base64);
                setParsedData(data);
            }
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
    const handleFileChange = async (e) => {
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
        const file = e.dataTransfer.files?.[0];
        if (file) {
            void processFile(file);
        }
    };
    const handleUpdateMcqCorrect = (qIndex, correctOptionIndex) => {
        if (!parsedData)
            return;
        const updated = [...parsedData.questions];
        const targetQ = updated[qIndex];
        if (targetQ && targetQ.type === 'mcq4') {
            updated[qIndex] = {
                ...targetQ,
                correct: correctOptionIndex,
            };
            setParsedData({ ...parsedData, questions: updated });
        }
    };
    const handleUpdateTfGroupItemCorrect = (qIndex, itemIndex, newCorrect) => {
        if (!parsedData)
            return;
        const updated = [...parsedData.questions];
        const targetQ = updated[qIndex];
        if (targetQ && targetQ.type === 'tf_group') {
            const itemsCopy = [...targetQ.items];
            const curItem = itemsCopy[itemIndex];
            if (curItem) {
                itemsCopy[itemIndex] = {
                    ...curItem,
                    correct: newCorrect,
                };
                updated[qIndex] = {
                    ...targetQ,
                    items: itemsCopy,
                };
                setParsedData({ ...parsedData, questions: updated });
            }
        }
    };
    const handleDeleteQuestion = (qIndex) => {
        if (!parsedData)
            return;
        const updated = parsedData.questions.filter((_, idx) => idx !== qIndex);
        setParsedData({
            ...parsedData,
            questions: updated,
            successCount: updated.length,
        });
    };
    const handleSave = async () => {
        if (!parsedData || parsedData.questions.length === 0) {
            setErrorMessage('Không có câu hỏi nào để lưu.');
            return;
        }
        const tagsArray = setTags
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0);
        try {
            await onSaveQuestions({
                setInfo: {
                    title: setTitle.trim() || 'Đề thi nhập từ Word',
                    subject: setSubject.trim() || 'Toán',
                    grade: setGrade,
                    tags: tagsArray,
                },
                questions: parsedData.questions,
            });
            onClose();
        }
        catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Có lỗi khi lưu câu hỏi');
        }
    };
    const handleDownloadTemplate = () => {
        if (onDownloadTemplate) {
            onDownloadTemplate();
            return;
        }
        fetch('/api/question-sets/templates/word')
            .then(res => {
            if (!res.ok)
                throw new Error('Không thể tải file mẫu');
            return res.blob();
        })
            .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'de-thi-mau-educlass.docx';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        })
            .catch(() => {
            window.open('/api/question-sets/templates/word', '_blank');
        });
    };
    return (_jsx("div", { style: {
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
            overflowY: 'auto',
        }, onClick: e => {
            if (e.target === e.currentTarget)
                onClose();
        }, children: _jsxs("div", { style: {
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                maxWidth: '960px',
                width: '100%',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                margin: 'auto',
                overflow: 'hidden',
                boxSizing: 'border-box',
            }, children: [_jsxs("div", { style: {
                        padding: '16px 24px',
                        borderBottom: '1px solid #E2E8F0',
                        backgroundColor: '#F8FAFC',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }, children: [_jsxs("div", { children: [_jsx("h2", { style: { margin: 0, fontSize: '18px', fontWeight: 700, color: '#1E293B' }, children: "Nh\u1EADp \u0111\u1EC1 thi t\u1EEB file Word (.docx)" }), _jsx("p", { style: { margin: '4px 0 0', fontSize: '12px', color: '#64748B' }, children: "H\u1ED7 tr\u1EE3 t\u1EF1 \u0111\u1ED9ng chuy\u1EC3n c\u00F4ng th\u1EE9c to\u00E1n OMML sang LaTeX, tr\u00EDch xu\u1EA5t h\u00ECnh \u1EA3nh CAS" })] }), _jsx("button", { type: "button", onClick: onClose, style: {
                                background: 'transparent',
                                border: 'none',
                                fontSize: '24px',
                                fontWeight: 700,
                                color: '#94A3B8',
                                cursor: 'pointer',
                                padding: '4px 8px',
                                borderRadius: '8px',
                                lineHeight: 1,
                            }, children: "\u00D7" })] }), _jsxs("div", { style: {
                        padding: '24px',
                        overflowY: 'auto',
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px',
                    }, children: [errorMessage && (_jsxs("div", { style: {
                                padding: '12px 16px',
                                backgroundColor: '#FEF2F2',
                                border: '1px solid #FCA5A5',
                                borderRadius: '10px',
                                color: '#B91C1C',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }, children: [_jsx("span", { children: "\u26A0\uFE0F" }), _jsx("span", { children: errorMessage })] })), !parsedData && !isLoading && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '20px' }, children: [_jsxs("div", { style: {
                                        backgroundColor: '#EFF6FF',
                                        border: '1px solid #BFDBFE',
                                        borderRadius: '12px',
                                        padding: '16px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        gap: '16px',
                                        flexWrap: 'wrap',
                                    }, children: [_jsxs("div", { style: { fontSize: '13px', color: '#1E293B' }, children: [_jsx("p", { style: { fontWeight: 700, color: '#1E40AF', margin: '0 0 8px 0' }, children: "Quy \u01B0\u1EDBc \u0111\u1ECBnh d\u1EA1ng Word chu\u1EA9n:" }), _jsxs("ul", { style: {
                                                        margin: 0,
                                                        paddingLeft: '18px',
                                                        color: '#475569',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '4px',
                                                    }, children: [_jsxs("li", { children: ["C\u00E2u h\u1ECFi b\u1EAFt \u0111\u1EA7u b\u1EB1ng: ", _jsx("code", { children: "C\u00E2u 1:" }), ", ", _jsx("code", { children: "C\u00E2u 2." }), ",", ' ', _jsx("code", { children: "Question 1:" }), "..."] }), _jsxs("li", { children: [_jsx("strong", { children: "Tr\u1EAFc nghi\u1EC7m 4 l\u1EF1a ch\u1ECDn (A, B, C, D):" }), " \u0110\u00E1nh d\u1EA5u \u0111\u00E1p \u00E1n \u0111\u00FAng b\u1EB1ng m\u1ED9t trong c\u00E1c c\u00E1ch:", _jsxs("ul", { style: { paddingLeft: '16px', margin: '2px 0', listStyleType: 'circle' }, children: [_jsxs("li", { children: ["G\u1EA1ch ch\u00E2n \u0111\u00E1p \u00E1n \u0111\u00FAng:", ' ', _jsx("code", { children: _jsx("u", { children: "A." }) }), ' ', "ho\u1EB7c", ' ', _jsx("code", { children: _jsx("u", { children: "N\u1ED9i dung" }) })] }), _jsxs("li", { children: ["\u0110\u00E1nh d\u1EA5u sao \u0111\u1EB1ng tr\u01B0\u1EDBc: ", _jsx("code", { children: "*B." }), " ho\u1EB7c ", _jsx("code", { children: "* B." })] }), _jsxs("li", { children: ["B\u00F4i \u0111\u1EADm ph\u01B0\u01A1ng \u00E1n \u0111\u00FAng:", ' ', _jsx("code", { children: _jsx("b", { children: "C." }) })] }), _jsx("li", { children: "B\u00F4i m\u00E0u / Highlight ph\u01B0\u01A1ng \u00E1n \u0111\u00FAng b\u1EB1ng c\u00F4ng c\u1EE5 b\u00FAt nh\u1EDB d\u00F2ng trong Word" }), _jsxs("li", { children: ["K\u00E8m d\u00F2ng ", _jsx("code", { children: "\u0110\u00E1p \u00E1n: D" }), " \u1EDF cu\u1ED1i c\u00E2u h\u1ECFi"] })] })] }), _jsxs("li", { children: [_jsx("strong", { children: "\u0110\u00FAng/Sai theo nh\u00F3m (4 \u00FD a, b, c, d chu\u1EA9n BGD 2025):" }), " c\u00E1c \u00FD", ' ', _jsx("code", { children: "a)" }), ", ", _jsx("code", { children: "b)" }), ", ", _jsx("code", { children: "c)" }), ", ", _jsx("code", { children: "d)" }), " k\u00E8m nh\u00E3n", ' ', _jsx("code", { children: "[\u0110\u00FAng]" }), " ho\u1EB7c ", _jsx("code", { children: "[Sai]" }), " (ho\u1EB7c ", _jsx("code", { children: "(\u0110)" }), ",", ' ', _jsx("code", { children: "(S)" }), ")."] }), _jsxs("li", { children: [_jsx("strong", { children: "\u0110\u00FAng/Sai \u0111\u01A1n l\u1EBB:" }), " c\u00E2u ph\u00E1t bi\u1EC3u k\u00E8m d\u00F2ng", ' ', _jsx("code", { children: "\u0110\u00E1p \u00E1n: \u0110\u00FAng" }), " ho\u1EB7c ", _jsx("code", { children: "\u0110\u00E1p \u00E1n: Sai" }), "."] }), _jsxs("li", { children: [_jsx("strong", { children: "Tr\u1EA3 l\u1EDDi ng\u1EAFn:" }), " c\u00E2u h\u1ECFi k\u00E8m d\u00F2ng", ' ', _jsx("code", { children: "\u0110\u00E1p \u00E1n: [k\u1EBFt qu\u1EA3 s\u1ED1 ho\u1EB7c ch\u1EEF]" }), "."] }), _jsxs("li", { children: [_jsx("strong", { children: "H\u00ECnh \u1EA3nh & C\u00F4ng th\u1EE9c:" }), " H\u1ED7 tr\u1EE3 ch\u00E8n h\u00ECnh \u1EA3nh minh h\u1ECDa tr\u1EF1c ti\u1EBFp \u1EDF c\u00E2u h\u1ECFi v\u00E0 \u0111\u00E1p \u00E1n; h\u1ED7 tr\u1EE3 c\u00F4ng th\u1EE9c to\u00E1n h\u1ECDc Word (OMML/Equation)."] })] })] }), _jsx("button", { type: "button", "data-testid": "btn-download-word-template", onClick: handleDownloadTemplate, style: {
                                                minHeight: '44px',
                                                padding: '8px 16px',
                                                backgroundColor: '#FFFFFF',
                                                border: '1px solid #2563EB',
                                                borderRadius: '8px',
                                                color: '#2563EB',
                                                fontWeight: 600,
                                                fontSize: '13px',
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                            }, children: "\uD83D\uDCE5 T\u1EA3i file Word m\u1EABu" })] }), _jsxs("div", { onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop, style: {
                                        border: isDragOver ? '2px dashed #3B82F6' : '2px dashed #CBD5E1',
                                        backgroundColor: isDragOver ? '#EFF6FF' : '#F8FAFC',
                                        borderRadius: '16px',
                                        padding: '40px 20px',
                                        textAlign: 'center',
                                        transition: 'all 0.2s ease',
                                        cursor: 'pointer',
                                    }, children: [_jsx("input", { id: fileInputId, type: "file", accept: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document", style: { display: 'none' }, "data-testid": "input-file-word", onChange: handleFileChange }), _jsxs("label", { htmlFor: fileInputId, style: {
                                                cursor: 'pointer',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '12px',
                                            }, children: [_jsx("span", { style: { fontSize: '48px', lineHeight: 1 }, children: "\uD83D\uDCC4" }), _jsx("span", { style: { fontSize: '16px', fontWeight: 600, color: '#2563EB' }, children: "B\u1EA5m \u0111\u1EC3 ch\u1ECDn file .docx ho\u1EB7c k\u00E9o th\u1EA3 file v\u00E0o \u0111\u00E2y" }), _jsx("span", { style: { fontSize: '13px', color: '#64748B' }, children: "Ch\u1EC9 h\u1ED7 tr\u1EE3 file \u0111\u1ECBnh d\u1EA1ng Microsoft Word (.docx)" })] })] })] })), isLoading && (_jsxs("div", { className: "py-16 text-center space-y-3", children: [_jsx("div", { className: "animate-spin inline-block w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" }), _jsx("p", { className: "text-gray-700 font-medium", children: "\u0110ang \u0111\u1ECDc t\u00E0i li\u1EC7u Word, chuy\u1EC3n \u0111\u1ED5i c\u00F4ng th\u1EE9c to\u00E1n OMML sang LaTeX v\u00E0 tr\u00EDch xu\u1EA5t h\u00ECnh \u1EA3nh..." })] })), parsedData && !isLoading && (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200", children: [_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-bold text-gray-800", children: "K\u1EBFt qu\u1EA3 ph\u00E2n t\u00EDch:" }), _jsxs("span", { className: "px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800", children: ["H\u1EE3p l\u1EC7: ", parsedData.successCount, "/", parsedData.totalDetected, " c\u00E2u (", Math.round((parsedData.successCount / (parsedData.totalDetected || 1)) * 100), "%)"] }), parsedData.warnings.length > 0 && (_jsxs("span", { className: "px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800", children: [parsedData.warnings.length, " c\u1EA3nh b\u00E1o"] }))] }), _jsx("p", { className: "text-xs text-gray-500", children: "Th\u1EA7y/c\u00F4 c\u00F3 th\u1EC3 ki\u1EC3m tra v\u00E0 s\u1EEDa nhanh \u0111\u00E1p \u00E1n tr\u1EF1c ti\u1EBFp b\u00EAn d\u01B0\u1EDBi tr\u01B0\u1EDBc khi b\u1EA5m l\u01B0u." })] }), _jsx("button", { type: "button", onClick: () => setParsedData(null), className: "min-h-[44px] px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 border rounded bg-white hover:bg-gray-50", children: "Ch\u1ECDn file kh\u00E1c" })] }), parsedData.warnings.length > 0 && (_jsxs("div", { className: "p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2", children: [_jsx("h4", { className: "text-xs font-bold text-amber-900 uppercase", children: "\u26A0\uFE0F C\u00E1c c\u00E2u h\u1ECFi c\u1EA7n l\u01B0u \u00FD / kh\u00F4ng th\u1EC3 t\u1EF1 \u0111\u1ED9ng nh\u1EADn di\u1EC7n:" }), _jsx("ul", { className: "text-xs text-amber-800 space-y-1", children: parsedData.warnings.map((w, idx) => (_jsxs("li", { children: ["\u2022 ", _jsxs("strong", { children: ["C\u00E2u ", w.questionNumberStr ?? idx + 1, ":"] }), " ", w.reason] }, idx))) })] })), _jsxs("div", { className: "p-4 border rounded-lg bg-white space-y-4 shadow-sm", children: [_jsx("h3", { className: "font-bold text-sm text-gray-800", children: "Th\u00F4ng tin b\u1ED9 \u0111\u1EC1 thi m\u1EDBi:" }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: ["Ti\u00EAu \u0111\u1EC1 b\u1ED9 \u0111\u1EC1 ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { type: "text", required: true, value: setTitle, onChange: e => setSetTitle(e.target.value), "data-testid": "input-word-set-title", className: "w-full min-h-[44px] px-3 py-2 border rounded-md text-sm" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "M\u00F4n h\u1ECDc" }), _jsx("input", { type: "text", value: setSubject, onChange: e => setSetSubject(e.target.value), className: "w-full min-h-[44px] px-3 py-2 border rounded-md text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Kh\u1ED1i l\u1EDBp" }), _jsx("select", { value: setGrade, onChange: e => setSetGrade(Number(e.target.value)), className: "w-full min-h-[44px] px-3 py-2 border rounded-md text-sm bg-white", children: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(g => (_jsxs("option", { value: g, children: ["L\u1EDBp ", g] }, g))) })] })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Th\u1EBB ph\u00E2n lo\u1EA1i" }), _jsx("input", { type: "text", value: setTags, onChange: e => setSetTags(e.target.value), className: "w-full min-h-[44px] px-3 py-2 border rounded-md text-sm" })] })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("h3", { className: "font-bold text-sm text-gray-800", children: ["Danh s\u00E1ch c\u00E2u h\u1ECFi h\u1EE3p l\u1EC7 (", parsedData.questions.length, " c\u00E2u):"] }), parsedData.questions.map((q, qIndex) => (_jsxs("div", { className: "p-4 border rounded-lg bg-white shadow-sm space-y-3", children: [_jsxs("div", { className: "flex items-start justify-between gap-2 border-b pb-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "font-bold text-sm text-blue-800", children: ["C\u00E2u ", qIndex + 1] }), _jsx("span", { className: "px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700", children: q.type === 'mcq4'
                                                                        ? 'Trắc nghiệm 4 lựa chọn'
                                                                        : q.type === 'tf_group'
                                                                            ? 'Đúng/Sai 4 ý (BGD)'
                                                                            : q.type === 'short'
                                                                                ? 'Trả lời ngắn'
                                                                                : 'Đúng/Sai đơn' }), _jsxs("span", { className: "text-xs text-gray-500", children: [q.points, " \u0111i\u1EC3m"] })] }), _jsx("button", { type: "button", onClick: () => handleDeleteQuestion(qIndex), className: "text-xs text-red-600 hover:text-red-800 p-1", title: "X\u00F3a c\u00E2u n\u00E0y", children: "X\u00F3a c\u00E2u" })] }), _jsx("div", { className: "text-sm text-gray-800 leading-relaxed font-medium overflow-x-auto", dangerouslySetInnerHTML: {
                                                        __html: renderLatexInText(q.stem.text),
                                                    } }), q.stem.images && q.stem.images.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-2 my-2", children: q.stem.images.map((img, i) => (_jsx("img", { src: resolveAssetUrl(img), alt: `Ảnh minh họa câu ${qIndex + 1}`, className: "max-h-52 rounded-lg border border-gray-200 object-contain bg-white shadow-xs" }, i))) })), q.type === 'mcq4' && (_jsxs("div", { className: "space-y-2 pt-2", children: [_jsx("p", { className: "text-xs font-semibold text-gray-500", children: "Ch\u1ECDn \u0111\u00E1p \u00E1n \u0111\u00FAng:" }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2", children: q.options.map((opt, optIndex) => (_jsxs("label", { className: `flex items-start gap-2 p-2 rounded border cursor-pointer text-sm ${q.correct === optIndex
                                                                    ? 'border-green-500 bg-green-50/50'
                                                                    : 'border-gray-200 hover:bg-gray-50'}`, children: [_jsx("input", { type: "radio", name: `correct-${qIndex}`, checked: q.correct === optIndex, onChange: () => handleUpdateMcqCorrect(qIndex, optIndex), "data-testid": `radio-correct-${qIndex}-${optIndex}`, className: "mt-1" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-start gap-1", children: [_jsxs("span", { className: "font-bold", children: [String.fromCharCode(65 + optIndex), "."] }), opt.text && (_jsx("span", { className: "overflow-x-auto", dangerouslySetInnerHTML: {
                                                                                            __html: renderLatexInText(opt.text),
                                                                                        } }))] }), opt.images && opt.images.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-2 mt-1.5 ml-4", children: opt.images.map((img, imgIdx) => (_jsx("img", { src: resolveAssetUrl(img), alt: `Ảnh phương án ${String.fromCharCode(65 + optIndex)}`, className: "max-h-36 rounded border border-gray-200 object-contain bg-white shadow-xs" }, imgIdx))) }))] })] }, optIndex))) })] })), q.type === 'tf_group' && (_jsxs("div", { className: "space-y-2 pt-2", children: [_jsx("p", { className: "text-xs font-semibold text-gray-500", children: "X\u00E9t t\u00EDnh \u0110\u00FAng/Sai c\u1EE7a t\u1EEBng \u00FD:" }), _jsx("div", { className: "space-y-2", children: q.items.map((item, itemIndex) => (_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded border border-gray-100 bg-gray-50/50 text-sm", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("span", { className: "font-bold mr-1", children: [String.fromCharCode(97 + itemIndex), ")"] }), _jsx("span", { className: "overflow-x-auto", dangerouslySetInnerHTML: {
                                                                                    __html: renderLatexInText(item.text.text),
                                                                                } }), item.text.images && item.text.images.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-2 mt-1.5 ml-4", children: item.text.images.map((img, imgIdx) => (_jsx("img", { src: resolveAssetUrl(img), alt: `Ảnh ý ${String.fromCharCode(97 + itemIndex)}`, className: "max-h-32 rounded border border-gray-200 object-contain bg-white shadow-xs" }, imgIdx))) }))] }), _jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [_jsx("button", { type: "button", onClick: () => handleUpdateTfGroupItemCorrect(qIndex, itemIndex, true), className: `px-3 py-1 rounded text-xs font-bold min-h-[36px] ${item.correct
                                                                                    ? 'bg-green-600 text-white'
                                                                                    : 'bg-gray-200 text-gray-700'}`, children: "\u0110\u00FAng" }), _jsx("button", { type: "button", onClick: () => handleUpdateTfGroupItemCorrect(qIndex, itemIndex, false), className: `px-3 py-1 rounded text-xs font-bold min-h-[36px] ${!item.correct
                                                                                    ? 'bg-red-600 text-white'
                                                                                    : 'bg-gray-200 text-gray-700'}`, children: "Sai" })] })] }, itemIndex))) })] })), q.type === 'short' && (_jsxs("div", { className: "pt-2 text-sm", children: [_jsx("span", { className: "text-xs font-semibold text-gray-500 mr-2", children: "\u0110\u00E1p \u00E1n ch\u1EA5p nh\u1EADn:" }), _jsx("span", { className: "px-2 py-1 rounded bg-blue-50 text-blue-900 font-mono font-bold", children: q.accepted.join(', ') })] }))] }, q.id ?? qIndex)))] })] }))] }), _jsxs("div", { className: "p-4 border-t bg-gray-50 flex items-center justify-end gap-3", children: [_jsx("button", { type: "button", onClick: onClose, className: "min-h-[48px] px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100", children: "\u0110\u00F3ng" }), parsedData && (_jsxs("button", { type: "button", "data-testid": "btn-save-word-questions", onClick: handleSave, className: "min-h-[48px] px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 shadow-sm", children: ["L\u01B0u v\u00E0o Ng\u00E2n h\u00E0ng \u0111\u1EC1 (", parsedData.questions.length, " c\u00E2u)"] }))] })] }) }));
};
//# sourceMappingURL=WordImportModal.js.map