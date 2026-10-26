import React, { useState, useEffect, useCallback } from 'react';
import type { ArcadeDuelConfig, ArcadeDuelState } from '../arcade-duel-schemas.js';
import {
  initArcadeDuelState,
  handleOptionSelection,
  handleUsePowerUp,
  advanceToNextSyncQuestion,
  determineWinner,
} from '../arcade-duel-logic.js';
import { useArcadeKeyboard } from '../hooks/useArcadeKeyboard.js';
import { SyncTurnView } from './SyncTurnView.js';
import { SpeedRaceView } from './SpeedRaceView.js';

export interface ArcadeDuelTeacherPanelProps {
  runId: string;
  config?: ArcadeDuelConfig | undefined;
  initialState?: ArcadeDuelState | undefined;
  onSendIntent?: ((intent: unknown) => void) | undefined;
  onEndActivity?: (() => void) | undefined;
}

export const ArcadeDuelTeacherPanel: React.FC<ArcadeDuelTeacherPanelProps> = ({
  config,
  initialState,
  onEndActivity,
}) => {
  const [gameState, setGameState] = useState<ArcadeDuelState>(() => {
    if (initialState) return initialState;
    if (config) return initArcadeDuelState(config);

    // Dữ liệu mẫu khởi tạo an toàn
    const fallbackConfig: ArcadeDuelConfig = {
      title: 'Đối Kháng 1vs1',
      mode: 'sync_turn',
      questions: [
        {
          id: 'q1',
          stem: 'Thủ đô của nước Cộng hòa Xã hội Chủ nghĩa Việt Nam là gì?',
          options: ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Cần Thơ'],
          correctAnswer: 0,
          points: 100,
        },
      ],
      timeLimitPerQuestion: 15,
      totalTimeLimit: 90,
      shuffleOptions: true,
      enablePowerUps: true,
      keyBindings: {
        blueKeys: {
          option1: 'KeyA',
          option2: 'KeyS',
          option3: 'KeyD',
          option4: 'KeyF',
          powerUp: 'KeyQ',
        },
        redKeys: {
          option1: 'Digit1',
          option2: 'Digit2',
          option3: 'Digit3',
          option4: 'Digit4',
          powerUp: 'Digit5',
        },
      },
      inventoryCapacity: 2,
      dropCondition: 2,
      freezePenaltyMs: 1500,
      blueTeamName: 'Đội Xanh',
      redTeamName: 'Đội Đỏ',
    };
    return initArcadeDuelState(fallbackConfig);
  });

  // Xử lý chọn phương án
  const handleSelectOption = useCallback(
    (teamId: 'blue' | 'red', optionIndex: number) => {
      setGameState(prev => handleOptionSelection(prev, teamId, optionIndex));
    },
    []
  );

  // Xử lý dùng vật phẩm
  const handleActivatePowerUp = useCallback((teamId: 'blue' | 'red') => {
    setGameState(prev => handleUsePowerUp(prev, teamId));
  }, []);

  // Chuyển câu hỏi (ở chế độ Sync Turn)
  const handleNextSyncQuestion = useCallback(() => {
    setGameState(prev => advanceToNextSyncQuestion(prev));
  }, []);

  // Hook bàn phím lắng nghe sự kiện
  useArcadeKeyboard({
    enabled: gameState.status !== 'finished',
    keyBindings: gameState.config.keyBindings,
    onSelectOption: handleSelectOption,
    onUsePowerUp: handleActivatePowerUp,
  });

  // Timer đồng hồ đếm ngược
  useEffect(() => {
    if (gameState.status === 'finished') return;

    const timer = setInterval(() => {
      setGameState(prev => {
        if (prev.status === 'finished') return prev;

        // Ở chế độ Cùng trả lời (Sync Turn): đếm ngược thời gian của câu
        if (prev.mode === 'sync_turn') {
          if (prev.status === 'in_question') {
            if (prev.timeRemaining <= 1) {
              // Hết giờ câu hỏi -> Tự động lật bài
              return {
                ...prev,
                status: 'question_review',
                timeRemaining: 0,
              };
            }
            return {
              ...prev,
              timeRemaining: prev.timeRemaining - 1,
            };
          }
          return prev;
        }

        // Ở chế độ Đua tốc độ (Speed Race): đếm ngược tổng thời gian trận
        if (prev.mode === 'speed_race') {
          if (prev.timeRemaining <= 1) {
            // Hết giờ -> Kết thúc trận đấu
            return {
              ...prev,
              status: 'finished',
              timeRemaining: 0,
              winnerTeamId: determineWinner(prev.bluePlayer.score, prev.redPlayer.score),
            };
          }
          return {
            ...prev,
            timeRemaining: prev.timeRemaining - 1,
          };
        }

        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.status, gameState.mode]);

  return (
    <div className="relative w-full h-[calc(100vh-140px)] min-h-[560px] rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
      {gameState.mode === 'sync_turn' ? (
        <SyncTurnView
          state={gameState}
          onSelectOption={handleSelectOption}
          onUsePowerUp={handleActivatePowerUp}
          onNextQuestion={handleNextSyncQuestion}
        />
      ) : (
        <SpeedRaceView
          state={gameState}
          onSelectOption={handleSelectOption}
          onUsePowerUp={handleActivatePowerUp}
        />
      )}

      {/* POPUP KẾT THÚC TRẬN ĐẤU */}
      {gameState.status === 'finished' && (
        <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
          <div className="max-w-md w-full bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 text-center shadow-2xl shadow-indigo-500/20">
            <span className="text-6xl mb-3 block">🏆</span>
            <h2 className="text-2xl font-black text-white">TRẬN ĐẤU KẾT THÚC!</h2>

            <div className="my-5 p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
              <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">
                KẾT QUẢ CHUNG CUỘC
              </p>
              {gameState.winnerTeamId === 'draw' ? (
                <div className="text-2xl font-extrabold text-amber-300">
                  🤝 KẾT QUẢ HÒA!
                </div>
              ) : gameState.winnerTeamId === 'blue' ? (
                <div className="text-2xl font-extrabold text-blue-400">
                  🎉 {gameState.bluePlayer.teamName} CHIẾN THẮNG!
                </div>
              ) : (
                <div className="text-2xl font-extrabold text-red-400">
                  🎉 {gameState.redPlayer.teamName} CHIẾN THẮNG!
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-slate-700/60 font-mono">
                <div>
                  <p className="text-xs text-blue-300 font-bold">
                    {gameState.bluePlayer.teamName}
                  </p>
                  <p className="text-2xl font-black text-blue-400">
                    {gameState.bluePlayer.score}đ
                  </p>
                </div>
                <div>
                  <p className="text-xs text-red-300 font-bold">
                    {gameState.redPlayer.teamName}
                  </p>
                  <p className="text-2xl font-black text-red-400">
                    {gameState.redPlayer.score}đ
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={onEndActivity}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-base shadow-lg shadow-indigo-500/30 transition-transform active:scale-98"
            >
              Hoàn tất & Đóng trận đấu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
