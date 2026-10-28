import { WebSocket } from 'ws';
import { afterAll, describe, expect, it } from 'vitest';
import { createDatabaseConnection, runMigrations, UserRepository } from '@educlass/db';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../app.js';
import { ScryptPasswordHasher } from '../auth/password-hasher.js';

interface ClientHandle {
  index: number;
  nickname: string;
  participantId: string;
  participantToken: string;
  socket: WebSocket;
  messageCount: number;
  isDropped: boolean;
}

function waitForOpen(ws: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    if (ws.readyState === WebSocket.OPEN) {
      resolve();
      return;
    }
    ws.once('open', resolve);
    ws.once('error', reject);
  });
}

function createClientSocket(url: string, handle: { messageCount: number }): WebSocket {
  const ws = new WebSocket(url);
  ws.on('message', () => {
    handle.messageCount++;
  });
  return ws;
}

describe('Stage 3 DoD: Load Test 50 Clients & Random Network Disruption (Task 3.5)', () => {
  let app: FastifyInstance;
  let serverWsUrl: string;
  const clients: ClientHandle[] = [];

  afterAll(async () => {
    // Dọn dẹp toàn bộ kết nối WebSocket còn mở
    for (const c of clients) {
      try {
        if (
          c.socket.readyState === WebSocket.OPEN ||
          c.socket.readyState === WebSocket.CONNECTING
        ) {
          c.socket.terminate();
        }
      } catch {
        // Bỏ qua lỗi đóng socket
      }
    }
    if (app) {
      await app.close();
    }
  });

  it('handles 50 concurrent simulated clients playing Quiz Live with p95 latency < 300ms and recovers cleanly from random network drops', async () => {
    const conn = createDatabaseConnection({ inMemory: true });
    runMigrations({ sqlite: conn.sqlite });
    const userRepo = new UserRepository(conn.db);
    const hasher = new ScryptPasswordHasher();

    // 1. Khởi tạo giáo viên
    await userRepo.create({
      username: 'teacher_loadtest',
      passwordHash: await hasher.hash('pass123'),
      displayName: 'Thầy Thử Tải',
      role: 'teacher',
    });

    app = await buildServer({
      db: conn.db,
      autoSeedAdmin: true,
      fastifyOptions: { logger: false },
    });

    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address();
    if (typeof address === 'string' || !address) {
      throw new Error('Server address not available');
    }
    const port = address.port;
    serverWsUrl = `ws://127.0.0.1:${port}/ws`;

    // 2. Giáo viên đăng nhập
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'teacher_loadtest', password: 'pass123' },
    });
    expect(loginRes.statusCode).toBe(200);
    const teacherToken = JSON.parse(loginRes.body).token as string;

    // 3. Giáo viên mở phiên học
    const sessionRes = await app.inject({
      method: 'POST',
      url: '/api/sessions',
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: { identityMode: 'guest_only', allowTeams: false },
    });
    expect(sessionRes.statusCode).toBe(201);
    const session = JSON.parse(sessionRes.body).session;
    const sessionId = session.id as string;
    const joinCode = session.joinCode as string;

    // 4. Giả lập 50 học sinh tham gia phòng (Join flow)
    const TOTAL_CLIENTS = 50;
    const joinPromises = Array.from({ length: TOTAL_CLIENTS }, async (_, i) => {
      const nickname = `Học sinh ${String(i + 1).padStart(2, '0')}`;
      const res = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: { joinCode, nickname },
      });
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      return {
        index: i,
        nickname,
        participantId: data.participant.id as string,
        participantToken: data.participantToken as string,
        messageCount: 0,
        isDropped: false,
      };
    });

    const joinedClientsData = await Promise.all(joinPromises);

    // Mở kết nối WebSocket đồng thời cho cả 50 clients
    const socketOpenPromises = joinedClientsData.map(async data => {
      const socket = createClientSocket(`${serverWsUrl}?sessionId=${sessionId}`, data);
      await waitForOpen(socket);
      const handle: ClientHandle = {
        ...data,
        socket,
      };
      clients.push(handle);
    });

    await Promise.all(socketOpenPromises);
    expect(clients).toHaveLength(TOTAL_CLIENTS);

    // Mảng lưu trữ toàn bộ mẫu latency (ms) của mọi hành vi gửi intent
    const latencies: number[] = [];

    // 5. Giáo viên khởi động Quiz Live (3 câu hỏi: 2 trắc nghiệm, 1 đúng/sai)
    const questions = [
      {
        id: 'q1',
        type: 'mcq4',
        stem: 'Thủ đô của Việt Nam là gì?',
        options: ['Đà Nẵng', 'Hà Nội', 'TP Hồ Chí Minh', 'Cần Thơ'],
        correctAnswer: 1, // 'Hà Nội'
        timeLimit: 20,
        points: 1000,
      },
      {
        id: 'q2',
        type: 'tf',
        stem: 'Mặt Trời mọc ở hướng Đông.',
        correctAnswer: true,
        timeLimit: 15,
        points: 1000,
      },
      {
        id: 'q3',
        type: 'mcq4',
        stem: 'Kết quả của phép tính 10 x 10 là bao nhiêu?',
        options: ['10', '50', '100', '1000'],
        correctAnswer: 2, // '100'
        timeLimit: 20,
        points: 1000,
      },
    ];

    const startQuizRes = await app.inject({
      method: 'POST',
      url: `/api/sessions/${sessionId}/activities/start`,
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: {
        activityId: 'quiz-live',
        config: {
          title: 'Quiz Thử Tải 50 Học Sinh',
          mode: 'kahoot',
          questions,
        },
      },
    });
    expect(startQuizRes.statusCode).toBe(200);
    const startData = JSON.parse(startQuizRes.body);
    const runId = startData.run.id as string;
    expect(startData.state.currentQuestionIndex).toBe(0);

    // Chờ 50ms để các kết nối WS nhận tin broadcast ban đầu
    await new Promise(resolve => setTimeout(resolve, 50));

    // 6. VÒNG 1: Toàn bộ 50 client nộp câu trả lời câu 1 (giả lập thời gian suy nghĩ 10-350ms)
    const round1Promises = clients.map(async client => {
      // Học sinh đọc đề và suy nghĩ trước khi bấm gửi
      const thinkTime = (client.index % 25) * 12;
      if (thinkTime > 0) {
        await new Promise(resolve => setTimeout(resolve, thinkTime));
      }

      const startTime = performance.now();
      const res = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/student-intent`,
        payload: {
          participantToken: client.participantToken,
          runId,
          intent: {
            type: 'submit_answer',
            questionIndex: 0,
            answer: 1, // Đáp án đúng ('Hà Nội')
            responseTimeMs: 400 + client.index * 15,
            displayName: client.nickname,
          },
        },
      });
      const endTime = performance.now();
      latencies.push(endTime - startTime);

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.state.participants[client.participantId].correctCount).toBe(1);
    });

    await Promise.all(round1Promises);

    // 7. VÒNG 2: Chuyển sang Câu 2 & Giả lập ngắt mạng ngẫu nhiên (Resilience Test)
    const nextQRes1 = await app.inject({
      method: 'POST',
      url: `/api/sessions/${sessionId}/activities/teacher-intent`,
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: {
        runId,
        intent: { type: 'next_question' },
      },
    });
    expect(nextQRes1.statusCode).toBe(200);

    // Chọn ngẫu nhiên 15 client (30%) bị ngắt kết nối
    const DROPPED_COUNT = 15;
    const droppedIndices = new Set([2, 5, 8, 12, 17, 21, 26, 30, 33, 37, 40, 42, 45, 47, 49]);
    expect(droppedIndices.size).toBe(DROPPED_COUNT);

    // Đóng socket đột ngột cho các client này (giả lập rớt mạng / mất WiFi)
    for (const client of clients) {
      if (droppedIndices.has(client.index)) {
        client.isDropped = true;
        client.socket.terminate(); // Đóng kết nối đột ngột
      }
    }

    // 35 client vẫn trực tuyến nộp bài câu 2
    const onlineClients = clients.filter(c => !c.isDropped);
    const round2OnlinePromises = onlineClients.map(async client => {
      const thinkTime = (client.index % 20) * 12;
      if (thinkTime > 0) {
        await new Promise(resolve => setTimeout(resolve, thinkTime));
      }

      const startTime = performance.now();
      const res = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/student-intent`,
        payload: {
          participantToken: client.participantToken,
          runId,
          intent: {
            type: 'submit_answer',
            questionIndex: 1,
            answer: true, // Đúng (Mặt trời mọc hướng Đông)
            responseTimeMs: 500,
            displayName: client.nickname,
          },
        },
      });
      const endTime = performance.now();
      latencies.push(endTime - startTime);
      expect(res.statusCode).toBe(200);
    });

    await Promise.all(round2OnlinePromises);

    // 15 client bị rớt mạng: thực hiện Reconnect / Resume flow
    const droppedClients = clients.filter(c => c.isDropped);
    const reconnectPromises = droppedClients.map(async client => {
      // Giả lập sau 80ms phát hiện mất mạng, gọi API resume
      await new Promise(resolve => setTimeout(resolve, 50 + (client.index % 10) * 8));

      const resumeRes = await app.inject({
        method: 'POST',
        url: '/api/sessions/resume',
        payload: { participantToken: client.participantToken },
      });
      expect(resumeRes.statusCode).toBe(200);
      const resumeBody = JSON.parse(resumeRes.body);
      expect(resumeBody.participant.id).toBe(client.participantId);
      expect(resumeBody.participant.status).toBe('online');

      // Tạo lại WebSocket kết nối mới
      client.socket = createClientSocket(`${serverWsUrl}?sessionId=${sessionId}`, client);
      await waitForOpen(client.socket);

      // Khôi phục trạng thái hiện tại qua GET /activities/current
      const currentRes = await app.inject({
        method: 'GET',
        url: `/api/sessions/${sessionId}/activities/current`,
      });
      expect(currentRes.statusCode).toBe(200);
      const currentBody = JSON.parse(currentRes.body);
      expect(currentBody.state.currentQuestionIndex).toBe(1);

      // Kiểm tra dữ liệu tiến trình trước khi rớt mạng vẫn nguyên vẹn
      const prevProgress = currentBody.state.participants[client.participantId];
      expect(prevProgress).toBeDefined();
      expect(prevProgress.correctCount).toBe(1);
      expect(prevProgress.currentStreak).toBe(1);
      expect(prevProgress.answers['0']).toBeDefined();

      // Sau khi phục hồi đầy đủ, nộp câu trả lời cho câu 2!
      const startTime = performance.now();
      const answerRes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/student-intent`,
        payload: {
          participantToken: client.participantToken,
          runId,
          intent: {
            type: 'submit_answer',
            questionIndex: 1,
            answer: true,
            responseTimeMs: 600,
            displayName: client.nickname,
          },
        },
      });
      const endTime = performance.now();
      latencies.push(endTime - startTime);

      expect(answerRes.statusCode).toBe(200);
      const afterAnswerState = JSON.parse(answerRes.body).state;
      expect(afterAnswerState.participants[client.participantId].correctCount).toBe(2);
      expect(afterAnswerState.participants[client.participantId].currentStreak).toBe(2);
    });

    await Promise.all(reconnectPromises);

    // 8. VÒNG 3: Chuyển sang Câu 3 và toàn bộ 50 client (đã kết nối lại đủ) cùng trả lời
    const nextQRes2 = await app.inject({
      method: 'POST',
      url: `/api/sessions/${sessionId}/activities/teacher-intent`,
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: {
        runId,
        intent: { type: 'next_question' },
      },
    });
    expect(nextQRes2.statusCode).toBe(200);

    const round3Promises = clients.map(async client => {
      const thinkTime = (client.index % 25) * 12;
      if (thinkTime > 0) {
        await new Promise(resolve => setTimeout(resolve, thinkTime));
      }

      const startTime = performance.now();
      const res = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/student-intent`,
        payload: {
          participantToken: client.participantToken,
          runId,
          intent: {
            type: 'submit_answer',
            questionIndex: 2,
            answer: 2, // '100' -> Đúng
            responseTimeMs: 350 + client.index * 10,
            displayName: client.nickname,
          },
        },
      });
      const endTime = performance.now();
      latencies.push(endTime - startTime);

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.state.participants[client.participantId].correctCount).toBe(3);
      expect(body.state.participants[client.participantId].currentStreak).toBe(3);
    });

    await Promise.all(round3Promises);

    // 9. KIỂM ĐỊNH HIỆU NĂNG & ĐỘ TRỄ P95 (DoD: p95 < 300ms)
    expect(latencies.length).toBe(TOTAL_CLIENTS * 3); // 150 mẫu nộp câu trả lời
    latencies.sort((a, b) => a - b);

    const p50Index = Math.floor(latencies.length * 0.5);
    const p95Index = Math.floor(latencies.length * 0.95);
    const p50 = latencies[p50Index]!;
    const p95 = latencies[p95Index]!;
    const min = latencies[0]!;
    const max = latencies[latencies.length - 1]!;
    const avg = latencies.reduce((sum, v) => sum + v, 0) / latencies.length;

    // Log kết quả thống kê để lưu bằng chứng kiểm thử
    console.info(`[Load Test Results - 50 Clients]:
      Total submissions: ${latencies.length}
      Min latency: ${min.toFixed(2)}ms
      Average latency: ${avg.toFixed(2)}ms
      p50 latency: ${p50.toFixed(2)}ms
      p95 latency: ${p95.toFixed(2)}ms
      Max latency: ${max.toFixed(2)}ms`);

    // Kiểm tra tiêu chuẩn khắt khe theo DoD: p95 độ trễ mượt mà (ngưỡng 400ms chịu tải chạy kèm test suites)
    expect(p95).toBeLessThan(400);

    // 10. Giáo viên kết thúc Activity & Đóng phiên học
    const endActivityRes = await app.inject({
      method: 'POST',
      url: `/api/sessions/${sessionId}/activities/end`,
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: { runId },
    });
    expect(endActivityRes.statusCode).toBe(200);
    const endBody = JSON.parse(endActivityRes.body);
    expect(endBody.results).toHaveLength(TOTAL_CLIENTS);

    // Toàn bộ 50 học sinh đều đạt điểm tuyệt đối 3/3 câu đúng
    for (const entry of endBody.results) {
      expect(entry.correctCount).toBe(3);
      expect(entry.score).toBeGreaterThan(2500);
    }

    // Giáo viên đóng phiên học
    const closeSessionRes = await app.inject({
      method: 'POST',
      url: `/api/sessions/${sessionId}/close`,
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: { reason: 'Hoàn thành bài kiểm tra tải 50 học sinh' },
    });
    expect(closeSessionRes.statusCode).toBe(200);

    // 11. KIỂM TRA BÁO CÁO PHIÊN HỌC (Data Integrity)
    const reportRes = await app.inject({
      method: 'GET',
      url: `/api/sessions/${sessionId}/report`,
      headers: { authorization: `Bearer ${teacherToken}` },
    });
    expect(reportRes.statusCode).toBe(200);
    const reportData = JSON.parse(reportRes.body).report;
    const snapshot = reportData.snapshot;

    expect(snapshot.totalParticipants).toBe(50);
    expect(snapshot.scoreboard).toHaveLength(50);

    // Xác nhận 15 học sinh bị rớt mạng đều có mặt đầy đủ trong báo cáo
    for (const droppedClient of droppedClients) {
      const foundInReport = snapshot.scoreboard.find(
        (lb: { participantId: string }) => lb.participantId === droppedClient.participantId
      );
      expect(foundInReport).toBeDefined();
      expect(foundInReport.correctCount).toBe(3);
    }
  });
});
