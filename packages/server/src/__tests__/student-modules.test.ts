import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { buildServer } from '../app.js';
import type { FastifyInstance } from 'fastify';

// Import các module JS đã được tách nhỏ từ student portal
import { state } from '../../public/student/js/state.js';
import { renderMath } from '../../public/student/js/utils.js';
import { getStudentQuizQuestionOrder, resetQuizState } from '../../public/student/js/quiz.js';
import { updateChatLockState, handleIncomingChatMessage } from '../../public/student/js/chat.js';
import { getStudentExamQuestions, getStudentExamOptions } from '../../public/student/js/exam.js';
import { handleSwissDuelUpdate } from '../../public/student/js/swiss.js';
import { handleQuickPollUpdate } from '../../public/student/js/poll.js';
import * as AppExports from '../../public/student/js/app.js';

const __filename = typeof import.meta.url === 'string' ? fileURLToPath(import.meta.url) : '';
const __dirname = __filename ? path.dirname(__filename) : process.cwd();

describe('Student Portal Modular Architecture & Utilities', () => {
  beforeEach(() => {
    // Reset state trước mỗi test
    state.participantId = 'st_123';
    state.studentName = 'Nguyễn Văn An';
    state.studentChatMessages = [];
    state.unreadChatCount = 0;
    state.isStudentChatOpen = false;
    state.currentRunId = null;
    state.swissState = null;
    state.swissAnswers = {};
    state.swissLastRound = 0;
  });

  describe('1. utils.js (renderMath KaTeX Offline)', () => {
    it('trả về chuỗi rỗng khi text falsy', () => {
      expect(renderMath('')).toBe('');
      expect(renderMath(null as unknown as string)).toBe('');
    });

    it('giữ nguyên văn bản thuần khi không có thẻ công thức toán', () => {
      const text = 'Tính diện tích hình tròn có bán kính R';
      expect(renderMath(text)).toBe(text);
    });

    it('thay thế công thức toán học hoặc giữ nguyên định dạng an toàn nếu KaTeX chưa mount trên window', () => {
      const textWithMath = 'Giải phương trình $x^2 + 2x + 1 = 0$';
      const rendered = renderMath(textWithMath);
      expect(rendered).toContain('x^2 + 2x + 1 = 0');
    });
  });

  describe('2. quiz.js (Quiz Question Ordering & State)', () => {
    it('không xáo câu hỏi khi shuffle = false', () => {
      const order = getStudentQuizQuestionOrder(5, false);
      expect(order).toEqual([0, 1, 2, 3, 4]);
    });

    it('xáo trộn câu hỏi ngẫu nhiên và bảo toàn đủ số lượng khi shuffle = true', () => {
      state.myQuizQuestionOrder = null;
      const order = getStudentQuizQuestionOrder(10, true);
      expect(order).toHaveLength(10);
      expect([...order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('resetQuizState đưa trạng thái câu hỏi về mặc định', () => {
      state.currentQuestionIdx = 3;
      state.hasAnsweredCurrentQuestion = true;
      resetQuizState();
      expect(state.currentQuestionIdx).toBe(-1);
      expect(state.hasAnsweredCurrentQuestion).toBe(false);
    });
  });

  describe('3. chat.js (Chat & Help privacy & lock states)', () => {
    it('cập nhật đúng các chế độ khóa chat (locked, teacher_only, open)', () => {
      updateChatLockState(true, 'locked');
      expect(state.currentChatMode).toBe('locked');
      expect(state.isChatLocked).toBe(true);

      updateChatLockState(false, 'teacher_only');
      expect(state.currentChatMode).toBe('teacher_only');
      expect(state.isChatLocked).toBe(false);

      updateChatLockState(false, 'open');
      expect(state.currentChatMode).toBe('open');
      expect(state.isChatLocked).toBe(false);
    });

    it('bảo vệ tin nhắn riêng tư: chỉ nhận tin nhắn của mình hoặc gửi cho mình', () => {
      // Tin nhắn gửi riêng cho học sinh khác (st_999) -> phải bị bỏ qua!
      handleIncomingChatMessage({
        id: 'msg_other',
        text: 'Tin mật của bạn khác',
        toParticipantId: 'st_999',
        fromParticipantId: 'st_888',
      });
      expect(state.studentChatMessages).toHaveLength(0);

      // Tin nhắn gửi riêng cho chính học sinh này (st_123) -> nhận thành công!
      handleIncomingChatMessage({
        id: 'msg_mine',
        text: 'Thầy chào An',
        toParticipantId: 'st_123',
        fromParticipantId: 'teacher_1',
        fromTeacher: true,
      });
      expect(state.studentChatMessages).toHaveLength(1);
      expect(state.studentChatMessages[0]?.text).toBe('Thầy chào An');
      expect(state.unreadChatCount).toBe(1);
    });
  });

  describe('4. exam.js (Exam Question & Option Orders)', () => {
    const mockExamState = {
      title: 'Kiểm tra 15 phút',
      status: 'in_progress',
      publicQuestions: [
        { id: 'q1', type: 'mcq4', stem: 'Câu 1', options: ['A1', 'B1', 'C1', 'D1'] },
        { id: 'q2', type: 'mcq4', stem: 'Câu 2', options: ['A2', 'B2', 'C2', 'D2'] },
        { id: 'q3', type: 'mcq4', stem: 'Câu 3', options: ['A3', 'B3', 'C3', 'D3'] },
      ],
      participants: {
        st_123: {
          questionOrder: ['q3', 'q1', 'q2'],
          optionOrders: {
            q1: [3, 2, 1, 0], // D, C, B, A
          },
        },
      },
    };

    it('sắp xếp danh sách câu hỏi theo questionOrder riêng biệt của học sinh', () => {
      const questions = getStudentExamQuestions(mockExamState);
      expect(questions.map((q: { id: string }) => q.id)).toEqual(['q3', 'q1', 'q2']);
    });

    it('xáo trộn thứ tự các lựa chọn đáp án theo optionOrders riêng của câu hỏi', () => {
      const q1 = mockExamState.publicQuestions[0]!;
      const opts = getStudentExamOptions(q1, mockExamState);
      expect(opts).toEqual(['D1', 'C1', 'B1', 'A1']);
    });
  });

  describe('5. poll.js & swiss.js (Activities State Updates)', () => {
    it('handleQuickPollUpdate cập nhật trạng thái pollAllowMultiple và runId', () => {
      handleQuickPollUpdate('run_poll_1', {
        question: 'Bạn thích môn nào?',
        allowMultiple: true,
        options: ['Toán', 'Lý', 'Hóa'],
      });
      expect(state.currentRunId).toBe('run_poll_1');
      expect(state.pollAllowMultiple).toBe(true);
    });

    it('handleSwissDuelUpdate reset đáp án khi sang vòng đấu mới', () => {
      state.swissLastRound = 1;
      state.swissAnswers = { 0: 1, 1: 2 };

      handleSwissDuelUpdate('run_swiss_1', {
        title: 'Đấu Cờ Thụy Sỹ Vòng 2',
        currentRound: 2,
        totalRounds: 3,
        status: 'in_round',
        participants: {},
        matchups: [],
      });

      expect(state.currentRunId).toBe('run_swiss_1');
      expect(state.swissLastRound).toBe(2);
      expect(state.swissAnswers).toEqual({});
    });
  });

  describe('6. app.js (Barrel Export & Exports Contract)', () => {
    it('app.js xuất đầy đủ các hàm cốt lõi của hệ thống học sinh', () => {
      expect(AppExports.state).toBeDefined();
      expect(AppExports.renderMath).toBeDefined();
      expect(AppExports.handleJoin).toBeDefined();
      expect(AppExports.handleLeaveSession).toBeDefined();
      expect(AppExports.handleSelectAnswer).toBeDefined();
      expect(AppExports.handleSubmitExam).toBeDefined();
      expect(AppExports.handleSubmitSwissRound).toBeDefined();
      expect(AppExports.toggleStudentChatModal).toBeDefined();
      expect(AppExports.handleSelectTerritoryCell).toBeDefined();
    });
  });

  describe('7. Fastify Static Serving cho toàn bộ các file JS modularized', () => {
    let app: FastifyInstance;

    beforeEach(async () => {
      const studentDir = path.resolve(__dirname, '../../public/student');
      app = await buildServer({
        fastifyOptions: { logger: false },
        studentUiDir: studentDir,
      });
    });

    it('phục vụ đúng student/index.html và đầy đủ các module JS độc lập', async () => {
      // 1. Trang index.html
      const resHtml = await app.inject({ method: 'GET', url: '/student/' });
      expect(resHtml.statusCode).toBe(200);
      expect(resHtml.body).toContain('<script type="module" src="./js/app.js"></script>');
      expect(resHtml.body).not.toContain('let currentRunId = null;'); // Đã không còn inline script 2500 dòng

      const jsFiles = [
        'app.js',
        'state.js',
        'utils.js',
        'chat.js',
        'quiz.js',
        'poll.js',
        'exam.js',
        'swiss.js',
        'session.js',
        'assignment.js',
        'object-camera.js',
        'territory.js',
      ];

      for (const fileName of jsFiles) {
        const resModule = await app.inject({ method: 'GET', url: `/student/js/${fileName}` });
        expect(resModule.statusCode).toBe(200);
        expect(resModule.headers['content-type']).toContain('application/javascript');
      }
    });
  });
});
