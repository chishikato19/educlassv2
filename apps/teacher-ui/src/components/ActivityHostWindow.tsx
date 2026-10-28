import React, { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import { getActivityPlugin, type ActivityHostPlugin } from '../activities/index.js';
import { ErrorBoundary } from './ErrorBoundary.js';

export const ActivityHostWindow: React.FC = () => {
  const [sessionId, setSessionId] = useState<string>('');
  const [activeRun, setActiveRun] = useState<{
    runId: string;
    activityId: string;
    state: unknown;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isActivityEnded, setIsActivityEnded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

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

      const currentAct = await api.getCurrentActivity(
        currentSessId,
        paramRunId ? { runId: paramRunId } : undefined
      );
      if (currentAct && currentAct.run) {
        setActiveRun({
          runId: currentAct.run.id,
          activityId: currentAct.run.activityId,
          state: currentAct.state,
        });
        setIsActivityEnded(false);
      } else {
        setIsActivityEnded(true);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi tải thông tin hoạt động');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void initSessionData();
  }, [initSessionData]);

  // 2. Kết nối WebSocket thời gian thực cho cửa sổ hoạt động
  useEffect(() => {
    if (!sessionId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || 'localhost:3000';
    const wsUrl = `${protocol}//${host}/ws?sessionId=${sessionId}&role=teacher`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      ws.send(
        JSON.stringify({
          v: 1,
          id: 'subwin_init_' + Date.now(),
          type: 'ping',
          sessionId,
          ts: Date.now(),
          payload: { role: 'teacher' },
        })
      );
    };

    ws.onmessage = event => {
      try {
        const envelope = JSON.parse(event.data);
        const type = envelope.type;
        const payload = envelope.payload;

        if (
          type === 'activity_state_patch' ||
          type === 'activity_snapshot' ||
          type === 'activity_state'
        ) {
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
              if (targetRunId && prev.runId !== targetRunId) return prev;
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
        } else if (type === 'activity_ended' || type === 'activity_end') {
          const urlParams = new URLSearchParams(window.location.search);
          const currentParamRunId = urlParams.get('runId');
          const endedRunId = payload?.runId;
          if (currentParamRunId && endedRunId && endedRunId !== currentParamRunId) {
            return;
          }
          setIsActivityEnded(true);
        } else if (type === 'session_closed') {
          setIsActivityEnded(true);
          setErrorMsg('Tiết học đã được kết thúc bởi giáo viên.');
        }
      } catch {
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
  const handleSendIntent = useCallback(
    async (intent: unknown) => {
      if (!activeRun || !sessionId) return;
      try {
        const res = await api.sendTeacherIntent(sessionId, activeRun.runId, intent);
        if (res && res.state) {
          setActiveRun(prev => (prev ? { ...prev, state: res.state } : null));
        }
      } catch (err: unknown) {
        console.error('Lỗi khi gửi lệnh điều khiển:', err);
      }
    },
    [sessionId, activeRun]
  );

  // 4. Hàm kết thúc hoạt động
  const handleEndActivity = useCallback(async () => {
    if (!activeRun || !sessionId) return;
    try {
      await api.endActivity(sessionId, activeRun.runId);
      setIsActivityEnded(true);
    } catch (err: unknown) {
      console.error('Lỗi khi kết thúc hoạt động:', err);
    }
  }, [sessionId, activeRun]);

  // 5. Quản lý toàn màn hình (F11 / Fullscreen)
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
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
  const plugin: ActivityHostPlugin | undefined = activeRun
    ? getActivityPlugin(activeRun.activityId)
    : undefined;

  const PluginComponent = plugin?.component;

  const isQuizizzActivity =
    activeRun?.activityId === 'quiz-live' &&
    (activeRun?.state as { mode?: string } | undefined)?.mode === 'quizizz';

  const isSwissDuelActivity = activeRun?.activityId === 'swiss-duel';
  const isFactionDuelActivity = activeRun?.activityId === 'faction-duel';

  const isFullScreenActivity =
    activeRun?.activityId === 'object-camera' ||
    isQuizizzActivity ||
    isSwissDuelActivity ||
    isFactionDuelActivity;

  const isDarkActivity =
    activeRun?.activityId === 'object-camera' ||
    isQuizizzActivity ||
    isSwissDuelActivity ||
    isFactionDuelActivity;

  return (
    <div
      className={`h-screen w-screen overflow-hidden flex flex-col font-sans selection:bg-blue-500 selection:text-white ${
        isSwissDuelActivity
          ? 'bg-[#150c06] text-[#f4ecd8]'
          : isDarkActivity
            ? 'bg-[#0a0718] text-slate-100'
            : 'bg-slate-100 text-slate-800'
      }`}
    >
      {/* 1. Thanh Header Điều Khiển Cửa Sổ */}
      <header
        className={`h-12 md:h-14 px-3 md:px-4 flex items-center justify-between shadow-md shrink-0 select-none border-b ${
          isSwissDuelActivity
            ? 'bg-[#1e1107] text-[#f4ecd8] border-[#4a2b15]'
            : 'bg-slate-900 text-white border-slate-800'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl md:text-2xl">{plugin?.icon || '🎮'}</span>
          <div>
            <h1 className="text-xs md:text-sm font-black tracking-wide text-white flex items-center gap-2">
              <span>{plugin?.name || (activeRun ? activeRun.activityId : 'Cửa sổ Tiện ích')}</span>
              <span
                className={`text-[9px] md:text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                  isSwissDuelActivity
                    ? 'bg-amber-600/40 text-amber-200 border border-amber-400/50'
                    : 'bg-blue-600/60 text-blue-100 border border-blue-400/40'
                }`}
              >
                Cửa sổ Độc lập
              </span>
            </h1>
            <div
              className={`text-[10px] md:text-[11px] flex items-center gap-2 ${isSwissDuelActivity ? 'text-amber-200/70' : 'text-slate-400'}`}
            >
              <span
                className={`w-2 h-2 rounded-full inline-block ${
                  isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              <span>{isConnected ? 'Đang kết nối thời gian thực' : 'Mất kết nối máy chủ'}</span>
            </div>
          </div>
        </div>

        {/* Các nút tiện ích trên thanh Header */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              isSwissDuelActivity
                ? 'bg-[#2a170c] hover:bg-[#382012] text-amber-200 border-[#5e381d]'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="Bật/Tắt Toàn màn hình khi trình chiếu"
          >
            <span>{isFullscreen ? '🗗' : '⛶'}</span>
            <span>{isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình (F11)'}</span>
          </button>

          <button
            type="button"
            onClick={() => window.close()}
            className="px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="Đóng cửa sổ này"
          >
            <span>✕</span>
            <span>Đóng</span>
          </button>
        </div>
      </header>

      {/* 2. Thân hiển thị nội dung tiện ích */}
      {(() => {
        return (
          <main
            className={`flex-1 flex flex-col min-h-0 ${isFullScreenActivity ? 'p-0 overflow-hidden' : 'p-4 md:p-6 overflow-y-auto'}`}
          >
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                <h2 className="text-base font-bold text-slate-700">
                  Đang khởi tạo cửa sổ hoạt động...
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Đang kết nối dữ liệu phiên học với máy chủ
                </p>
              </div>
            ) : errorMsg ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <span className="text-5xl mb-3">⚠️</span>
                <h2 className="text-lg font-bold text-rose-600">{errorMsg}</h2>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={initSessionData}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
                  >
                    Thử kết nối lại
                  </button>
                  <button
                    type="button"
                    onClick={() => window.close()}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-300 transition"
                  >
                    Đóng cửa sổ
                  </button>
                </div>
              </div>
            ) : isActivityEnded || !activeRun ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-xl mx-auto my-auto w-full">
                <span className="text-6xl mb-3">🏁</span>
                <h2 className="text-xl font-black text-slate-800">Hoạt động đã kết thúc!</h2>
                <p className="text-sm text-slate-500 mt-2 max-w-md">
                  Toàn bộ kết quả và điểm thưởng EXP đã được ghi nhận tự động vào báo cáo tiết học
                  trên máy chủ.
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => window.close()}
                    className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black transition shadow-sm cursor-pointer"
                  >
                    ✕ Đóng cửa sổ này
                  </button>
                </div>
              </div>
            ) : PluginComponent ? (
              <div
                className={`flex-1 w-full flex flex-col min-h-0 ${isFullScreenActivity ? 'h-full' : 'max-w-7xl mx-auto'}`}
              >
                <ErrorBoundary
                  fallback={error => (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border border-rose-200 shadow-sm my-auto">
                      <span className="text-5xl mb-3">⚠️</span>
                      <h2 className="text-lg font-bold text-rose-600">
                        Không thể hiển thị giao diện hoạt động: {activeRun.activityId}
                      </h2>
                      <p className="text-xs text-slate-500 mt-2 max-w-md font-mono bg-rose-50 p-2.5 rounded-lg border border-rose-100">
                        {error?.message || String(error)}
                      </p>
                      <div className="mt-4 flex gap-3">
                        <button
                          type="button"
                          onClick={() => window.location.reload()}
                          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
                        >
                          🔄 Tải lại cửa sổ
                        </button>
                        <button
                          type="button"
                          onClick={() => window.close()}
                          className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-300 transition"
                        >
                          Đóng cửa sổ
                        </button>
                      </div>
                    </div>
                  )}
                >
                  <PluginComponent
                    runId={activeRun.runId}
                    sessionId={sessionId}
                    state={activeRun.state}
                    onSendIntent={handleSendIntent}
                    onEndActivity={handleEndActivity}
                  />
                </ErrorBoundary>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-5xl mb-3">📦</span>
                <h2 className="text-lg font-bold text-slate-800">
                  Hoạt động: {activeRun.activityId}
                </h2>
                <p className="text-sm text-slate-500 mt-1 max-w-md">
                  Chưa tìm thấy module hiển thị riêng biệt cho hoạt động này trong hệ thống plugin.
                </p>
                <button
                  type="button"
                  onClick={handleEndActivity}
                  className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition"
                >
                  Kết thúc hoạt động
                </button>
              </div>
            )}
          </main>
        );
      })()}
    </div>
  );
};
