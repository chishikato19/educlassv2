import type { ActivityContext, ActivityDefinition } from '@educlass/core';
import type { ActivityReject } from '@educlass/protocol';
import {
  type TerritoryQuestion,
  type TerritoryParticipant,
  TerritoryStudentIntentSchema,
  TerritoryTeacherIntentSchema,
  type TerritoryWarConfig,
  TerritoryWarConfigSchema,
  type TerritoryWarResult,
  TerritoryWarResultSchema,
  type TerritoryWarState,
  TerritoryWarStateSchema,
} from './territory-schemas.js';
import {
  applyAttackToCell,
  calculateScoresAndDominance,
  canTeamTargetCell,
  checkSuddenDeath,
  checkTerritoryAnswerCorrectness,
  generateMapCells,
  shuffleList,
} from './territory-logic.js';

// Lưu trữ danh sách câu hỏi gốc đầy đủ đáp án theo từng runId
const activeRunQuestions = new Map<string, TerritoryQuestion[]>();

/**
 * Loại bỏ đáp án đúng trước khi phát tán xuống máy học sinh
 */
function stripQuestionAnswer(
  question: TerritoryQuestion,
  shuffleAnswers: boolean,
  rng: () => number
): { publicQuestion: TerritoryQuestion; originalQuestion: TerritoryQuestion } {
  let publicOptions = question.options ? [...question.options] : undefined;
  if (shuffleAnswers && publicOptions && publicOptions.length > 0) {
    publicOptions = shuffleList(publicOptions, rng);
  }

  const publicQuestion: TerritoryQuestion = {
    ...question,
    options: publicOptions,
    correctAnswer: undefined,
    explanation: undefined,
  };

  return { publicQuestion, originalQuestion: question };
}

export const TerritoryWarActivity: ActivityDefinition<
  TerritoryWarConfig,
  TerritoryWarState,
  TerritoryWarResult
