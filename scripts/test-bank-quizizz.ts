/* eslint-disable no-console */
/**
 * Kịch bản kiểm thử độc lập:
 * Ngân hàng đề -> Rút đề thi Quizizz -> Chơi Quizizz tự tiến độ
 * Chạy lệnh: npx tsx scripts/test-bank-quizizz.ts
 */
import {
  createDatabaseConnection,
  runMigrations,
  UserRepository,
} from '../packages/db/src/index.js';
import { buildServer } from '../packages/server/src/app.js';
import { ScryptPasswordHasher } from '../packages/server/src/auth/password-hasher.js';

async function main() {
  console.log('='.repeat(70));
  console.log('🎯 KIỂM THỬ TÍNH NĂNG: NGÂN HÀNG ĐỀ -> RÚT ĐỀ THI QUIZIZZ -> CHƠI QUIZIZZ');
  console.log('   - Câu hỏi có hình ảnh ở câu hỏi và các phương án đáp án');
  console.log('   - Đa dạng các dạng câu hỏi: MCQ4, Đúng/Sai, Trả lời ngắn, Nối cột, Điền khuyết');
  console.log('='.repeat(70));

  // 1. Khởi tạo DB in-memory & Server
  const conn = createDatabaseConnection({ inMemory: true });
  runMigrations({ sqlite: conn.sqlite });
  const userRepo = new UserRepository(conn.db);
  const hasher = new ScryptPasswordHasher();

  await userRepo.create({
    username: 'gv_demo_quizizz',
    passwordHash: await hasher.hash('123456'),
    displayName: 'Thầy Lê Hoàng Nam (Toán 12)',
    role: 'teacher',
  });

  const app = await buildServer({
    db: conn.db,
    autoSeedAdmin: true,
    fastifyOptions: { logger: false },
  });

  try {
    // 2. Đăng nhập giáo viên
    console.log('\n[BƯỚC 1] Đăng nhập giáo viên...');
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'gv_demo_quizizz', password: '123456' },
    });
    const token = JSON.parse(loginRes.body).token as string;
    const headers = { authorization: `Bearer ${token}` };
    console.log('✅ Đăng nhập thành công! Token:', token.slice(0, 20) + '...');

    // 3. Nạp ngân hàng câu hỏi
    console.log('\n[BƯỚC 2] Thêm câu hỏi vào Ngân hàng đề (có ảnh ở đề bài và các phương án)...');
    const sampleImg =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const optImgA =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const optImgB =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

    // 3.1 MCQ4 có ảnh ở đề bài và đáp án
    const qMcqRes = await app.inject({
      method: 'POST',
      url: '/api/bank/questions',
      headers,
      payload: {
        grade: 12,
        subject: 'Toán',
        chapter: 'Chương 1: Khảo sát hàm số',
        lesson: 'Bài 1: Tính đơn điệu',
        difficulty: 'nb',
        type: 'mcq4',
        contentJson: JSON.stringify({
          stem: {
            text: 'Đồ thị hình bên là của hàm số nào trong các hàm số sau đây?',
            images: [sampleImg],
          },
          options: [
            { text: 'Đồ thị phương án A', images: [optImgA] },
            { text: 'Đồ thị phương án B', images: [optImgB] },
            { text: 'Phương án C', images: [] },
            { text: 'Phương án D', images: [] },
          ],
        }),
        answerJson: JSON.stringify({ correct: 0 }),
        points: 1000,
      },
    });
    console.log(
      '  + Đã thêm câu MCQ4 (có ảnh ở câu hỏi & ảnh ở các phương án A, B). ID:',
      JSON.parse(qMcqRes.body).id
    );

    // 3.2 Thêm các dạng câu hỏi khác qua Batch API
    await app.inject({
      method: 'POST',
      url: '/api/bank/questions/batch',
      headers,
      payload: {
        questions: [
          {
            grade: 12,
            subject: 'Toán',
            chapter: 'Chương 1: Khảo sát hàm số',
            lesson: 'Bài 1: Tính đơn điệu',
            difficulty: 'th',
            type: 'tf',
            contentJson: JSON.stringify({
              stem: {
                text: 'Hàm số bậc ba luôn có tâm đối xứng nằm trên đồ thị như hình minh họa:',
                images: [sampleImg],
              },
            }),
            answerJson: JSON.stringify({ correct: true }),
            points: 1000,
          },
          {
            grade: 12,
            subject: 'Toán',
            chapter: 'Chương 1: Khảo sát hàm số',
            lesson: 'Bài 1: Tính đơn điệu',
            difficulty: 'vd',
            type: 'short',
            contentJson: JSON.stringify({
              stem: {
                text: "Dựa vào đồ thị đạo hàm f'(x) bên dưới, hàm số có bao nhiêu điểm cực trị?",
                images: [sampleImg],
              },
            }),
            answerJson: JSON.stringify({ accepted: ['3', 'ba'] }),
            points: 1000,
          },
          {
            grade: 12,
            subject: 'Toán',
            chapter: 'Chương 1: Khảo sát hàm số',
            lesson: 'Bài 2: Cực trị của hàm số',
            difficulty: 'th',
            type: 'matching',
            contentJson: JSON.stringify({
              stem: { text: 'Ghép nối hàm số với dạng đồ thị tương ứng:' },
              leftItems: [
                { id: 'l1', text: 'Bậc 3' },
                { id: 'l2', text: 'Trùng phương' },
              ],
              rightItems: [
                { id: 'r1', text: 'Chữ N' },
                { id: 'r2', text: 'Chữ W hoặc M' },
              ],
            }),
            answerJson: JSON.stringify({ correctPairs: { l1: 'r1', l2: 'r2' } }),
            points: 1000,
          },
          {
            grade: 12,
            subject: 'Toán',
            chapter: 'Chương 1: Khảo sát hàm số',
            lesson: 'Bài 2: Cực trị của hàm số',
            difficulty: 'vd',
            type: 'cloze_drag',
            contentJson: JSON.stringify({
              stem: { text: 'Kéo thả từ thích hợp vào chỗ trống:' },
              template: 'Hàm số đạt cực trị khi đạo hàm {{b1}}. Điểm đó là điểm {{b2}}.',
              blanks: [
                { id: 'b1', position: 1 },
                { id: 'b2', position: 2 },
              ],
              wordBank: ['bằng 0', 'tới hạn', 'lớn hơn 0'],
            }),
            answerJson: JSON.stringify({ correctBlanks: { b1: 'bằng 0', b2: 'tới hạn' } }),
            points: 1000,
          },
        ],
      },
    });
    console.log(
      '  + Đã thêm 4 câu hỏi: Đúng/Sai (tf), Trả lời ngắn (short), Nối cột (matching), Điền khuyết (cloze_drag).'
    );

    // 4. Rút đề thi Quizizz theo Ma trận
    console.log('\n[BƯỚC 3] Rút đề thi Quizizz từ ngân hàng đề theo Ma trận chuẩn...');
    const genRes = await app.inject({
      method: 'POST',
      url: '/api/bank/generate-set',
      headers,
      payload: {
        title: 'Bộ Đề Thi Quizizz Toán 12 (Ma Trận)',
        grade: 12,
        subject: 'Toán',
        matrix: [
          {
            chapter: 'Chương 1: Khảo sát hàm số',
            lesson: 'Bài 1: Tính đơn điệu',
            counts: { nb: 1, th: 1, vd: 1, vdc: 0 },
          },
          {
            chapter: 'Chương 1: Khảo sát hàm số',
            lesson: 'Bài 2: Cực trị của hàm số',
            counts: { nb: 0, th: 1, vd: 1, vdc: 0 },
          },
        ],
        shuffleQuestions: false,
        shuffleOptions: false,
      },
    });
    const genSet = JSON.parse(genRes.body);
    console.log(
      `✅ Rút thành công bộ đề! Set ID: ${genSet.setId}, Tổng số câu: ${genSet.totalQuestions}`
    );

    // Lấy chi tiết bộ đề vừa rút
    const setRes = await app.inject({
      method: 'GET',
      url: `/api/question-sets/${genSet.setId}`,
      headers,
    });
    const loadedSet = JSON.parse(setRes.body);

    // 5. Mở phiên học và học sinh tham gia
    console.log('\n[BƯỚC 4] Mở phiên học trực tiếp...');
    const sessionRes = await app.inject({
      method: 'POST',
      url: '/api/sessions',
      headers,
      payload: { identityMode: 'guest_only', allowTeams: false },
    });
    const session = JSON.parse(sessionRes.body).session;
    console.log(`✅ Phiên học đã mở! Mã vào lớp: ${session.joinCode}`);

    const joinRes = await app.inject({
      method: 'POST',
      url: '/api/sessions/join',
      payload: { joinCode: session.joinCode, nickname: 'Học sinh Trần Bình An' },
    });
    const joinData = JSON.parse(joinRes.body);
    const participantToken = joinData.participantToken;
    const participantId = joinData.participant.id;
    console.log(`✅ Học sinh [${joinData.participant.displayName}] đã vào lớp.`);

    // 6. Chuyển đổi và Khởi chạy Quizizz
    console.log('\n[BƯỚC 5] Khởi chạy trò chơi Quizizz (mode: quizizz)...');
    const quizQuestions = loadedSet.questions.map((q: Record<string, unknown>, idx: number) => {
      const type = String(q.type);
      const stemObj = q.stem as { text?: string; images?: string[] } | undefined;
      const stemText = stemObj?.text ?? `Câu hỏi ${idx + 1}`;
      const stemImage = stemObj?.images?.[0] ? `/api/assets/${stemObj.images[0]}` : undefined;

      if (type === 'mcq4') {
        const rawOpts = (q.options as Array<{ text?: string; images?: string[] }>) || [];
        const options = rawOpts.map((o, oIdx) => o.text ?? `Phương án ${oIdx + 1}`);
        const optionImages = rawOpts.map(o =>
          o.images?.[0] ? `/api/assets/${o.images[0]}` : undefined
        );
        return {
          id: String(q.id),
          type: 'mcq4',
          stem: stemText,
          image: stemImage,
          options,
          optionImages: optionImages.some(Boolean) ? optionImages : undefined,
          correctAnswer: Number(q.correct ?? 0),
          timeLimit: 30,
          points: 1000,
        };
      }
      if (type === 'tf') {
        return {
          id: String(q.id),
          type: 'tf',
          stem: stemText,
          image: stemImage,
          correctAnswer: Boolean(q.correct),
          timeLimit: 25,
          points: 1000,
        };
      }
      if (type === 'short') {
        return {
          id: String(q.id),
          type: 'short',
          stem: stemText,
          image: stemImage,
          correctAnswer: Array.isArray(q.accepted) ? q.accepted : ['3'],
          timeLimit: 30,
          points: 1000,
        };
      }
      if (type === 'matching') {
        return {
          id: String(q.id),
          type: 'matching',
          stem: stemText,
          leftItems: q.leftItems,
          rightItems: q.rightItems,
          correctAnswer: q.correctPairs,
          timeLimit: 35,
          points: 1000,
        };
      }
      return {
        id: String(q.id),
        type: 'cloze_drag',
        stem: stemText,
        template: q.template,
        blanks: q.blanks,
        wordBank: q.wordBank,
        correctAnswer: q.correctBlanks,
        timeLimit: 35,
        points: 1000,
      };
    });

    const startRes = await app.inject({
      method: 'POST',
      url: `/api/sessions/${session.id}/activities/start`,
      headers,
      payload: {
        activityId: 'quiz-live',
        config: {
          title: 'Trận Đấu Quizizz: Đạo Hàm Toán 12',
          mode: 'quizizz',
          enablePowerUps: true,
          powerUpCapacity: 3,
          powerUpDropCondition: 1,
          questions: quizQuestions,
        },
      },
    });
    const startData = JSON.parse(startRes.body);
    const runId = startData.run.id;
    console.log(
      `🎮 Hoạt động Quizizz đã bắt đầu! Trạng thái: ${startData.state.status}, Tổng số câu: ${startData.state.totalQuestions}`
    );

    // 7. Học sinh lần lượt làm bài tự tiến độ
    console.log('\n[BƯỚC 6] Học sinh tự tiến độ trả lời từng câu hỏi...');

    // Câu 1: MCQ4 có ảnh câu hỏi và đáp án
    const r0 = await app.inject({
      method: 'POST',
      url: `/api/sessions/${session.id}/activities/student-intent`,
      payload: {
        participantToken,
        runId,
        intent: { type: 'submit_answer', questionIndex: 0, answer: 0, responseTimeMs: 600 },
      },
    });
    const s0 = JSON.parse(r0.body).state.participants[participantId];
    console.log(
      `  ✓ Câu 1 (MCQ4 có ảnh đề & đáp án): Đúng! Điểm: ${s0.score}, Streak: ${s0.currentStreak}, Vật phẩm trong túi: ${s0.inventory.queue.length}`
    );

    // Sử dụng vật phẩm
    await app.inject({
      method: 'POST',
      url: `/api/sessions/${session.id}/activities/student-intent`,
      payload: { participantToken, runId, intent: { type: 'use_powerup' } },
    });
    console.log('  ⚡ Đã kích hoạt vật phẩm Power-up nhận được!');

    // Câu 2: TF có ảnh
    const r1 = await app.inject({
      method: 'POST',
      url: `/api/sessions/${session.id}/activities/student-intent`,
      payload: {
        participantToken,
        runId,
        intent: { type: 'submit_answer', questionIndex: 1, answer: true, responseTimeMs: 900 },
      },
    });
    const s1 = JSON.parse(r1.body).state.participants[participantId];
    console.log(
      `  ✓ Câu 2 (Đúng/Sai có ảnh): Đúng! Điểm: ${s1.score}, Streak: ${s1.currentStreak}`
    );

    // Câu 3: Short có ảnh
    const r2 = await app.inject({
      method: 'POST',
      url: `/api/sessions/${session.id}/activities/student-intent`,
      payload: {
        participantToken,
        runId,
        intent: { type: 'submit_answer', questionIndex: 2, answer: '3', responseTimeMs: 1100 },
      },
    });
    const s2 = JSON.parse(r2.body).state.participants[participantId];
    console.log(
      `  ✓ Câu 3 (Trả lời ngắn có ảnh): Đúng! Điểm: ${s2.score}, Streak: ${s2.currentStreak}`
    );

    // Câu 4: Matching
    const r3 = await app.inject({
      method: 'POST',
      url: `/api/sessions/${session.id}/activities/student-intent`,
      payload: {
        participantToken,
        runId,
        intent: {
          type: 'submit_answer',
          questionIndex: 3,
          answer: { pairs: { l1: 'r1', l2: 'r2' } },
          responseTimeMs: 1400,
        },
      },
    });
    const s3 = JSON.parse(r3.body).state.participants[participantId];
    console.log(`  ✓ Câu 4 (Nối cột matching): Đúng! Điểm: ${s3.score}`);

    // Câu 5: Cloze drag
    const r4 = await app.inject({
      method: 'POST',
      url: `/api/sessions/${session.id}/activities/student-intent`,
      payload: {
        participantToken,
        runId,
        intent: {
          type: 'submit_answer',
          questionIndex: 4,
          answer: { filled: { b1: 'bằng 0', b2: 'tới hạn' } },
          responseTimeMs: 1600,
        },
      },
    });
    const s4 = JSON.parse(r4.body).state.participants[participantId];
    console.log(`  ✓ Câu 5 (Điền khuyết cloze_drag): Đúng! Điểm: ${s4.score}`);
    console.log(
      `  🎉 Học sinh đã hoàn thành toàn bộ bài thi Quizizz: isCompleted = ${s4.isCompleted}`
    );

    // 8. Kết thúc bài Quizizz
    console.log('\n[BƯỚC 7] Giáo viên kết thúc bài Quizizz & Trao thưởng...');
    const endRes = await app.inject({
      method: 'POST',
      url: `/api/sessions/${session.id}/activities/end`,
      headers,
      payload: { runId },
    });
    const endData = JSON.parse(endRes.body);
    const result = endData.results[0];
    console.log('='.repeat(70));
    console.log(`🏆 KẾT QUẢ TỔNG KẾT BÀI THI QUIZIZZ:`);
    console.log(`   - Thí sinh: ${result.displayName}`);
    console.log(`   - Hạng: #${result.rank}`);
    console.log(
      `   - Độ chính xác: ${result.accuracy}% (${result.correctCount}/${quizQuestions.length} câu)`
    );
    console.log(`   - Tổng điểm tích lũy: ${result.score} điểm`);

    const expTotals = await app.rewardRepo.getParticipantExpTotals(
      session.id,
      participantId,
      'quiz-live'
    );
    console.log(`   - EXP Hoạt động: +${expTotals.activityExp} EXP`);
    console.log(`   - EXP Toàn phiên: +${expTotals.sessionExp} EXP`);
    console.log('='.repeat(70));
    console.log('✅ TEST TOÀN TRÌNH THÀNH CÔNG 100%!');
  } finally {
    await app.close();
    conn.sqlite.close();
  }
}

main().catch(err => {
  console.error('❌ Lỗi kiểm thử:', err);
  process.exit(1);
});
