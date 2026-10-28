import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { Button, Modal, UI_COLORS, UI_RADII, UI_SPACING } from '@educlass/ui-kit';
import { renderLatexInText, resolveAssetUrl } from '@educlass/question-kit';
const BASE_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];
function richTextToString(raw) {
    if (typeof raw === 'string')
        return raw;
    if (!raw || typeof raw !== 'object')
        return '';
    const obj = raw;
    if (typeof obj['text'] === 'string')
        return obj['text'];
    if (Array.isArray(obj['runs'])) {
        return obj['runs']
            .map(r => (typeof r['text'] === 'string' ? r['text'] : ''))
            .join('');
    }
    return '';
}
function formatSeconds(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}p ${s < 10 ? '0' : ''}${s}s`;
}
function formatDateTime(ts) {
    if (!ts || ts <= 0)
        return '—';
    const d = new Date(ts);
    const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    const dd = pad(d.getDate());
    const mo = pad(d.getMonth() + 1);
    return `${hh}:${mm}:${ss} ${dd}/${mo}`;
}
export const StudentExamReviewModal = ({ isOpen, onClose, record, questions, className, examTitle, }) => {
    const [filterType, setFilterType] = useState('all');
    const [previewImg, setPreviewImg] = useState(null);
    // Chuyển đổi dữ liệu câu trả lời của học sinh thành danh sách câu hỏi review trực quan
    const parsedReviews = useMemo(() => {
        if (!record)
            return [];
        // 1. Nếu trong record.result đã có reviewData (do activity exam trả về)
        if (record.result && Array.isArray(record.result)) {
            const rawList = record.result;
            return rawList.map((item, idx) => {
                const order = typeof item['order'] === 'number' ? item['order'] : idx + 1;
                const qId = String(item['questionId'] || item['id'] || `q${order}`);
                const origQ = questions.find(q => q['id'] === qId || q['orderIndex'] === order - 1) ?? questions[idx];
                const stemText = typeof item['stemText'] === 'string' && item['stemText'].trim()
                    ? item['stemText']
                    : origQ
                        ? richTextToString(origQ['stem'])
                        : `Câu hỏi ${order}`;
                let stemImages = [];
                if (Array.isArray(item['stemImages']) && item['stemImages'].length > 0) {
                    stemImages = item['stemImages'];
                }
                else if (origQ) {
                    if (origQ['stem'] &&
                        typeof origQ['stem'] === 'object' &&
                        Array.isArray(origQ['stem']['images'])) {
                        stemImages = origQ['stem']['images'];
                    }
                    else if (Array.isArray(origQ['images'])) {
                        stemImages = origQ['images'];
                    }
                }
                const type = String(item['type'] || (origQ ? origQ['type'] : 'mcq4'));
                const points = typeof item['points'] === 'number'
                    ? item['points']
                    : origQ && typeof origQ['points'] === 'number'
                        ? origQ['points']
                        : 0.5;
                const pointsEarned = typeof item['pointsEarned'] === 'number' ? item['pointsEarned'] : 0;
                const isCorrect = item['isCorrect'] === true || item['correct'] === true;
                let options = [];
                if (Array.isArray(item['options'])) {
                    options = item['options'].map((opt, oIdx) => {
                        let optImages = [];
                        if (Array.isArray(opt['images'])) {
                            optImages = opt['images'];
                        }
                        else if (origQ && Array.isArray(origQ['options'])) {
                            const origOpt = origQ['options'][oIdx];
                            if (origOpt &&
                                typeof origOpt === 'object' &&
                                Array.isArray(origOpt['images'])) {
                                optImages = origOpt['images'];
                            }
                        }
                        return {
                            index: typeof opt['index'] === 'number' ? opt['index'] : oIdx,
                            label: String(opt['label'] || BASE_LABELS[oIdx] || `${oIdx + 1}`),
                            text: richTextToString(opt['text'] || opt),
                            images: optImages,
                        };
                    });
                }
                const studentChoiceLabel = item['studentChoiceLabel']
                    ? String(item['studentChoiceLabel'])
                    : null;
                const correctChoiceLabel = item['correctChoiceLabel']
                    ? String(item['correctChoiceLabel'])
                    : null;
                const explanation = typeof item['explanation'] === 'string' && item['explanation'].trim()
                    ? item['explanation']
                    : origQ && origQ['explanation']
                        ? richTextToString(origQ['explanation'])
                        : undefined;
                return {
                    questionId: qId,
                    order,
                    stemText,
                    stemImages,
                    type,
                    points,
                    pointsEarned,
                    isCorrect,
                    options,
                    studentChoiceLabel,
                    correctChoiceLabel,
                    studentRawAnswer: item['studentAnswer'],
                    correctRawAnswer: item['correctAnswer'],
                    explanation,
                };
            });
        }
        // 2. Fallback: Tự tái tạo từ questions và answers của học sinh
        const answers = (record.answers || {});
        return questions.map((q, idx) => {
            const order = idx + 1;
            const qId = String(q['id'] || `q${order}`);
            const stemText = richTextToString(q['stem']) || `Câu hỏi ${order}`;
            const stemImages = q['stem'] &&
                typeof q['stem'] === 'object' &&
                Array.isArray(q['stem']['images'])
                ? q['stem']['images']
                : Array.isArray(q['images'])
                    ? q['images']
                    : [];
            const type = String(q['type'] || 'mcq4');
            const points = typeof q['points'] === 'number' ? q['points'] : 0.5;
            const rawAns = answers[qId] ?? answers[`q_${order}`] ?? answers[`q${order}`];
            let options = [];
            let studentChoiceLabel = null;
            let correctChoiceLabel = null;
            let isCorrect = false;
            const correctRaw = q['correct'] ?? q['correctAnswer'];
            if (type === 'mcq4' && Array.isArray(q['options'])) {
                options = q['options'].map((opt, optIdx) => {
                    let optImages = [];
                    if (typeof opt === 'object' &&
                        opt !== null &&
                        Array.isArray(opt['images'])) {
                        optImages = opt['images'];
                    }
                    return {
                        index: optIdx,
                        label: BASE_LABELS[optIdx] ?? `${optIdx + 1}`,
                        text: richTextToString(opt),
                        images: optImages,
                    };
                });
                if (typeof rawAns === 'number' && rawAns >= 0 && rawAns < options.length) {
                    studentChoiceLabel = BASE_LABELS[rawAns] ?? `${rawAns + 1}`;
                }
                else if (typeof rawAns === 'string' && rawAns.length === 1) {
                    studentChoiceLabel = rawAns.toUpperCase();
                }
                if (typeof correctRaw === 'number' && correctRaw >= 0 && correctRaw < options.length) {
                    correctChoiceLabel = BASE_LABELS[correctRaw] ?? `${correctRaw + 1}`;
                }
                else if (typeof correctRaw === 'string') {
                    correctChoiceLabel = correctRaw.toUpperCase();
                }
                if (studentChoiceLabel && correctChoiceLabel && studentChoiceLabel === correctChoiceLabel) {
                    isCorrect = true;
                }
                else if (rawAns !== undefined && correctRaw !== undefined && rawAns === correctRaw) {
                    isCorrect = true;
                }
            }
            else {
                if (rawAns !== undefined &&
                    correctRaw !== undefined &&
                    String(rawAns).trim().toLowerCase() === String(correctRaw).trim().toLowerCase()) {
                    isCorrect = true;
                }
            }
            return {
                questionId: qId,
                order,
                stemText,
                stemImages,
                type,
                points,
                pointsEarned: isCorrect ? points : 0,
                isCorrect,
                options,
                studentChoiceLabel,
                correctChoiceLabel,
                studentRawAnswer: rawAns,
                correctRawAnswer: correctRaw,
                explanation: q['explanation'] ? richTextToString(q['explanation']) : undefined,
            };
        });
    }, [record, questions]);
    // Lọc câu hỏi theo Đúng / Sai
    const filteredReviews = useMemo(() => {
        if (filterType === 'correct') {
            return parsedReviews.filter(q => q.isCorrect);
        }
        if (filterType === 'wrong') {
            return parsedReviews.filter(q => !q.isCorrect);
        }
        return parsedReviews;
    }, [parsedReviews, filterType]);
    const correctCount = parsedReviews.filter(q => q.isCorrect).length;
    const wrongCount = parsedReviews.length - correctCount;
    if (!isOpen || !record)
        return null;
    return (_jsxs(Modal, { isOpen: isOpen, maxWidth: "840px", title: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '10px' }, children: [_jsx("span", { style: { fontSize: '24px' }, children: "\uD83D\uDCDD" }), _jsxs("div", { children: [_jsxs("div", { style: { fontSize: '18px', fontWeight: 800, color: UI_COLORS.text }, children: ["Chi Ti\u1EBFt B\u00E0i L\u00E0m: ", record.studentName] }), _jsxs("div", { style: { fontSize: '12.5px', color: UI_COLORS.textMuted, marginTop: '2px' }, children: [className ? `Lớp: ${className}` : '', ' ', record.studentCode ? `• Mã HS: ${record.studentCode}` : '', " \u2022 Ca thi", ' ', record.batchIndex, examTitle ? ` • Đề: ${examTitle}` : ''] })] })] }), onClose: onClose, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px 0' }, children: [_jsxs("div", { style: {
                            backgroundColor: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: UI_RADII.card,
                            padding: '14px 18px',
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [_jsx("div", { style: {
                                            width: '54px',
                                            height: '54px',
                                            borderRadius: '50%',
                                            backgroundColor: record.score >= 0.5 * (record.maxScore || 10) ? '#DCFCE7' : '#FEE2E2',
                                            border: `2px solid ${record.score >= 0.5 * (record.maxScore || 10) ? '#86EFAC' : '#FCA5A5'}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '22px',
                                            fontWeight: 900,
                                            color: record.score >= 0.5 * (record.maxScore || 10) ? '#15803D' : '#DC2626',
                                        }, children: record.score }), _jsxs("div", { children: [_jsxs("div", { style: { fontSize: '13px', fontWeight: 700, color: UI_COLORS.text }, children: ["\u0110I\u1EC2M \u0110\u1EA0T \u0110\u01AF\u1EE2C: ", record.score, " / ", record.maxScore || 10, "\u0111"] }), _jsxs("div", { style: { fontSize: '12.5px', color: '#475569', marginTop: '2px' }, children: ["\u0110\u00FAng ", _jsx("strong", { children: correctCount }), " / ", parsedReviews.length, " c\u00E2u (", record.percentage, "%)"] })] })] }), _jsxs("div", { style: { display: 'flex', gap: '16px', fontSize: '12.5px', color: '#475569' }, children: [_jsxs("div", { children: [_jsx("div", { style: { color: UI_COLORS.textMuted, fontSize: '11px', fontWeight: 600 }, children: "TH\u1EDCI GIAN L\u00C0M" }), _jsxs("div", { style: { fontWeight: 700, color: UI_COLORS.text, marginTop: '2px' }, children: ["\u23F1\uFE0F ", record.timeSpentSeconds > 0 ? formatSeconds(record.timeSpentSeconds) : '—'] })] }), _jsxs("div", { children: [_jsx("div", { style: { color: UI_COLORS.textMuted, fontSize: '11px', fontWeight: 600 }, children: "N\u1ED8P B\u00C0I L\u00DAC" }), _jsxs("div", { style: { fontWeight: 700, color: UI_COLORS.text, marginTop: '2px' }, children: ["\uD83D\uDCC5 ", formatDateTime(record.submittedAt)] })] })] }), _jsx("span", { style: {
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    fontSize: '12.5px',
                                    fontWeight: 700,
                                    backgroundColor: record.status === 'submitted' ? '#DCFCE7' : '#FEF3C7',
                                    color: record.status === 'submitted' ? '#166534' : '#92400E',
                                    border: `1px solid ${record.status === 'submitted' ? '#BBF7D0' : '#FDE68A'}`,
                                }, children: record.status === 'submitted' ? '✓ Đã nộp bài hoàn tất' : '⏳ Đang làm bài' })] }), _jsxs("div", { style: { display: 'flex', gap: '8px', alignItems: 'center' }, children: [_jsxs("button", { type: "button", onClick: () => setFilterType('all'), style: {
                                    padding: '6px 14px',
                                    borderRadius: '6px',
                                    border: `1px solid ${filterType === 'all' ? UI_COLORS.primary : '#E2E8F0'}`,
                                    backgroundColor: filterType === 'all' ? '#EEF4FF' : '#FFFFFF',
                                    color: filterType === 'all' ? UI_COLORS.primary : '#475569',
                                    fontWeight: filterType === 'all' ? 700 : 500,
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                }, children: ["T\u1EA5t c\u1EA3 (", parsedReviews.length, ")"] }), _jsxs("button", { type: "button", onClick: () => setFilterType('correct'), style: {
                                    padding: '6px 14px',
                                    borderRadius: '6px',
                                    border: `1px solid ${filterType === 'correct' ? '#16A34A' : '#E2E8F0'}`,
                                    backgroundColor: filterType === 'correct' ? '#F0FDF4' : '#FFFFFF',
                                    color: filterType === 'correct' ? '#16A34A' : '#475569',
                                    fontWeight: filterType === 'correct' ? 700 : 500,
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                }, children: ["\u2713 C\u00E2u \u0111\u00FAng (", correctCount, ")"] }), _jsxs("button", { type: "button", onClick: () => setFilterType('wrong'), style: {
                                    padding: '6px 14px',
                                    borderRadius: '6px',
                                    border: `1px solid ${filterType === 'wrong' ? '#DC2626' : '#E2E8F0'}`,
                                    backgroundColor: filterType === 'wrong' ? '#FEF2F2' : '#FFFFFF',
                                    color: filterType === 'wrong' ? '#DC2626' : '#475569',
                                    fontWeight: filterType === 'wrong' ? 700 : 500,
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                }, children: ["\u2717 C\u00E2u sai (", wrongCount, ")"] })] }), _jsx("div", { style: {
                            maxHeight: '480px',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '14px',
                            paddingRight: '4px',
                        }, children: filteredReviews.length === 0 ? (_jsx("div", { style: { textAlign: 'center', padding: '32px 16px', color: UI_COLORS.textMuted }, children: "Kh\u00F4ng c\u00F3 c\u00E2u h\u1ECFi n\u00E0o trong danh m\u1EE5c n\u00E0y." })) : (filteredReviews.map(q => {
                            const hasAnswered = q.studentChoiceLabel !== null || q.studentRawAnswer !== undefined;
                            return (_jsxs("div", { style: {
                                    backgroundColor: '#FFFFFF',
                                    border: `1px solid ${q.isCorrect ? '#BBF7D0' : '#FECACA'}`,
                                    borderRadius: UI_RADII.card,
                                    padding: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                }, children: [_jsxs("div", { style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            flexWrap: 'wrap',
                                            gap: '8px',
                                        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsxs("span", { style: {
                                                            fontSize: '13px',
                                                            fontWeight: 800,
                                                            padding: '3px 8px',
                                                            borderRadius: '6px',
                                                            backgroundColor: '#F1F5F9',
                                                            color: '#334155',
                                                        }, children: ["C\u00E2u ", q.order] }), _jsxs("span", { style: { fontSize: '12px', fontWeight: 600, color: UI_COLORS.textMuted }, children: ["(", q.pointsEarned > 0 ? `+${q.pointsEarned}đ` : '0đ', " / ", q.points, "\u0111)"] })] }), _jsx("span", { style: {
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    padding: '3px 10px',
                                                    borderRadius: '6px',
                                                    backgroundColor: q.isCorrect ? '#DCFCE7' : '#FEE2E2',
                                                    color: q.isCorrect ? '#166534' : '#991B1B',
                                                    border: `1px solid ${q.isCorrect ? '#86EFAC' : '#FCA5A5'}`,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                }, children: q.isCorrect ? '✓ ĐÚNG' : hasAnswered ? '✗ SAI' : '⚪ CHƯA LÀM' })] }), _jsx("div", { style: {
                                            fontSize: '14.5px',
                                            fontWeight: 600,
                                            color: UI_COLORS.text,
                                            lineHeight: 1.6,
                                        }, dangerouslySetInnerHTML: {
                                            __html: renderLatexInText(q.stemText),
                                        } }), q.stemImages && q.stemImages.length > 0 && (_jsx("div", { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '4px 0' }, children: q.stemImages.map((imgUrl, iIdx) => {
                                            const resolvedUrl = resolveAssetUrl(imgUrl);
                                            return (_jsx("img", { src: resolvedUrl, alt: `Minh họa câu ${q.order}`, onClick: () => setPreviewImg(resolvedUrl), title: "Nh\u1EA5n \u0111\u1EC3 ph\u00F3ng to \u1EA3nh", style: {
                                                    maxHeight: '180px',
                                                    maxWidth: '100%',
                                                    objectFit: 'contain',
                                                    borderRadius: '6px',
                                                    border: '1px solid #CBD5E1',
                                                    cursor: 'zoom-in',
                                                    backgroundColor: '#FFFFFF',
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                                                } }, iIdx));
                                        }) })), q.options && q.options.length > 0 ? (_jsx("div", { style: {
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '6px',
                                            marginTop: '4px',
                                        }, children: q.options.map(opt => {
                                            const isStudentPick = q.studentChoiceLabel === opt.label;
                                            const isCorrectOpt = q.correctChoiceLabel === opt.label;
                                            let optBg = '#F8FAFC';
                                            let optBorder = '#E2E8F0';
                                            let optColor = '#334155';
                                            if (isCorrectOpt) {
                                                optBg = '#F0FDF4';
                                                optBorder = '#86EFAC';
                                                optColor = '#166534';
                                            }
                                            if (isStudentPick && !isCorrectOpt) {
                                                optBg = '#FEF2F2';
                                                optBorder = '#FCA5A5';
                                                optColor = '#991B1B';
                                            }
                                            return (_jsxs("div", { style: {
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: '10px',
                                                    padding: '8px 12px',
                                                    borderRadius: '6px',
                                                    backgroundColor: optBg,
                                                    border: `1.5px solid ${optBorder}`,
                                                    color: optColor,
                                                    fontSize: '13.5px',
                                                    lineHeight: 1.4,
                                                }, children: [_jsx("span", { style: {
                                                            fontWeight: 800,
                                                            width: '22px',
                                                            height: '22px',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            borderRadius: '50%',
                                                            backgroundColor: isCorrectOpt
                                                                ? '#16A34A'
                                                                : isStudentPick
                                                                    ? '#DC2626'
                                                                    : '#CBD5E1',
                                                            color: isCorrectOpt || isStudentPick ? '#FFFFFF' : '#334155',
                                                            fontSize: '12px',
                                                            flexShrink: 0,
                                                            marginTop: '1px',
                                                        }, children: opt.label }), _jsxs("div", { style: { flex: 1, minWidth: 0, wordBreak: 'break-word' }, children: [_jsx("div", { dangerouslySetInnerHTML: {
                                                                    __html: renderLatexInText(opt.text),
                                                                } }), opt.images && opt.images.length > 0 && (_jsx("div", { style: {
                                                                    display: 'flex',
                                                                    gap: '8px',
                                                                    flexWrap: 'wrap',
                                                                    marginTop: '6px',
                                                                }, children: opt.images.map((imgUrl, oImgIdx) => {
                                                                    const optResolved = resolveAssetUrl(imgUrl);
                                                                    return (_jsx("img", { src: optResolved, alt: `Hình phương án ${opt.label}`, onClick: () => setPreviewImg(optResolved), title: "Nh\u1EA5n \u0111\u1EC3 ph\u00F3ng to \u1EA3nh", style: {
                                                                            maxHeight: '120px',
                                                                            maxWidth: '100%',
                                                                            objectFit: 'contain',
                                                                            borderRadius: '4px',
                                                                            border: '1px solid #CBD5E1',
                                                                            cursor: 'zoom-in',
                                                                            backgroundColor: '#FFFFFF',
                                                                        } }, oImgIdx));
                                                                }) }))] }), _jsxs("div", { style: { display: 'flex', gap: '6px', flexShrink: 0 }, children: [isStudentPick && (_jsx("span", { style: {
                                                                    fontSize: '11px',
                                                                    fontWeight: 700,
                                                                    padding: '2px 6px',
                                                                    borderRadius: '4px',
                                                                    backgroundColor: isCorrectOpt ? '#DCFCE7' : '#FEE2E2',
                                                                    color: isCorrectOpt ? '#166534' : '#DC2626',
                                                                    border: `1px solid ${isCorrectOpt ? '#86EFAC' : '#FCA5A5'}`,
                                                                }, children: isCorrectOpt ? '✓ Bạn chọn (Đúng)' : '✗ Bạn chọn' })), isCorrectOpt && !isStudentPick && (_jsx("span", { style: {
                                                                    fontSize: '11px',
                                                                    fontWeight: 700,
                                                                    padding: '2px 6px',
                                                                    borderRadius: '4px',
                                                                    backgroundColor: '#DCFCE7',
                                                                    color: '#166534',
                                                                    border: '1px solid #86EFAC',
                                                                }, children: "\u2713 \u0110\u00E1p \u00E1n \u0111\u00FAng" }))] })] }, opt.index));
                                        }) })) : (
                                    /* Dạng câu hỏi khác (Điền từ / Tự luận) */
                                    _jsxs("div", { style: {
                                            backgroundColor: '#F8FAFC',
                                            border: '1px solid #E2E8F0',
                                            borderRadius: '6px',
                                            padding: '10px 12px',
                                            fontSize: '13px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '6px',
                                        }, children: [_jsxs("div", { style: { display: 'flex', gap: '8px', alignItems: 'baseline' }, children: [_jsx("span", { style: { fontWeight: 600, color: UI_COLORS.textMuted }, children: "H\u1ECDc sinh tr\u1EA3 l\u1EDDi:" }), _jsx("strong", { style: { color: q.isCorrect ? '#16A34A' : '#DC2626' }, dangerouslySetInnerHTML: {
                                                            __html: q.studentRawAnswer !== undefined
                                                                ? renderLatexInText(String(q.studentRawAnswer))
                                                                : 'Chưa có câu trả lời',
                                                        } })] }), _jsxs("div", { style: { display: 'flex', gap: '8px', alignItems: 'baseline' }, children: [_jsx("span", { style: { fontWeight: 600, color: UI_COLORS.textMuted }, children: "\u0110\u00E1p \u00E1n ch\u00EDnh x\u00E1c:" }), _jsx("strong", { style: { color: '#16A34A' }, dangerouslySetInnerHTML: {
                                                            __html: q.correctRawAnswer !== undefined
                                                                ? renderLatexInText(String(q.correctRawAnswer))
                                                                : '—',
                                                        } })] })] })), q.explanation && (_jsxs("div", { style: {
                                            backgroundColor: '#EFF6FF',
                                            border: '1px solid #BFDBFE',
                                            borderRadius: '6px',
                                            padding: '10px 14px',
                                            fontSize: '13px',
                                            color: '#1E40AF',
                                            lineHeight: 1.5,
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '8px',
                                        }, children: [_jsx("span", { style: { fontWeight: 700, flexShrink: 0 }, children: "\uD83D\uDCA1 L\u1EDDi gi\u1EA3i:" }), _jsx("div", { style: { flex: 1 }, dangerouslySetInnerHTML: {
                                                    __html: renderLatexInText(q.explanation),
                                                } })] }))] }, q.questionId));
                        })) }), _jsx("div", { style: {
                            display: 'flex',
                            justifyContent: 'flex-end',
                            paddingTop: '12px',
                            borderTop: `1px solid ${UI_COLORS.border}`,
                        }, children: _jsx(Button, { type: "button", variant: "ghost", onClick: onClose, style: {
                                minHeight: UI_SPACING.minTouchTarget,
                                backgroundColor: '#F1F5F9',
                                borderColor: '#CBD5E1',
                                color: '#334155',
                                fontWeight: 600,
                                padding: '8px 24px',
                            }, children: "\u0110\u00F3ng" }) })] }), previewImg && (_jsx("div", { onClick: () => setPreviewImg(null), style: {
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 99999,
                    padding: '20px',
                    cursor: 'zoom-out',
                    backdropFilter: 'blur(2px)',
                }, children: _jsxs("div", { style: { position: 'relative', maxWidth: '95vw', maxHeight: '90vh' }, onClick: e => e.stopPropagation(), children: [_jsx("img", { src: previewImg, alt: "\u1EA2nh ph\u00F3ng to", style: {
                                maxWidth: '92vw',
                                maxHeight: '85vh',
                                objectFit: 'contain',
                                borderRadius: '8px',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                                backgroundColor: '#FFFFFF',
                            } }), _jsx("button", { type: "button", onClick: () => setPreviewImg(null), style: {
                                position: 'absolute',
                                top: '-12px',
                                right: '-12px',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #CBD5E1',
                                color: '#334155',
                                fontSize: '16px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                            }, children: "\u2715" })] }) }))] }));
};
//# sourceMappingURL=StudentExamReviewModal.js.map