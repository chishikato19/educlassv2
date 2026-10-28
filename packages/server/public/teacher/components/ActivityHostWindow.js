import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import { getActivityPlugin } from '../activities/index.js';
import { ErrorBoundary } from './ErrorBoundary.js';
export const ActivityHostWindow = () => {
    const [sessionId, setSessionId] = useState('');
    const [activeRun, setActiveRun] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isActivityEnded, setIsActivityEnded] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const wsRef = useRef(null);
    // 1. Lấy thông tin session và activeRun ban đầu
    const initSessionData = useCallback(async () => {
        try {
            setIsLoading(true);
            setErrorMsg(null);
            const urlParams = new URLSearchParams(window.location.search);
            const paramSessionId = urlParams.get('sessionId');
            const paramRunId = urlParams.get('runId');
            await api.ensureAuthenticated();
            const activeSess = await api.getActiveSession();
            if (!activeSess || !activeSess.session) {
                setErrorMsg('Không tìm thấy phiên học đang hoạt động.');
                setIsLoading(false);
                return;
            }
            const currentSessId = paramSessionId || activeSess.session.id;
            setSessionId(currentSessId);
            const currentAct = await api.getCurrentActivity(currentSessId, paramRunId ? { runId: paramRunId } : undefined);
            if (currentAct && currentAct.run) {
                setActiveRun({
                    runId: currentAct.run.id,
                    activityId: currentAct.run.activityId,
                    state: currentAct.state,
                });
                setIsActivityEnded(false);
            }
            else {
                setIsActivityEnded(true);
            }
        }
        catch (err) {
            setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi tải thông tin hoạt động');
        }
        finally {
            setIsLoading(false);
        }
    }, []);
    useEffect(() => {
        void initSessionData();
    }, [initSessionData]);
    // 2. Kết nối WebSocket thời gian thực cho cửa sổ hoạt động
    useEffect(() => {
        if (!sessionId)
            return;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host || 'localhost:3000';
        const wsUrl = `${protocol}//${host}/ws?sessionId=${sessionId}&role=teacher`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onopen = () => {
            setIsConnected(true);
            ws.send(JSON.stringify({
                v: 1,
                id: 'subwin_init_' + Date.now(),
                type: 'ping',
                sessionId,
                ts: Date.now(),
                payload: { role: 'teacher' },
            }));
        };
        ws.onmessage = event => {
            try {
                const envelope = JSON.parse(event.data);
                const type = envelope.type;
                const payload = envelope.payload;
                if (type === 'activity_state_patch' ||
                    type === 'activity_snapshot' ||
                    type === 'activity_state') {
                    const targetRunId = payload?.runId;
                    const targetActivityId = payload?.activityId;
                    const urlParams = new URLSearchParams(window.location.search);
                    const currentParamRunId = urlParams.get('runId');
                    if (currentParamRunId && targetRunId && targetRunId !== currentParamRunId) {
                        return;
                    }
                    const nextState = payload?.state ?? payload;
                    setActiveRun(prev => {
                        if (prev) {
                            if (targetRunId && prev.runId !== targetRunId)
                                return prev;
                            return { ...prev, state: nextState };
                        }
                        if (targetRunId && targetActivityId) {
                            return {
                                runId: targetRunId,
                                activityId: targetActivityId,
                                state: nextState,
                            };
                        }
                        return null;
                    });
                    setIsActivityEnded(false);
                }
                else if (type === 'activity_ended' || type === 'activity_end') {
                    const urlParams = new URLSearchParams(window.location.search);
                    const currentParamRunId = urlParams.get('runId');
                    const endedRunId = payload?.runId;
                    if (currentParamRunId && endedRunId && endedRunId !== currentParamRunId) {
                        return;
                    }
                    setIsActivityEnded(true);
                }
                else if (type === 'session_closed') {
                    setIsActivityEnded(true);
                    setErrorMsg('Tiết học đã được kết thúc bởi giáo viên.');
                }
            }
            catch {
                // bỏ qua parse error
            }
        };
        ws.onclose = () => {
            setIsConnected(false);
        };
        return () => {
            ws.close();
            wsRef.current = null;
        };
    }, [sessionId]);
    // 3. Hàm gửi lệnh điều khiển (intent) từ giáo viên lên máy chủ
    const handleSendIntent = useCallback(async (intent) => {
        if (!activeRun || !sessionId)
            return;
        try {
            const res = await api.sendTeacherIntent(sessionId, activeRun.runId, intent);
            if (res && res.state) {
                setActiveRun(prev => (prev ? { ...prev, state: res.state } : null));
            }
        }
        catch (err) {
            console.error('Lỗi khi gửi lệnh điều khiển:', err);
        }
    }, [sessionId, activeRun]);
    // 4. Hàm kết thúc hoạt động
    const handleEndActivity = useCallback(async () => {
        if (!activeRun || !sessionId)
            return;
        try {
            await api.endActivity(sessionId, activeRun.runId);
            setIsActivityEnded(true);
        }
        catch (err) {
            console.error('Lỗi khi kết thúc hoạt động:', err);
        }
    }, [sessionId, activeRun]);
    // 5. Quản lý toàn màn hình (F11 / Fullscreen)
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement
                .requestFullscreen()
                .then(() => setIsFullscreen(true))
                .catch(() => { });
        }
        else {
            document
                .exitFullscreen()
                .then(() => setIsFullscreen(false))
                .catch(() => { });
        }
    };
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(Boolean(document.fullscreenElement));
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);
    // Lấy plugin hiển thị tương ứng từ Registry
    const plugin = activeRun
        ? getActivityPlugin(activeRun.activityId)
        : undefined;
    const PluginComponent = plugin?.component;
    const isQuizizzActivity = activeRun?.activityId === 'quiz-live' &&
        activeRun?.state?.mode === 'quizizz';
    const isSwissDuelActivity = activeRun?.activityId === 'swiss-duel';
    const isFactionDuelActivity = activeRun?.activityId === 'faction-duel';
    const isFullScreenActivity = activeRun?.activityId === 'object-camera' ||
        isQuizizzActivity ||
        isSwissDuelActivity ||
        isFactionDuelActivity;
    const isDarkActivity = activeRun?.activityId === 'object-camera' ||
        isQuizizzActivity ||
        isSwissDuelActivity ||
        isFactionDuelActivity;
    return (_jsxs("div", { className: `h-screen w-screen overflow-hidden flex flex-col font-sans selection:bg-blue-500 selection:text-white ${isSwissDuelActivity
            ? 'bg-[#150c06] text-[#f4ecd8]'
            : isDarkActivity
                ? 'bg-[#0a0718] text-slate-100'
                : 'bg-slate-100 text-slate-800'}`, children: [_jsxs("header", { className: `h-12 md:h-14 px-3 md:px-4 flex items-center justify-between shadow-md shrink-0 select-none border-b ${isSwissDuelActivity
                    ? 'bg-[#1e1107] text-[#f4ecd8] border-[#4a2b15]'
                    : 'bg-slate-900 text-white border-slate-800'}`, children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "text-xl md:text-2xl", children: plugin?.icon || '🎮' }), _jsxs("div", { children: [_jsxs("h1", { className: "text-xs md:text-sm font-black tracking-wide text-white flex items-center gap-2", children: [_jsx("span", { children: plugin?.name || (activeRun ? activeRun.activityId : 'Cửa sổ Tiện ích') }), _jsx("span", { className: `text-[9px] md:text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${isSwissDuelActivity
                                                    ? 'bg-amber-600/40 text-amber-200 border border-amber-400/50'
                                                    : 'bg-blue-600/60 text-blue-100 border border-blue-400/40'}`, children: "C\u1EEDa s\u1ED5 \u0110\u1ED9c l\u1EADp" })] }), _jsxs("div", { className: `text-[10px] md:text-[11px] flex items-center gap-2 ${isSwissDuelActivity ? 'text-amber-200/70' : 'text-slate-400'}`, children: [_jsx("span", { className: `w-2 h-2 rounded-full inline-block ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}` }), _jsx("span", { children: isConnected ? 'Đang kết nối thời gian thực' : 'Mất kết nối máy chủ' })] })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { type: "button", onClick: toggleFullscreen, className: `px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${isSwissDuelActivity
                                    ? 'bg-[#2a170c] hover:bg-[#382012] text-amber-200 border-[#5e381d]'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'}`, title: "B\u1EADt/T\u1EAFt To\u00E0n m\u00E0n h\u00ECnh khi tr\u00ECnh chi\u1EBFu", children: [_jsx("span", { children: isFullscreen ? '🗗' : '⛶' }), _jsx("span", { children: isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình (F11)' })] }), _jsxs("button", { type: "button", onClick: () => window.close(), className: "px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer", title: "\u0110\u00F3ng c\u1EEDa s\u1ED5 n\u00E0y", children: [_jsx("span", { children: "\u2715" }), _jsx("span", { children: "\u0110\u00F3ng" })] })] })] }), (() => {
                return (_jsx("main", { className: `flex-1 flex flex-col min-h-0 ${isFullScreenActivity ? 'p-0 overflow-hidden' : 'p-4 md:p-6 overflow-y-auto'}`, children: isLoading ? (_jsxs("div", { className: "flex-1 flex flex-col items-center justify-center text-center p-8", children: [_jsx("div", { className: "w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" }), _jsx("h2", { className: "text-base font-bold text-slate-700", children: "\u0110ang kh\u1EDFi t\u1EA1o c\u1EEDa s\u1ED5 ho\u1EA1t \u0111\u1ED9ng..." }), _jsx("p", { className: "text-xs text-slate-500 mt-1", children: "\u0110ang k\u1EBFt n\u1ED1i d\u1EEF li\u1EC7u phi\u00EAn h\u1ECDc v\u1EDBi m\u00E1y ch\u1EE7" })] })) : errorMsg ? (_jsxs("div", { className: "flex-1 flex flex-col items-center justify-center text-center p-8", children: [_jsx("span", { className: "text-5xl mb-3", children: "\u26A0\uFE0F" }), _jsx("h2", { className: "text-lg font-bold text-rose-600", children: errorMsg }), _jsxs("div", { className: "mt-4 flex gap-3", children: [_jsx("button", { type: "button", onClick: initSessionData, className: "px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition", children: "Th\u1EED k\u1EBFt n\u1ED1i l\u1EA1i" }), _jsx("button", { type: "button", onClick: () => window.close(), className: "px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-300 transition", children: "\u0110\u00F3ng c\u1EEDa s\u1ED5" })] })] })) : isActivityEnded || !activeRun ? (_jsxs("div", { className: "flex-1 flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-xl mx-auto my-auto w-full", children: [_jsx("span", { className: "text-6xl mb-3", children: "\uD83C\uDFC1" }), _jsx("h2", { className: "text-xl font-black text-slate-800", children: "Ho\u1EA1t \u0111\u1ED9ng \u0111\u00E3 k\u1EBFt th\u00FAc!" }), _jsx("p", { className: "text-sm text-slate-500 mt-2 max-w-md", children: "To\u00E0n b\u1ED9 k\u1EBFt qu\u1EA3 v\u00E0 \u0111i\u1EC3m th\u01B0\u1EDFng EXP \u0111\u00E3 \u0111\u01B0\u1EE3c ghi nh\u1EADn t\u1EF1 \u0111\u1ED9ng v\u00E0o b\u00E1o c\u00E1o ti\u1EBFt h\u1ECDc tr\u00EAn m\u00E1y ch\u1EE7." }), _jsx("div", { className: "mt-6 flex gap-3", children: _jsx("button", { type: "button", onClick: () => window.close(), className: "px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black transition shadow-sm cursor-pointer", children: "\u2715 \u0110\u00F3ng c\u1EEDa s\u1ED5 n\u00E0y" }) })] })) : PluginComponent ? (_jsx("div", { className: `flex-1 w-full flex flex-col min-h-0 ${isFullScreenActivity ? 'h-full' : 'max-w-7xl mx-auto'}`, children: _jsx(ErrorBoundary, { fallback: error => (_jsxs("div", { className: "flex-1 flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border border-rose-200 shadow-sm my-auto", children: [_jsx("span", { className: "text-5xl mb-3", children: "\u26A0\uFE0F" }), _jsxs("h2", { className: "text-lg font-bold text-rose-600", children: ["Kh\u00F4ng th\u1EC3 hi\u1EC3n th\u1ECB giao di\u1EC7n ho\u1EA1t \u0111\u1ED9ng: ", activeRun.activityId] }), _jsx("p", { className: "text-xs text-slate-500 mt-2 max-w-md font-mono bg-rose-50 p-2.5 rounded-lg border border-rose-100", children: error?.message || String(error) }), _jsxs("div", { className: "mt-4 flex gap-3", children: [_jsx("button", { type: "button", onClick: () => window.location.reload(), className: "px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition", children: "\uD83D\uDD04 T\u1EA3i l\u1EA1i c\u1EEDa s\u1ED5" }), _jsx("button", { type: "button", onClick: () => window.close(), className: "px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-300 transition", children: "\u0110\u00F3ng c\u1EEDa s\u1ED5" })] })] })), children: _jsx(PluginComponent, { runId: activeRun.runId, sessionId: sessionId, state: activeRun.state, onSendIntent: handleSendIntent, onEndActivity: handleEndActivity }) }) })) : (_jsxs("div", { className: "flex-1 flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm", children: [_jsx("span", { className: "text-5xl mb-3", children: "\uD83D\uDCE6" }), _jsxs("h2", { className: "text-lg font-bold text-slate-800", children: ["Ho\u1EA1t \u0111\u1ED9ng: ", activeRun.activityId] }), _jsx("p", { className: "text-sm text-slate-500 mt-1 max-w-md", children: "Ch\u01B0a t\u00ECm th\u1EA5y module hi\u1EC3n th\u1ECB ri\u00EAng bi\u1EC7t cho ho\u1EA1t \u0111\u1ED9ng n\u00E0y trong h\u1EC7 th\u1ED1ng plugin." }), _jsx("button", { type: "button", onClick: handleEndActivity, className: "mt-4 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition", children: "K\u1EBFt th\u00FAc ho\u1EA1t \u0111\u1ED9ng" })] })) }));
            })()] }));
};
//# sourceMappingURL=ActivityHostWindow.js.map