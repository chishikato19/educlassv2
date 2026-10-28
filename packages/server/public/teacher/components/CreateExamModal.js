import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useMemo, useState } from 'react';
import { Button, Modal, UI_COLORS, UI_RADII, UI_SPACING } from '@educlass/ui-kit';
import { api } from '../api/client.js';
export const CreateExamModal = ({ isOpen, onClose, classes, onShowToast, onSuccess, initialClassId, questionSets: propQuestionSets, activeSession, existingFolders = [], }) => {
    const [questionSets, setQuestionSets] = useState(propQuestionSets || []);
    const [isLoadingSets, setIsLoadingSets] = useState(false);
    // Form states
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [folder, setFolder] = useState('');
    const [classId, setClassId] = useState(initialClassId || (classes[0]?.id ?? ''));
    const [questionSetId, setQuestionSetId] = useState('');
    const [durationMinutes, setDurationMinutes] = useState(45);
    // Câu hỏi & Phân bổ điểm số
    const [questions, setQuestions] = useState([]);
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
    const [targetTotalScore, setTargetTotalScore] = useState(10);
    const [scorePerQuestionInput, setScorePerQuestionInput] = useState(0.5);
    const [showQuestionDetailList, setShowQuestionDetailList] = useState(false);
    // Config states
    const [shuffleQuestions, setShuffleQuestions] = useState(false);
    const [shuffleOptions, setShuffleOptions] = useState(false);
    const [allowViewScore, setAllowViewScore] = useState(true);
    const [allowViewReview, setAllowViewReview] = useState(true);
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState({});
    const isInitializedRef = React.useRef(false);
    // Reset form khi modal mở/đóng
    useEffect(() => {
        if (!isOpen) {
            isInitializedRef.current = false;
            setTitle('');
            setSubject('');
            setFolder('');
            setQuestions([]);
            setShowQuestionDetailList(false);
            setFormErrors({});
            setIsSubmitting(false);
        }
    }, [isOpen]);
    // Nạp danh sách bộ đề nếu chưa có
    useEffect(() => {
        if (!isOpen)
            return;
        if (propQuestionSets && propQuestionSets.length > 0) {
            setQuestionSets(propQuestionSets);
            if (!questionSetId && propQuestionSets[0]) {
                setQuestionSetId(propQuestionSets[0].id);
                if (!isInitializedRef.current) {
                    setTitle(propQuestionSets[0].title);
                    setSubject(propQuestionSets[0].subject || '');
                    isInitializedRef.current = true;
                }
            }
            return;
        }
        let isMounted = true;
        setIsLoadingSets(true);
        api
            .getQuestionSets()
            .then(sets => {
            if (!isMounted)
                return;
            setQuestionSets(sets);
            if (sets.length > 0 && !questionSetId) {
                setQuestionSetId(sets[0].id);
                if (!isInitializedRef.current) {
                    setTitle(sets[0].title);
                    setSubject(sets[0].subject || '');
                    isInitializedRef.current = true;
                }
            }
        })
            .catch(() => {
            if (isMounted) {
                onShowToast('Không thể nạp danh sách bộ đề từ kho câu hỏi.');
            }
        })
            .finally(() => {
            if (isMounted) {
                setIsLoadingSets(false);
            }
        });
        return () => {
            isMounted = false;
        };
    }, [isOpen, propQuestionSets, questionSetId, onShowToast]);
    // Cập nhật classId mặc định
    useEffect(() => {
        if (initialClassId) {
            setClassId(initialClassId);
        }
        else if (classes.length > 0 && !classId) {
            setClassId(classes[0].id);
        }
    }, [initialClassId, classes, classId]);
    // Nạp chi tiết câu hỏi từ bộ đề được chọn để phân bổ điểm
    useEffect(() => {
        if (!questionSetId) {
            setQuestions([]);
            return;
        }
        let isMounted = true;
        setIsLoadingQuestions(true);
        api
            .getQuestionSet(questionSetId)
            .then(qs => {
            if (!isMounted)
                return;
            const rawQs = qs.questions || [];
            const mapped = rawQs.map((q, idx) => ({
                ...q,
                id: q['id'] || `q_${idx + 1}`,
                points: typeof q['points'] === 'number' && q['points'] > 0 ? q['points'] : 1,
            }));
            setQuestions(mapped);
        })
            .catch(() => {
            if (isMounted)
                setQuestions([]);
        })
            .finally(() => {
            if (isMounted)
                setIsLoadingQuestions(false);
        });
        return () => {
            isMounted = false;
        };
    }, [questionSetId]);
    // Khi giáo viên chọn một bộ đề khác, gợi ý tự động điền tiêu đề & môn
    const handleSelectQuestionSet = (setId) => {
        setQuestionSetId(setId);
        const chosen = questionSets.find(q => q.id === setId);
        if (chosen) {
            setTitle(chosen.title);
            if (chosen.subject) {
                setSubject(chosen.subject);
            }
        }
    };
    // Tính tổng điểm hiện tại của toàn bộ câu hỏi
    const currentTotalScore = useMemo(() => {
        const sum = questions.reduce((acc, q) => acc + (typeof q['points'] === 'number' ? q['points'] : 0), 0);
        return Math.round(sum * 100) / 100;
    }, [questions]);
    // Chia đều tổng điểm cho tất cả câu hỏi
    const handleDistributeTotalScore = (totalTarget) => {
        if (questions.length === 0 || totalTarget <= 0)
            return;
        const n = questions.length;
        const base = Math.floor((totalTarget / n) * 100) / 100;
        const remainderCents = Math.round((totalTarget - base * n) * 100);
        const updated = questions.map((q, idx) => {
            const extra = idx < remainderCents ? 0.01 : 0;
            const pts = Math.round((base + extra) * 100) / 100;
            return {
                ...q,
                points: pts,
            };
        });
        setQuestions(updated);
        onShowToast(`🎯 Đã chia đều ${totalTarget} điểm cho ${n} câu hỏi! (Mỗi câu ~${base}đ)`);
    };
    // Gán cùng một mức điểm cho tất cả câu hỏi
    const handleApplySameScore = (pts) => {
        if (questions.length === 0 || pts <= 0)
            return;
        const updated = questions.map(q => ({
            ...q,
            points: pts,
        }));
        setQuestions(updated);
        const newTotal = Math.round(pts * questions.length * 100) / 100;
        onShowToast(`🎯 Đã gán ${pts} điểm cho toàn bộ ${questions.length} câu (Tổng: ${newTotal}đ)`);
    };
    // Sửa điểm riêng của từng câu hỏi
    const handleUpdateQuestionPoint = (idx, newPoint) => {
        const updated = [...questions];
        if (updated[idx]) {
            updated[idx] = {
                ...updated[idx],
                points: Math.max(0, Math.round(newPoint * 100) / 100),
            };
            setQuestions(updated);
        }
    };
    const getQuestionSnippet = (q, fallbackIdx) => {
        const stem = q['stem'];
        if (typeof stem === 'string')
            return stem;
        if (typeof stem === 'object' && stem !== null && 'text' in stem) {
            return String(stem.text || `Câu hỏi ${fallbackIdx + 1}`);
        }
        return `Câu hỏi ${fallbackIdx + 1}`;
    };
    const validateForm = () => {
        const errors = {};
        if (!title.trim()) {
            errors['title'] = 'Vui lòng nhập tiêu đề kỳ thi.';
        }
        if (!classId) {
            errors['classId'] = 'Vui lòng chọn lớp học áp dụng.';
        }
        if (!questionSetId) {
            errors['questionSetId'] = 'Vui lòng chọn một bộ đề từ Kho đề thi.';
        }
        if (!durationMinutes || durationMinutes <= 0) {
            errors['durationMinutes'] = 'Thời gian làm bài tối thiểu là 1 phút.';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm())
            return;
        setIsSubmitting(true);
        try {
            const created = await api.createExam({
                classId,
                title: title.trim(),
                subject: subject.trim() ? subject.trim() : null,
                questionSetId,
                questions: questions.length > 0 ? questions : undefined,
                durationMinutes,
                config: {
                    shuffleQuestions,
                    shuffleOptions,
                    allowViewScore,
                    allowViewReview,
                    password: password.trim() ? password.trim() : null,
                    folder: folder.trim() ? folder.trim() : null,
                },
            });
            onShowToast(`🎉 Tạo kỳ thi "${title.trim()}" thành công!`);
            onSuccess(created);
            onClose();
        }
        catch {
            onShowToast('Đã xảy ra lỗi khi tạo kỳ thi. Vui lòng kiểm tra lại thông tin.');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    if (!isOpen)
        return null;
    return (_jsx(Modal, { isOpen: isOpen, maxWidth: "680px", title: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '10px' }, children: [_jsx("span", { style: { fontSize: '24px' }, children: "\uD83D\uDCDD" }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: '18px', fontWeight: 800, color: UI_COLORS.text }, children: "T\u1EA1o K\u1EF3 Thi M\u1EDBi Theo Ca" }), _jsx("div", { style: {
                                fontSize: '13px',
                                color: UI_COLORS.textMuted,
                                fontWeight: 500,
                                marginTop: '2px',
                            }, children: "Thi\u1EBFt l\u1EADp b\u00E0i ki\u1EC3m tra l\u01B0u tr\u1EEF l\u00E2u d\u00E0i, chia ca thi \u0111\u1ED9c l\u1EADp cho c\u1EA3 l\u1EDBp" })] })] }), onClose: () => !isSubmitting && onClose(), children: _jsxs("form", { onSubmit: handleSubmit, style: { display: 'flex', flexDirection: 'column', gap: '18px', padding: '4px 0' }, children: [_jsxs("div", { style: { display: 'flex', gap: '14px', flexWrap: 'wrap' }, children: [_jsxs("div", { style: { flex: '2 1 300px' }, children: [_jsxs("label", { style: {
                                        display: 'block',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        color: UI_COLORS.text,
                                        marginBottom: '6px',
                                    }, children: ["Ti\u00EAu \u0111\u1EC1 k\u1EF3 thi ", _jsx("span", { style: { color: '#DC2626' }, children: "*" })] }), _jsx("input", { type: "text", placeholder: "VD: Ki\u1EC3m tra 1 ti\u1EBFt Tin h\u1ECDc - Gi\u1EEFa HK1", value: title, onChange: e => {
                                        setTitle(e.target.value);
                                        if (formErrors['title'])
                                            setFormErrors(prev => ({ ...prev, title: '' }));
                                    }, style: {
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        padding: '10px 14px',
                                        borderRadius: UI_RADII.input,
                                        border: `1px solid ${formErrors['title'] ? '#DC2626' : UI_COLORS.border}`,
                                        fontSize: '14px',
                                        minHeight: '44px',
                                    } }), formErrors['title'] && (_jsx("span", { style: { fontSize: '12px', color: '#DC2626', marginTop: '4px', display: 'block' }, children: formErrors['title'] }))] }), _jsxs("div", { style: { flex: '1 1 140px' }, children: [_jsx("label", { style: {
                                        display: 'block',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        color: UI_COLORS.text,
                                        marginBottom: '6px',
                                    }, children: "M\u00F4n h\u1ECDc" }), _jsx("input", { type: "text", placeholder: "VD: Tin h\u1ECDc, To\u00E1n...", value: subject, onChange: e => setSubject(e.target.value), style: {
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        padding: '10px 14px',
                                        borderRadius: UI_RADII.input,
                                        border: `1px solid ${UI_COLORS.border}`,
                                        fontSize: '14px',
                                        minHeight: '44px',
                                    } })] }), _jsxs("div", { style: { flex: '1 1 160px' }, children: [_jsx("label", { style: {
                                        display: 'block',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        color: UI_COLORS.text,
                                        marginBottom: '6px',
                                    }, children: "\uD83D\uDCC1 Th\u01B0 m\u1EE5c l\u01B0u tr\u1EEF" }), _jsx("input", { type: "text", list: "create-exam-folder-datalist", placeholder: "VD: Gi\u1EEFa HK1, 15 Ph\u00FAt...", value: folder, onChange: e => setFolder(e.target.value), style: {
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        padding: '10px 14px',
                                        borderRadius: UI_RADII.input,
                                        border: `1px solid ${UI_COLORS.border}`,
                                        fontSize: '14px',
                                        minHeight: '44px',
                                    } }), _jsx("datalist", { id: "create-exam-folder-datalist", children: existingFolders.map(f => (_jsx("option", { value: f }, f))) })] })] }), _jsxs("div", { style: { display: 'flex', gap: '14px', flexWrap: 'wrap' }, children: [_jsxs("div", { style: { flex: '1 1 240px' }, children: [_jsxs("label", { style: {
                                        display: 'block',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        color: UI_COLORS.text,
                                        marginBottom: '6px',
                                    }, children: ["L\u1EDBp h\u1ECDc \u00E1p d\u1EE5ng ", _jsx("span", { style: { color: '#DC2626' }, children: "*" })] }), _jsx("select", { value: classId, onChange: e => {
                                        setClassId(e.target.value);
                                        if (formErrors['classId'])
                                            setFormErrors(prev => ({ ...prev, classId: '' }));
                                    }, style: {
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        padding: '10px 14px',
                                        borderRadius: UI_RADII.input,
                                        border: `1px solid ${formErrors['classId'] ? '#DC2626' : UI_COLORS.border}`,
                                        fontSize: '14px',
                                        backgroundColor: '#FFFFFF',
                                        color: UI_COLORS.text,
                                        minHeight: '44px',
                                        cursor: 'pointer',
                                    }, children: classes.length === 0 ? (_jsx("option", { value: "", children: "Ch\u01B0a c\u00F3 l\u1EDBp n\u00E0o trong h\u1EC7 th\u1ED1ng" })) : (classes.map(c => (_jsxs("option", { value: c.id, children: ["\uD83C\uDFEB ", c.name] }, c.id)))) }), formErrors['classId'] && (_jsx("span", { style: { fontSize: '12px', color: '#DC2626', marginTop: '4px', display: 'block' }, children: formErrors['classId'] }))] }), _jsxs("div", { style: { flex: '1 1 240px' }, children: [_jsxs("label", { style: {
                                        display: 'block',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        color: UI_COLORS.text,
                                        marginBottom: '6px',
                                    }, children: ["B\u1ED9 \u0111\u1EC1 t\u1EEB Kho \u0111\u1EC1 thi ", _jsx("span", { style: { color: '#DC2626' }, children: "*" })] }), _jsx("select", { value: questionSetId, onChange: e => {
                                        handleSelectQuestionSet(e.target.value);
                                        if (formErrors['questionSetId'])
                                            setFormErrors(prev => ({ ...prev, questionSetId: '' }));
                                    }, disabled: isLoadingSets, style: {
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        padding: '10px 14px',
                                        borderRadius: UI_RADII.input,
                                        border: `1px solid ${formErrors['questionSetId'] ? '#DC2626' : UI_COLORS.border}`,
                                        fontSize: '14px',
                                        backgroundColor: '#FFFFFF',
                                        color: UI_COLORS.text,
                                        minHeight: '44px',
                                        cursor: 'pointer',
                                    }, children: isLoadingSets ? (_jsx("option", { value: "", children: "\u0110ang n\u1EA1p kho c\u00E2u h\u1ECFi..." })) : questionSets.length === 0 ? (_jsx("option", { value: "", children: "Ch\u01B0a c\u00F3 b\u1ED9 \u0111\u1EC1 n\u00E0o trong Kho \u0111\u1EC1" })) : (questionSets.map(qs => {
                                        const isMatrix = qs.tags?.some(t => t.toLowerCase().includes('ma trận')) || false;
                                        return (_jsxs("option", { value: qs.id, children: [isMatrix ? '🎯 [Ma trận] ' : '📚 ', qs.title, " (", qs.questionCount, " c\u00E2u)"] }, qs.id));
                                    })) }), formErrors['questionSetId'] && (_jsx("span", { style: { fontSize: '12px', color: '#DC2626', marginTop: '4px', display: 'block' }, children: formErrors['questionSetId'] }))] })] }), questionSetId && (_jsxs("div", { style: {
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #CBD5E1',
                        borderRadius: UI_RADII.card,
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                    }, children: [_jsxs("div", { style: {
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '8px',
                            }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsx("span", { style: { fontSize: '18px' }, children: "\u2696\uFE0F" }), _jsx("span", { style: { fontSize: '14px', fontWeight: 700, color: UI_COLORS.text }, children: "Ph\u00E2n B\u1ED5 \u0110i\u1EC3m Cho C\u00E2u H\u1ECFi" }), isLoadingQuestions && (_jsx("span", { style: { fontSize: '12px', color: UI_COLORS.textMuted }, children: "(\u0110ang n\u1EA1p c\u00E2u h\u1ECFi...)" })), !isLoadingQuestions && questions.length > 0 && (_jsxs("span", { style: {
                                                fontSize: '12px',
                                                backgroundColor: '#E2E8F0',
                                                color: '#334155',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontWeight: 600,
                                            }, children: [questions.length, " c\u00E2u"] }))] }), _jsxs("div", { style: {
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        backgroundColor: currentTotalScore === 10 || currentTotalScore === 7 ? '#DCFCE7' : '#EFF6FF',
                                        border: `1px solid ${currentTotalScore === 10 || currentTotalScore === 7 ? '#86EFAC' : '#BFDBFE'}`,
                                        color: currentTotalScore === 10 || currentTotalScore === 7 ? '#15803D' : '#1D4ED8',
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                    }, children: [_jsx("span", { children: "T\u1ED5ng \u0111i\u1EC3m:" }), _jsx("strong", { style: { fontSize: '15px' }, children: currentTotalScore }), _jsx("span", { children: "\u0111i\u1EC3m" })] })] }), questions.length > 0 && (_jsxs(_Fragment, { children: [_jsxs("div", { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }, children: [_jsx("span", { style: { fontSize: '13px', color: UI_COLORS.textMuted, fontWeight: 600 }, children: "Chia nhanh:" }), _jsxs("button", { type: "button", onClick: () => handleDistributeTotalScore(10), style: {
                                                padding: '6px 14px',
                                                backgroundColor: '#2563EB',
                                                color: '#FFFFFF',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                            }, children: ["\uD83C\uDFAF Chia \u0111\u1EC1u 10 \u0111i\u1EC3m (", Math.floor((10 / questions.length) * 100) / 100, "\u0111/c\u00E2u)"] }), _jsxs("button", { type: "button", onClick: () => handleDistributeTotalScore(7), style: {
                                                padding: '6px 14px',
                                                backgroundColor: '#D97706',
                                                color: '#FFFFFF',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                            }, children: ["\uD83C\uDFAF Chia \u0111\u1EC1u 7 \u0111i\u1EC3m (", Math.floor((7 / questions.length) * 100) / 100, "\u0111/c\u00E2u)"] })] }), _jsxs("div", { style: {
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: '14px',
                                        alignItems: 'center',
                                        paddingTop: '8px',
                                        borderTop: '1px dashed #E2E8F0',
                                    }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '6px' }, children: [_jsx("span", { style: { fontSize: '13px', color: '#475569' }, children: "T\u1ED5ng \u0111i\u1EC3m:" }), _jsx("input", { type: "number", min: 1, max: 100, step: 0.5, value: targetTotalScore, onChange: e => {
                                                        const val = parseFloat(e.target.value);
                                                        setTargetTotalScore(isNaN(val) ? 0 : val);
                                                    }, style: {
                                                        width: '65px',
                                                        padding: '6px 8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #CBD5E1',
                                                        fontSize: '13px',
                                                        fontWeight: 600,
                                                        textAlign: 'center',
                                                    } }), _jsx("button", { type: "button", onClick: () => handleDistributeTotalScore(targetTotalScore), disabled: targetTotalScore <= 0, style: {
                                                        padding: '6px 12px',
                                                        backgroundColor: '#FFFFFF',
                                                        border: '1px solid #CBD5E1',
                                                        borderRadius: '6px',
                                                        fontSize: '12.5px',
                                                        fontWeight: 600,
                                                        color: '#1E293B',
                                                        cursor: 'pointer',
                                                    }, children: "Chia \u0111\u1EC1u" })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '6px' }, children: [_jsx("span", { style: { fontSize: '13px', color: '#475569' }, children: "M\u1ED7i c\u00E2u:" }), _jsx("input", { type: "number", min: 0.1, max: 20, step: 0.1, value: scorePerQuestionInput, onChange: e => {
                                                        const val = parseFloat(e.target.value);
                                                        setScorePerQuestionInput(isNaN(val) ? 0 : val);
                                                    }, style: {
                                                        width: '65px',
                                                        padding: '6px 8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #CBD5E1',
                                                        fontSize: '13px',
                                                        fontWeight: 600,
                                                        textAlign: 'center',
                                                    } }), _jsx("span", { style: { fontSize: '12px', color: UI_COLORS.textMuted }, children: "\u0111" }), _jsx("button", { type: "button", onClick: () => handleApplySameScore(scorePerQuestionInput), disabled: scorePerQuestionInput <= 0, style: {
                                                        padding: '6px 12px',
                                                        backgroundColor: '#FFFFFF',
                                                        border: '1px solid #CBD5E1',
                                                        borderRadius: '6px',
                                                        fontSize: '12.5px',
                                                        fontWeight: 600,
                                                        color: '#1E293B',
                                                        cursor: 'pointer',
                                                    }, children: "G\u00E1n t\u1EA5t c\u1EA3" })] }), _jsx("div", { style: { marginLeft: 'auto' }, children: _jsx("button", { type: "button", onClick: () => setShowQuestionDetailList(prev => !prev), style: {
                                                    padding: '6px 12px',
                                                    backgroundColor: showQuestionDetailList ? '#EEF2FF' : '#FFFFFF',
                                                    border: '1px solid #C7D2FE',
                                                    borderRadius: '6px',
                                                    fontSize: '12.5px',
                                                    fontWeight: 600,
                                                    color: '#4338CA',
                                                    cursor: 'pointer',
                                                }, children: showQuestionDetailList
                                                    ? '▲ Thu gọn danh sách câu'
                                                    : `👁️ Sửa điểm từng câu (${questions.length} câu)` }) })] }), showQuestionDetailList && (_jsx("div", { style: {
                                        maxHeight: '220px',
                                        overflowY: 'auto',
                                        backgroundColor: '#FFFFFF',
                                        border: '1px solid #E2E8F0',
                                        borderRadius: '8px',
                                        padding: '8px',
                                    }, children: _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }, children: [_jsx("thead", { children: _jsxs("tr", { style: {
                                                        borderBottom: '1px solid #E2E8F0',
                                                        color: '#64748B',
                                                        textAlign: 'left',
                                                    }, children: [_jsx("th", { style: { padding: '6px 8px', width: '45px' }, children: "C\u00E2u" }), _jsx("th", { style: { padding: '6px 8px', width: '90px' }, children: "Lo\u1EA1i c\u00E2u" }), _jsx("th", { style: { padding: '6px 8px' }, children: "N\u1ED9i dung c\u00E2u h\u1ECFi" }), _jsx("th", { style: { padding: '6px 8px', width: '100px', textAlign: 'right' }, children: "\u0110i\u1EC3m s\u1ED1" })] }) }), _jsx("tbody", { children: questions.map((q, idx) => {
                                                    const pts = typeof q['points'] === 'number' ? q['points'] : 1;
                                                    const qType = String(q['type'] || 'mcq4');
                                                    const typeLabel = qType === 'mcq4'
                                                        ? 'Trắc nghiệm'
                                                        : qType === 'tf'
                                                            ? 'Đúng/Sai'
                                                            : qType === 'short'
                                                                ? 'Điền ngắn'
                                                                : qType;
                                                    return (_jsxs("tr", { style: { borderBottom: '1px solid #F1F5F9' }, children: [_jsxs("td", { style: { padding: '6px 8px', fontWeight: 700, color: '#334155' }, children: ["#", idx + 1] }), _jsx("td", { style: { padding: '6px 8px', color: '#64748B' }, children: _jsx("span", { style: {
                                                                        backgroundColor: '#F1F5F9',
                                                                        padding: '2px 6px',
                                                                        borderRadius: '4px',
                                                                        fontSize: '11px',
                                                                    }, children: typeLabel }) }), _jsx("td", { style: {
                                                                    padding: '6px 8px',
                                                                    color: '#1E293B',
                                                                    maxWidth: '300px',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                }, title: getQuestionSnippet(q, idx), children: getQuestionSnippet(q, idx) }), _jsxs("td", { style: { padding: '6px 8px', textAlign: 'right' }, children: [_jsx("input", { type: "number", min: 0, max: 100, step: 0.1, value: pts, onChange: e => {
                                                                            const val = parseFloat(e.target.value);
                                                                            handleUpdateQuestionPoint(idx, isNaN(val) ? 0 : val);
                                                                        }, style: {
                                                                            width: '65px',
                                                                            padding: '4px 6px',
                                                                            borderRadius: '4px',
                                                                            border: '1px solid #CBD5E1',
                                                                            fontSize: '12px',
                                                                            fontWeight: 700,
                                                                            textAlign: 'right',
                                                                        } }), _jsx("span", { style: { marginLeft: '4px', fontSize: '11px', color: '#64748B' }, children: "\u0111" })] })] }, idx));
                                                }) })] }) }))] }))] })), (() => {
                    const currentSessionClassId = activeSession?.session?.classId ??
                        activeSession?.classId ??
                        null;
                    const isFreeSession = Boolean(activeSession) && !currentSessionClassId;
                    const selectedClass = classes.find(c => c.id === classId);
                    if (!isFreeSession)
                        return null;
                    return (_jsxs("div", { style: {
                            backgroundColor: '#FFFBEB',
                            border: '1px solid #FCD34D',
                            borderRadius: UI_RADII.card,
                            padding: '12px 16px',
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'flex-start',
                        }, children: [_jsx("span", { style: { fontSize: '18px', lineHeight: 1 }, children: "\u26A0\uFE0F" }), _jsxs("div", { style: { fontSize: '12.5px', color: '#92400E', lineHeight: 1.5 }, children: [_jsx("strong", { style: { color: '#B45309' }, children: "L\u01B0u \u00FD: Ti\u1EBFt h\u1ECDc hi\u1EC7n t\u1EA1i \u0111ang l\u00E0 Phi\u00EAn t\u1EF1 do!" }), _jsxs("div", { style: { marginTop: '2px' }, children: ["K\u1EF3 thi n\u00E0y \u0111\u01B0\u1EE3c g\u1EAFn v\u1EDBi ", _jsx("strong", { children: selectedClass?.name || 'Lớp đã chọn' }), ", nh\u01B0ng phi\u00EAn h\u1ECDc hi\u1EC7n t\u1EA1i kh\u00F4ng ch\u1ECDn danh s\u00E1ch l\u1EDBp (h\u1ECDc sinh ch\u1EC9 g\u00F5 t\u00EAn t\u1EF1 do khi v\u00E0o ph\u00F2ng)."] }), _jsx("div", { style: { marginTop: '4px', color: '#15803D', fontWeight: 600 }, children: "\u2713 H\u1EC7 th\u1ED1ng v\u1EABn t\u1EF1 \u0111\u1ED9ng l\u01B0u \u0111\u1EA7y \u0111\u1EE7 \u0111i\u1EC3m s\u1ED1 v\u00E0 b\u00E0i thi c\u1EE7a h\u1ECDc sinh t\u1EF1 do v\u00E0o b\u00E1o c\u00E1o." }), _jsxs("div", { style: { marginTop: '2px', color: '#B45309' }, children: ["\uD83D\uDCA1 \u0110\u1EC3 h\u1ECDc sinh t\u1EF1 \u0111\u1ED9ng \u0111\u0103ng nh\u1EADp \u0111\u00FAng m\u00E3 v\u00E0 danh s\u00E1ch l\u1EDBp ch\u00EDnh th\u1EE9c, th\u1EA7y/c\u00F4 n\u00EAn k\u1EBFt th\u00FAc phi\u00EAn hi\u1EC7n t\u1EA1i v\u00E0", ' ', _jsxs("u", { children: ["T\u1EA1o phi\u00EAn m\u1EDBi theo l\u1EDBp ", selectedClass?.name || ''] }), "."] })] })] }));
                })(), _jsxs("div", { children: [_jsxs("label", { style: {
                                display: 'block',
                                fontSize: '13px',
                                fontWeight: 700,
                                color: UI_COLORS.text,
                                marginBottom: '6px',
                            }, children: ["Th\u1EDDi l\u01B0\u1EE3ng l\u00E0m b\u00E0i (ph\u00FAt) ", _jsx("span", { style: { color: '#DC2626' }, children: "*" })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }, children: [_jsx("input", { type: "number", min: 1, max: 180, value: durationMinutes, onChange: e => {
                                        const val = parseInt(e.target.value, 10);
                                        setDurationMinutes(isNaN(val) ? 0 : val);
                                    }, style: {
                                        width: '110px',
                                        padding: '10px 14px',
                                        borderRadius: UI_RADII.input,
                                        border: `1px solid ${UI_COLORS.border}`,
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        minHeight: '44px',
                                    } }), _jsx("div", { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' }, children: [15, 30, 45, 60, 90].map(mins => (_jsxs("button", { type: "button", onClick: () => setDurationMinutes(mins), style: {
                                            padding: '8px 14px',
                                            borderRadius: '8px',
                                            border: `1px solid ${durationMinutes === mins ? UI_COLORS.primary : UI_COLORS.border}`,
                                            backgroundColor: durationMinutes === mins ? '#EEF4FF' : '#F8FAFC',
                                            color: durationMinutes === mins ? UI_COLORS.primary : '#475569',
                                            fontWeight: durationMinutes === mins ? 700 : 500,
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            minHeight: '40px',
                                        }, children: [mins, " ph\u00FAt"] }, mins))) })] })] }), _jsxs("div", { style: {
                        backgroundColor: '#F8FAFC',
                        border: `1px solid ${UI_COLORS.border}`,
                        borderRadius: UI_RADII.card,
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                    }, children: [_jsx("div", { style: {
                                fontSize: '13px',
                                fontWeight: 700,
                                color: UI_COLORS.text,
                                marginBottom: '2px',
                            }, children: "\u2699\uFE0F T\u00F9y ch\u1ECDn ch\u1ED1ng gian l\u1EADn & Tr\u1EA3 k\u1EBFt qu\u1EA3" }), _jsxs("label", { style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                color: UI_COLORS.text,
                            }, children: [_jsx("input", { type: "checkbox", checked: shuffleQuestions, onChange: e => setShuffleQuestions(e.target.checked), style: {
                                        width: '18px',
                                        height: '18px',
                                        accentColor: UI_COLORS.primary,
                                        cursor: 'pointer',
                                    } }), _jsxs("span", { children: [_jsx("strong", { children: "X\u00E1o tr\u1ED9n th\u1EE9 t\u1EF1 c\u00E2u h\u1ECFi:" }), " M\u1ED7i h\u1ECDc sinh nh\u1EADn \u0111\u1EC1 v\u1EDBi th\u1EE9 t\u1EF1 c\u00E2u h\u1ECFi ng\u1EABu nhi\u00EAn kh\u00E1c nhau."] })] }), _jsxs("label", { style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                color: UI_COLORS.text,
                            }, children: [_jsx("input", { type: "checkbox", checked: shuffleOptions, onChange: e => setShuffleOptions(e.target.checked), style: {
                                        width: '18px',
                                        height: '18px',
                                        accentColor: UI_COLORS.primary,
                                        cursor: 'pointer',
                                    } }), _jsxs("span", { children: [_jsx("strong", { children: "X\u00E1o tr\u1ED9n th\u1EE9 t\u1EF1 \u0111\u00E1p \u00E1n (A, B, C, D):" }), " \u0110\u1EA3o ng\u1EABu nhi\u00EAn v\u1ECB tr\u00ED c\u00E1c l\u1EF1a ch\u1ECDn trong t\u1EEBng c\u00E2u."] })] }), _jsxs("label", { style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                color: UI_COLORS.text,
                            }, children: [_jsx("input", { type: "checkbox", checked: allowViewScore, onChange: e => setAllowViewScore(e.target.checked), style: {
                                        width: '18px',
                                        height: '18px',
                                        accentColor: UI_COLORS.primary,
                                        cursor: 'pointer',
                                    } }), _jsxs("span", { children: [_jsx("strong", { children: "Cho xem \u0111i\u1EC3m sau khi n\u1ED9p:" }), " Hi\u1EC3n th\u1ECB \u0111i\u1EC3m s\u1ED1 ngay khi h\u1ECDc sinh ho\u00E0n th\u00E0nh b\u00E0i thi."] })] }), _jsxs("label", { style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                color: UI_COLORS.text,
                            }, children: [_jsx("input", { type: "checkbox", checked: allowViewReview, onChange: e => setAllowViewReview(e.target.checked), style: {
                                        width: '18px',
                                        height: '18px',
                                        accentColor: UI_COLORS.primary,
                                        cursor: 'pointer',
                                    } }), _jsxs("span", { children: [_jsx("strong", { children: "Cho xem l\u1EA1i b\u00E0i & \u0111\u00E1p \u00E1n \u0111\u00FAng:" }), " H\u1ECDc sinh c\u00F3 th\u1EC3 xem l\u1EA1i c\u00E1c c\u00E2u \u0111\u00FAng/sai sau khi n\u1ED9p."] })] }), _jsxs("div", { style: { marginTop: '4px', paddingTop: '10px', borderTop: '1px solid #E2E8F0' }, children: [_jsx("label", { style: {
                                        display: 'block',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        color: UI_COLORS.text,
                                        marginBottom: '6px',
                                    }, children: "\uD83D\uDD12 M\u1EADt kh\u1EA9u v\u00E0o thi (T\u00F9y ch\u1ECDn, \u0111\u1EC3 tr\u1ED1ng n\u1EBFu kh\u00F4ng y\u00EAu c\u1EA7u):" }), _jsx("input", { type: "text", placeholder: "VD: 123456", value: password, onChange: e => setPassword(e.target.value), style: {
                                        width: '100%',
                                        maxWidth: '240px',
                                        boxSizing: 'border-box',
                                        padding: '8px 12px',
                                        borderRadius: UI_RADII.input,
                                        border: `1px solid ${UI_COLORS.border}`,
                                        fontSize: '13px',
                                    } })] })] }), _jsxs("div", { style: {
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '10px',
                        marginTop: '8px',
                        paddingTop: '12px',
                        borderTop: `1px solid ${UI_COLORS.border}`,
                    }, children: [_jsx(Button, { type: "button", variant: "ghost", disabled: isSubmitting, onClick: onClose, style: {
                                minHeight: UI_SPACING.minTouchTarget,
                                backgroundColor: '#F1F5F9',
                                borderColor: '#CBD5E1',
                                color: '#334155',
                                fontWeight: 600,
                            }, children: "H\u1EE7y b\u1ECF" }), _jsx(Button, { type: "submit", variant: "primary", disabled: isSubmitting || classes.length === 0, style: {
                                minHeight: UI_SPACING.minTouchTarget,
                                fontWeight: 700,
                                padding: '10px 24px',
                            }, children: isSubmitting ? 'Đang tạo kỳ thi...' : '➕ Tạo kỳ thi ngay' })] })] }) }));
};
//# sourceMappingURL=CreateExamModal.js.map