> = {
  id: 'territory-war',
  name: 'Đại Chiến Lãnh Thổ',
  version: 1,
  icon: '🏰',
  description: 'Trò chơi tranh đoạt lãnh thổ chiến thuật chia 2 phe Xanh - Đỏ thời gian thực',
  capabilities: [],
  rewardTriggers: [
    'correct_answer',
    'capture_cell',
    'fortify_cell',
    'win_battle',
    'top_commander',
    'finish',
  ],

  configSchema: TerritoryWarConfigSchema,
  stateSchema: TerritoryWarStateSchema,
  resultSchema: TerritoryWarResultSchema,

  server: {
    onStart(ctx: ActivityContext, cfg: TerritoryWarConfig): TerritoryWarState {
      // 1. Lưu kho câu hỏi cho run hiện tại
      const questions = cfg.questions.length > 0 ? cfg.questions : [
        {
          id: 'sample_1',
          stem: 'Thủ đô của Việt Nam là thành phố nào?',
          type: 'mcq4' as const,
          options: ['Hà Nội', 'Đà Nẵng', 'TP. Hồ Chí Minh', 'Cần Thơ'],
          correctAnswer: 'Hà Nội',
          timeLimit: 30,
        },
        {
          id: 'sample_2',
          stem: '2 + 2 x 2 bằng bao nhiêu?',
          type: 'mcq4' as const,
          options: ['6', '8', '4', '10'],
          correctAnswer: '6',
          timeLimit: 30,
        },
        {
          id: 'sample_3',
          stem: 'Mặt trời mọc ở hướng Đông, lặn ở hướng Tây.',
          type: 'tf' as const,
          correctAnswer: true,
          timeLimit: 30,
        },
      ];
      activeRunQuestions.set(ctx.runId, questions);

      // 2. Tạo bản đồ theo kích thước đã chọn
      const cells = generateMapCells(cfg.mapSize);
      const totalCells = Object.keys(cells).length;

      // 3. Khởi tạo danh sách quân đội hai phe ban đầu nếu có truyền từ cấu hình
      const participants: Record<string, TerritoryParticipant> = {};
      if (cfg.initialParticipants && cfg.initialParticipants.length > 0) {
        for (const initP of cfg.initialParticipants) {
          participants[initP.id] = {
            participantId: initP.id,
            displayName: initP.displayName,
            team: initP.team,
            groupName: initP.groupName ?? null,
            capturedCount: 0,
            fortifiedCount: 0,
            correctCount: 0,
            totalQuestions: 0,
            streak: 0,
            currentLockCellId: null,
            cooldownUntil: null,
          };
        }
      }

      // 4. Tính điểm ban đầu cho căn cứ 2 phe
      const dominance = calculateScoresAndDominance(cells, cfg);

      const endTime = cfg.timeLimitMinutes > 0 ? ctx.now() + cfg.timeLimitMinutes * 60 * 1000 : null;

      return {
        title: cfg.title || 'Đại Chiến Lãnh Thổ',
        status: 'waiting', // Chờ GV bấm Bắt đầu (hoặc chia đội)
        mapSize: cfg.mapSize,
        cells,
        participants,
        blueScore: dominance.blueScore,
        redScore: dominance.redScore,
        blueCellCount: dominance.blueCellCount,
        redCellCount: dominance.redCellCount,
        totalCells,
        enableSuddenDeath: cfg.enableSuddenDeath ?? false,
        winnerTeam: null,
        winReason: null,
        startedAt: ctx.now(),
        endTime,
        logs: [
          {
            id: `log_${ctx.now()}`,
            text: '⚔️ Trận địa đã được thiết lập! Đang tập hợp quân đội hai phe...',
            team: 'neutral',
            ts: ctx.now(),
          },
        ],
      };
    },

    onStudentIntent(
      ctx: ActivityContext,
      st: TerritoryWarState,
      participantId: string,
      intent: unknown
    ): TerritoryWarState | ActivityReject {
      const parsed = TerritoryStudentIntentSchema.safeParse(intent);
      if (!parsed.success) {
        return { ok: false, reason: 'Giao thức intent học sinh không hợp lệ' };
      }

      // Đảm bảo học sinh đã có thông tin trong danh sách
      let participant = st.participants[participantId];
      if (!participant) {
        // Tự động phân đội cân bằng nếu học sinh vào sau
        const blueCount = Object.values(st.participants).filter(p => p.team === 'blue').length;
        const redCount = Object.values(st.participants).filter(p => p.team === 'red').length;
        const assignedTeam = blueCount <= redCount ? 'blue' : 'red';
        participant = {
          participantId,
          displayName: `Chiến binh ${Object.keys(st.participants).length + 1}`,
          team: assignedTeam,
          groupName: null,
          capturedCount: 0,
          fortifiedCount: 0,
          correctCount: 0,
          totalQuestions: 0,
          streak: 0,
          currentLockCellId: null,
          cooldownUntil: null,
        };
        st.participants[participantId] = participant;
      }

      const cfg: TerritoryWarConfig = {
        title: st.title,
        mapSize: st.mapSize,
        timeLimitMinutes: 5,
        enableSuddenDeath: st.enableSuddenDeath ?? false,
        shuffleQuestions: true,
        shuffleAnswers: true,
        allowLoopQuestions: true,
        questions: activeRunQuestions.get(ctx.runId) || [],
        initialParticipants: [],
        pointsPlain: 1,
        pointsWatchtower: 5,
        pointsSmallCastle: 10,
        pointsBigCastle: 20,
        pointsReinforce: 1,
      };

      const now = ctx.now();

      // Kiểm tra hết giờ trận đấu
      if (st.status === 'in_progress' && st.endTime && now >= st.endTime) {
        st.status = 'finished';
        if (st.blueScore > st.redScore) {
          st.winnerTeam = 'blue';
          st.winReason = 'Hết thời gian! Phe Xanh dẫn trước về tổng điểm lãnh thổ.';
        } else if (st.redScore > st.blueScore) {
          st.winnerTeam = 'red';
          st.winReason = 'Hết thời gian! Phe Đỏ dẫn trước về tổng điểm lãnh thổ.';
        } else {
          st.winnerTeam = 'draw';
          st.winReason = 'Hết thời gian! Hai phe hòa điểm.';
        }
        return { ...st };
      }

      const action = parsed.data;

      switch (action.type) {
        case 'lock_cell': {
          if (st.status !== 'in_progress') {
            return { ok: false, reason: 'Trận chiến chưa bắt đầu hoặc đã kết thúc' };
          }

          // Kiểm tra thời gian hồi chiêu
          if (participant.cooldownUntil && now < participant.cooldownUntil) {
            const remainSec = Math.ceil((participant.cooldownUntil - now) / 1000);
            return { ok: false, reason: `Đang hồi quân, vui lòng chờ ${remainSec}s nữa!` };
          }

          // Kiểm tra xem học sinh có đang giữ ô nào khác không
          if (participant.currentLockCellId && participant.currentLockCellId !== action.cellId) {
            const oldCell = st.cells[participant.currentLockCellId];
            if (oldCell && oldCell.lockedBy?.participantId === participantId) {
              oldCell.lockedBy = null;
            }
          }

          const targetCell = st.cells[action.cellId];
          if (!targetCell) {
            return { ok: false, reason: 'Ô mục tiêu không tồn tại' };
          }

          // Kiểm tra ô có đang bị ai khóa không
          if (targetCell.lockedBy) {
            if (targetCell.lockedBy.participantId !== participantId && targetCell.lockedBy.expiresAt > now) {
              return {
                ok: false,
                reason: `${targetCell.lockedBy.displayName} (${targetCell.lockedBy.team === 'blue' ? 'Phe Xanh' : 'Phe Đỏ'}) đang giao tranh ô này!`,
              };
            }
          }

          // Kiểm tra quy tắc di chuyển liền kề 4 hướng hoặc gia cố
          const targetCheck = canTeamTargetCell(st.cells, participant.team, action.cellId);
          if (!targetCheck.allowed) {
            return { ok: false, reason: targetCheck.reason || 'Không thể chọn ô này' };
          }

          // Chọn ngẫu nhiên 1 câu hỏi từ kho
          const qList = activeRunQuestions.get(ctx.runId) || [];
          if (qList.length === 0) {
            return { ok: false, reason: 'Kho câu hỏi rỗng' };
          }
          const randomIdx = Math.floor(ctx.rng() * qList.length);
          const rawQ = qList[randomIdx]!;
          const { publicQuestion } = stripQuestionAnswer(rawQ, true, ctx.rng);

          targetCell.lockedBy = {
            participantId,
            displayName: participant.displayName,
            team: participant.team,
            expiresAt: now + 30000, // 30s trả lời
            question: publicQuestion,
          };
          participant.currentLockCellId = action.cellId;

          return { ...st };
        }

        case 'submit_answer': {
          if (st.status !== 'in_progress') {
            return { ok: false, reason: 'Trận chiến chưa bắt đầu hoặc đã kết thúc' };
          }

          const cell = st.cells[action.cellId];
          if (!cell || !cell.lockedBy || cell.lockedBy.participantId !== participantId) {
            return { ok: false, reason: 'Bạn không còn quyền giao tranh ô này hoặc đã hết giờ' };
          }

          // Lấy câu hỏi gốc
          const qId = cell.lockedBy.question?.id;
          const qList = activeRunQuestions.get(ctx.runId) || [];
          const originalQ = qList.find(q => q.id === qId) || qList[0]!;

          const isCorrect = checkTerritoryAnswerCorrectness(originalQ, action.answer);

          // Xử lý đòn công phá / gia cố
          const { cell: updatedCell, event } = applyAttackToCell(
            cell,
            participant.team,
            isCorrect
          );
          updatedCell.lockedBy = null;
          st.cells[action.cellId] = updatedCell;
          participant.currentLockCellId = null;
          participant.totalQuestions += 1;

          const teamTag = participant.team === 'blue' ? '🔵 Phe Xanh' : '🔴 Phe Đỏ';

          if (isCorrect) {
            participant.correctCount += 1;
            participant.streak += 1;
            void ctx.grantReward(participantId, 'correct_answer', 10);

            if (event === 'captured') {
              participant.capturedCount += 1;
              void ctx.grantReward(participantId, 'capture_cell', 20);
              const terrainName =
                cell.terrain === 'big_castle'
                  ? 'Đại Bản Doanh Lâu Đài Lớn'
                  : cell.terrain === 'small_castle'
                  ? 'Lâu Đài Nhỏ'
                  : cell.terrain === 'watchtower'
                  ? 'Tháp Canh'
                  : 'Vùng Đất';
              st.logs.unshift({
                id: `log_${now}_${participantId}`,
                text: `🔥 [CHIẾM THÀNH] ${participant.displayName} (${teamTag}) đã đánh chiếm thành công ${terrainName}!`,
                team: participant.team,
                ts: now,
              });
            } else if (event === 'fortified') {
              participant.fortifiedCount += 1;
              void ctx.grantReward(participantId, 'fortify_cell', 10);
              st.logs.unshift({
                id: `log_${now}_${participantId}`,
                text: `🛡️ [GIA CỐ] ${participant.displayName} (${teamTag}) đã gia cố thêm giáp phòng thủ (+1đ)!`,
                team: participant.team,
                ts: now,
              });
            } else {
              st.logs.unshift({
                id: `log_${now}_${participantId}`,
                text: `⚔️ [TẤN CÔNG] ${participant.displayName} (${teamTag}) đã công phá thành công 1 lớp máu/giáp!`,
                team: participant.team,
                ts: now,
              });
            }
          } else {
            // Trả lời sai
            participant.streak = 0;
            participant.cooldownUntil = now + 3000; // Phạt hồi chiêu 3 giây
            st.logs.unshift({
              id: `log_${now}_${participantId}`,
              text: `⚠️ [THẤT BẠI] ${participant.displayName} (${teamTag}) tấn công thất bại (bị phạt 3s hồi chiêu)!`,
              team: participant.team,
              ts: now,
            });
          }

          // Giới hạn nhật ký 20 sự kiện gần nhất
          if (st.logs.length > 20) {
            st.logs = st.logs.slice(0, 20);
          }

          // Cập nhật lại điểm số và phần trăm đất
          const dominance = calculateScoresAndDominance(st.cells, cfg);
          st.blueScore = dominance.blueScore;
          st.redScore = dominance.redScore;
          st.blueCellCount = dominance.blueCellCount;
          st.redCellCount = dominance.redCellCount;

          // Kiểm tra Sudden Death
          const suddenCheck = checkSuddenDeath(st.cells, cfg.enableSuddenDeath);
          if (suddenCheck.triggered) {
            st.status = 'finished';
            st.winnerTeam = suddenCheck.winner;
            st.winReason = suddenCheck.reason;
            st.logs.unshift({
              id: `log_win_${now}`,
              text: `👑 [SUDDEN DEATH] ${suddenCheck.reason}`,
              team: suddenCheck.winner ?? 'neutral',
              ts: now,
            });
          }

          return { ...st };
        }

        case 'cancel_cell': {
          const cell = st.cells[action.cellId];
          if (cell && cell.lockedBy?.participantId === participantId) {
            cell.lockedBy = null;
          }
          if (participant.currentLockCellId === action.cellId) {
            participant.currentLockCellId = null;
          }
          return { ...st };
        }

        default:
          return st;
      }
    },

    onTeacherIntent(
      ctx: ActivityContext,
      st: TerritoryWarState,
      intent: unknown
    ): TerritoryWarState {
      const parsed = TerritoryTeacherIntentSchema.safeParse(intent);
      if (!parsed.success) return st;

      const action = parsed.data;
      const now = ctx.now();

      switch (action.type) {
        case 'start_game': {
          const defaultMinutes = 5;
          return {
            ...st,
            status: 'in_progress',
            startedAt: now,
            endTime: now + defaultMinutes * 60 * 1000,
            winnerTeam: null,
            winReason: null,
            logs: [
              {
                id: `log_${now}`,
                text: '📢 TIẾNG KÈN XUNG TRẬN ĐÃ VANG LÊN! TRẬN ĐẠI CHIẾN BẮT ĐẦU!',
                team: 'neutral',
                ts: now,
              },
              ...st.logs,
            ],
          };
        }

        case 'finish_game': {
          let winner: 'blue' | 'red' | 'draw' = 'draw';
          let reason = 'Trận chiến kết thúc do giáo viên ra hiệu lệnh!';
          if (st.blueScore > st.redScore) {
            winner = 'blue';
            reason = 'Chiến thắng vang dội thuộc về PHE XANH!';
          } else if (st.redScore > st.blueScore) {
            winner = 'red';
            reason = 'Chiến thắng vang dội thuộc về PHE ĐỎ!';
          } else {
            reason = 'Hai phe bất phân thắng bại (Hòa điểm)!';
          }

          // Trao thưởng EXP khi kết thúc
          for (const p of Object.values(st.participants)) {
            if (p.team === winner) {
              void ctx.grantReward(p.participantId, 'win_battle', 30);
            }
            void ctx.grantReward(p.participantId, 'finish', 10);
          }

          return {
            ...st,
            status: 'finished',
            winnerTeam: winner,
            winReason: reason,
          };
        }

        case 'assign_team': {
          const p = st.participants[action.participantId];
          if (p) {
            p.team = action.team;
          }
          return { ...st };
        }

        case 'assign_group_team': {
          for (const p of Object.values(st.participants)) {
            if (p.groupName === action.groupName) {
              p.team = action.team;
            }
          }
          return { ...st };
        }

        case 'auto_balance_teams': {
          const pList = Object.values(st.participants);
          pList.forEach((p, idx) => {
            p.team = idx % 2 === 0 ? 'blue' : 'red';
          });
          return { ...st };
        }

        case 'swap_teams': {
          for (const p of Object.values(st.participants)) {
            p.team = p.team === 'blue' ? 'red' : 'blue';
          }
          return { ...st };
        }

        case 'add_time': {
          const extraMs = action.minutes * 60 * 1000;
          const base = Math.max(now, st.endTime ?? now);
          return {
            ...st,
            endTime: base + extraMs,
            status: st.status === 'finished' ? 'in_progress' : st.status,
          };
        }

        case 'reset_game': {
          const cells = generateMapCells(st.mapSize);
          const totalCells = Object.keys(cells).length;
          const dominance = calculateScoresAndDominance(cells, {
            title: st.title,
            mapSize: st.mapSize,
            timeLimitMinutes: 5,
            enableSuddenDeath: true,
            shuffleQuestions: true,
            shuffleAnswers: true,
            allowLoopQuestions: true,
            questions: [],
            pointsPlain: 1,
            pointsWatchtower: 5,
            pointsSmallCastle: 10,
            pointsBigCastle: 20,
            pointsReinforce: 1,
            initialParticipants: [],
          });

          return {
            ...st,
            status: 'waiting',
            cells,
            blueScore: dominance.blueScore,
            redScore: dominance.redScore,
            blueCellCount: dominance.blueCellCount,
            redCellCount: dominance.redCellCount,
            totalCells,
            winnerTeam: null,
            winReason: null,
            startedAt: now,
            endTime: null,
            logs: [
              {
                id: `log_${now}`,
                text: '🔄 Bản đồ chiến sự đã được thiết lập lại từ đầu.',
                team: 'neutral',
                ts: now,
              },
            ],
          };
        }

        default:
          return st;
      }
    },

    onEnd(
      ctx: ActivityContext,
      st: TerritoryWarState
    ): TerritoryWarResult[] {
      const winner = st.winnerTeam;

      const results = Object.values(st.participants).map(p => {
        const pointsContributed = p.capturedCount * 5 + p.fortifiedCount * 2 + p.correctCount;
        const isWinner = p.team === winner;

        if (isWinner) {
          void ctx.grantReward(p.participantId, 'win_battle', 30);
        }
        void ctx.grantReward(p.participantId, 'finish', 10);

        return {
          participantId: p.participantId,
          displayName: p.displayName,
          team: p.team,
          capturedCount: p.capturedCount,
          fortifiedCount: p.fortifiedCount,
          correctCount: p.correctCount,
          pointsContributed,
          isWinner,
          rank: 1, // Sẽ tính thứ hạng ngay dưới
        };
      });

      // Sắp xếp thứ hạng theo điểm đóng góp
      results.sort((a, b) => b.pointsContributed - a.pointsContributed);
      results.forEach((r, idx) => {
        r.rank = idx + 1;
        if (idx === 0) {
          void ctx.grantReward(r.participantId, 'top_commander', 50);
        } else if (idx === 1) {
          void ctx.grantReward(r.participantId, 'top_commander', 30);
        } else if (idx === 2) {
          void ctx.grantReward(r.participantId, 'top_commander', 20);
        }
      });

      activeRunQuestions.delete(ctx.runId);

      return results;
    },
  },
};
