import { describe, expect, it } from 'vitest';
import {
  createDatabaseConnection,
  runMigrations,
  UserRepository,
} from '@educlass/db';
import { buildServer } from '../app.js';
import { ScryptPasswordHasher } from '../auth/password-hasher.js';

describe('E2E Test: Ngân hàng đề -> Rút bộ đề thi Quizizz -> Chơi Quizizz (Hình ảnh câu hỏi, đáp án, đa dạng câu hỏi)', () => {
  it('cho phép thêm câu hỏi có ảnh ở đề bài và đáp án vào ngân hàng, rút đề theo ma trận, và chơi Quizizz tự tiến độ', async () => {
    // 1. Khởi tạo cơ sở dữ liệu in-memory và máy chủ EduClass
    const conn = createDatabaseConnection({ inMemory: true });
    runMigrations({ sqlite: conn.sqlite });
    const userRepo = new UserRepository(conn.db);
    const hasher = new ScryptPasswordHasher();

    // 2. Tạo tài khoản giáo viên môn Toán
    await userRepo.create({
      username: 'gv_nganhang_quizizz',
      passwordHash: await hasher.hash('MatKhau@123'),
      displayName: 'Cô Nguyễn Mai Hương',
      role: 'teacher',
    });

    const app = await buildServer({
      db: conn.db,
      autoSeedAdmin: true,
      fastifyOptions: { logger: false },
    });

    try {
      // 3. Đăng nhập giáo viên
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'gv_nganhang_quizizz', password: 'MatKhau@123' },
      });
      expect(loginRes.statusCode).toBe(200);
      const token = JSON.parse(loginRes.body).token as string;
      const headers = { authorization: `Bearer ${token}` };

      // 4. NẠP CÂU HỎI VÀO NGÂN HÀNG ĐỀ (Đa dạng các dạng câu hỏi, có hình ảnh ở câu hỏi và đáp án)
      // Dùng ảnh 1x1 Pixel Base64 PNG chuẩn để test CAS Assets
      const sampleQuestionImageBase64 =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const sampleOptionImageA =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      const sampleOptionImageB =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      const sampleOptionImageC =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==';
      const sampleOptionImageD =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

      // 4.1 Câu 1: MCQ4 có hình ảnh ở câu hỏi VÀ hình ảnh ở cả 4 phương án đáp án (Mức độ NB)
      const qMcq4Res = await app.inject({
        method: 'POST',
        url: '/api/bank/questions',
        headers,
        payload: {
          grade: 12,
          subject: 'Toán',
          chapter: 'Chương 1: Khảo sát hàm số',
          lesson: 'Bài 1: Tính đơn điệu của hàm số',
          difficulty: 'nb',
          type: 'mcq4',
          contentJson: JSON.stringify({
            stem: {
              text: 'Cho hàm số $y = f(x)$ có bảng xét dấu đạo hàm như hình vẽ. Đồ thị nào dưới đây là của hàm số đã cho?',
              images: [sampleQuestionImageBase64],
            },
            options: [
              { text: 'Đồ thị phương án A', images: [sampleOptionImageA] },
              { text: 'Đồ thị phương án B', images: [sampleOptionImageB] },
              { text: 'Đồ thị phương án C', images: [sampleOptionImageC] },
              { text: 'Đồ thị phương án D', images: [sampleOptionImageD] },
            ],
          }),
          answerJson: JSON.stringify({
            correct: 0,
            explanation: 'Dựa vào bảng xét dấu, hàm số đồng biến trên khoảng (-∞; 1) và (2; +∞), tương ứng đồ thị A.',
          }),
          points: 1000,
        },
      });
      expect(qMcq4Res.statusCode).toBe(201);
      const qMcq4 = JSON.parse(qMcq4Res.body);
      expect(qMcq4.id).toBeDefined();
      // Ảnh base64 đã được bóc tách và lưu thành CAS asset sha256
      expect(qMcq4.contentJson).not.toContain('data:image/png;base64');

      // 4.2 Nạp hàng loạt các dạng câu hỏi khác vào ngân hàng qua Batch API
      const batchRes = await app.inject({
        method: 'POST',
        url: '/api/bank/questions/batch',
        headers,
        payload: {
          questions: [
            // Dạng 2: Câu hỏi Đúng/Sai (tf) có hình ảnh ở câu hỏi (Mức độ TH)
            {
              grade: 12,
              subject: 'Toán',
              chapter: 'Chương 1: Khảo sát hàm số',
              lesson: 'Bài 1: Tính đơn điệu của hàm số',
              difficulty: 'th',
              type: 'tf',
              contentJson: JSON.stringify({
                stem: {
                  text: 'Đồ thị hàm số bậc ba $y = ax^3 + bx^2 + cx + d$ luôn nhận điểm uốn $I(x_0; y_0)$ làm tâm đối xứng như hình vẽ minh họa bên dưới:',
                  images: [sampleQuestionImageBase64],
                },
              }),
              answerJson: JSON.stringify({
                correct: true,
                explanation: 'Đúng, đồ thị hàm bậc ba luôn nhận điểm uốn làm tâm đối xứng.',
              }),
              points: 1000,
            },
            // Dạng 3: Câu hỏi Trả lời ngắn (short) có hình ảnh ở câu hỏi (Mức độ VD)
            {
              grade: 12,
              subject: 'Toán',
              chapter: 'Chương 1: Khảo sát hàm số',
              lesson: 'Bài 1: Tính đơn điệu của hàm số',
              difficulty: 'vd',
              type: 'short',
              contentJson: JSON.stringify({
                stem: {
                  text: 'Dựa vào đồ thị đạo hàm $y = f\'(x)$ cắt trục hoành tại 3 điểm phân biệt như hình vẽ, hàm số $y = f(x)$ có bao nhiêu điểm cực trị?',
                  images: [sampleQuestionImageBase64],
                },
              }),
              answerJson: JSON.stringify({
                accepted: ['3', 'ba', '3 điểm'],
                explanation: 'Đạo hàm đổi dấu 3 lần khi đi qua các nghiệm đơn nên có 3 điểm cực trị.',
              }),
              points: 1000,
            },
            // Dạng 4: Câu hỏi Nối cột tương ứng (matching) (Mức độ TH)
            {
              grade: 12,
              subject: 'Toán',
              chapter: 'Chương 1: Khảo sát hàm số',
              lesson: 'Bài 2: Cực trị của hàm số',
              difficulty: 'th',
              type: 'matching',
              contentJson: JSON.stringify({
                stem: {
                  text: 'Hãy ghép nối dạng đồ thị hàm số ở cột bên trái với phương trình tương ứng ở cột bên phải:',
                },
                leftItems: [
                  { id: 'left_1', text: 'Hàm số bậc ba có 2 cực trị' },
                  { id: 'left_2', text: 'Hàm số trùng phương có 3 cực trị' },
                ],
                rightItems: [
                  { id: 'right_1', text: 'Đường cong hình chữ N hoặc N ngược' },
                  { id: 'right_2', text: 'Đường cong hình chữ W hoặc M' },
                ],
              }),
              answerJson: JSON.stringify({
                correctPairs: {
                  left_1: 'right_1',
                  left_2: 'right_2',
                },
              }),
              points: 1000,
            },
            // Dạng 5: Câu hỏi Kéo thả khuyết từ (cloze_drag) (Mức độ VD)
            {
              grade: 12,
              subject: 'Toán',
              chapter: 'Chương 1: Khảo sát hàm số',
              lesson: 'Bài 2: Cực trị của hàm số',
              difficulty: 'vd',
              type: 'cloze_drag',
              contentJson: JSON.stringify({
                stem: {
                  text: 'Kéo thả các cụm từ thích hợp vào chỗ trống để hoàn thành định lý Fermat về cực trị:',
                },
                template: 'Nếu hàm số đạt cực trị tại $x_0$ và có đạo hàm thì đạo hàm tại đó {{blank_1}}. Điểm $x_0$ được gọi là điểm {{blank_2}}.',
                blanks: [
                  { id: 'blank_1', position: 1 },
                  { id: 'blank_2', position: 2 },
                ],
                wordBank: ['bằng 0', 'tới hạn', 'lớn hơn 0', 'nhỏ hơn 0', 'uốn'],
              }),
              answerJson: JSON.stringify({
                correctBlanks: {
                  blank_1: 'bằng 0',
                  blank_2: 'tới hạn',
                },
              }),
              points: 1000,
            },
          ],
        },
      });
      expect(batchRes.statusCode).toBe(201);
      expect(JSON.parse(batchRes.body).count).toBe(4);

      // 5. KIỂM TRA CÂY PHÂN CẤP VÀ THỐNG KÊ MA TRẬN TỪ NGÂN HÀNG ĐỀ
      const treeRes = await app.inject({
        method: 'GET',
        url: '/api/bank/tree?grade=12&subject=Toán',
        headers,
      });
      expect(treeRes.statusCode).toBe(200);
      const tree = JSON.parse(treeRes.body);
      expect(tree.length).toBeGreaterThan(0);
      expect(tree[0].chapter).toBe('Chương 1: Khảo sát hàm số');

      const statsRes = await app.inject({
        method: 'POST',
        url: '/api/bank/matrix-stats',
        headers,
        payload: {
          grade: 12,
          subject: 'Toán',
          lessons: ['Bài 1: Tính đơn điệu của hàm số', 'Bài 2: Cực trị của hàm số'],
        },
      });
      expect(statsRes.statusCode).toBe(200);
      const stats = JSON.parse(statsRes.body).stats;
      expect(stats['Bài 1: Tính đơn điệu của hàm số'].available.nb).toBe(1);
      expect(stats['Bài 1: Tính đơn điệu của hàm số'].available.th).toBe(1);
      expect(stats['Bài 1: Tính đơn điệu của hàm số'].available.vd).toBe(1);
      expect(stats['Bài 2: Cực trị của hàm số'].available.th).toBe(1);
      expect(stats['Bài 2: Cực trị của hàm số'].available.vd).toBe(1);

      // 6. RÚT BỘ ĐỀ THI TỪ NGÂN HÀNG ĐỀ THEO MA TRẬN
      const generateRes = await app.inject({
        method: 'POST',
        url: '/api/bank/generate-set',
        headers,
        payload: {
          title: 'Đề Thi Quizizz Trực Tuyến Từ Ngân Hàng Đề',
          grade: 12,
          subject: 'Toán',
          matrix: [
            {
              chapter: 'Chương 1: Khảo sát hàm số',
              lesson: 'Bài 1: Tính đơn điệu của hàm số',
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
      expect(generateRes.statusCode).toBe(201);
      const genData = JSON.parse(generateRes.body);
      expect(genData.success).toBe(true);
      expect(genData.totalQuestions).toBe(5);
      const questionSetId = genData.setId as string;

      // Xác thực chi tiết bộ đề thi vừa rút có đủ 5 câu hỏi và bảo toàn hình ảnh
      const getSetRes = await app.inject({
        method: 'GET',
        url: `/api/question-sets/${questionSetId}`,
        headers,
      });
      expect(getSetRes.statusCode).toBe(200);
      const questionSet = JSON.parse(getSetRes.body);
      expect(questionSet.questions).toHaveLength(5);

      // Kiểm tra câu MCQ4 trong bộ đề: có hình ảnh ở câu hỏi và hình ảnh ở các phương án
      const mcqInSet = questionSet.questions.find((q: { type: string }) => q.type === 'mcq4');
      expect(mcqInSet).toBeDefined();
      expect(mcqInSet.stem.images).toHaveLength(1);
      expect(mcqInSet.options[0].images).toHaveLength(1);
      expect(mcqInSet.options[1].images).toHaveLength(1);

      // 7. MỞ PHIÊN HỌC VÀ CHO HỌC SINH VÀO PHÒNG
      const sessionRes = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers,
        payload: {
          identityMode: 'guest_only',
          allowTeams: false,
        },
      });
      expect(sessionRes.statusCode).toBe(201);
      const session = JSON.parse(sessionRes.body).session;
      const sessionId = session.id as string;
      const joinCode = session.joinCode as string;

      // Học sinh tham gia vào phiên học
      const joinRes = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: {
          joinCode,
          nickname: 'Nguyễn Văn Minh',
        },
      });
      expect(joinRes.statusCode).toBe(200);
      const joinData = JSON.parse(joinRes.body);
      const participantToken = joinData.participantToken as string;
      const participantId = joinData.participant.id as string;

      // 8. KHỞI CHẠY BÀI THI QUIZIZZ (QUIZ-LIVE MODE: 'QUIZIZZ')
      // Chuẩn bị danh sách câu hỏi chuyển đổi từ QuestionSet sang cấu hình QuizLive
      const quizQuestions = questionSet.questions.map((q: Record<string, unknown>, idx: number) => {
        const type = String(q.type);
        const stemObj = q.stem as { text?: string; images?: string[] } | undefined;
        const stemText = stemObj?.text ?? `Câu hỏi ${idx + 1}`;
        const stemImage = stemObj?.images?.[0] ? `/api/assets/${stemObj.images[0]}` : undefined;

        if (type === 'mcq4') {
          const rawOpts = (q.options as Array<{ text?: string; images?: string[] }>) || [];
          const options = rawOpts.map((o, oIdx) => o.text ?? `Phương án ${oIdx + 1}`);
          const optionImages = rawOpts.map((o) => (o.images?.[0] ? `/api/assets/${o.images[0]}` : undefined));
          const hasAnyOptImg = optionImages.some(img => Boolean(img));

          return {
            id: String(q.id),
            type: 'mcq4',
            stem: stemText,
            options,
            correctAnswer: Number(q.correct ?? 0),
            timeLimit: 30,
            points: 1000,
            ...(stemImage ? { image: stemImage } : {}),
            ...(hasAnyOptImg ? { optionImages } : {}),
          };
        }

        if (type === 'tf') {
          return {
            id: String(q.id),
            type: 'tf',
            stem: stemText,
            correctAnswer: Boolean(q.correct),
            timeLimit: 25,
            points: 1000,
            ...(stemImage ? { image: stemImage } : {}),
          };
        }

        if (type === 'short') {
          return {
            id: String(q.id),
            type: 'short',
            stem: stemText,
            correctAnswer: Array.isArray(q.accepted) ? q.accepted : ['3'],
            timeLimit: 35,
            points: 1000,
            ...(stemImage ? { image: stemImage } : {}),
          };
        }

        if (type === 'matching') {
          return {
            id: String(q.id),
            type: 'matching',
            stem: stemText,
            leftItems: (q.leftItems as Array<{ id: string; text: string }>) || [],
            rightItems: (q.rightItems as Array<{ id: string; text: string }>) || [],
            correctAnswer: (q.correctPairs as Record<string, string>) || {},
            timeLimit: 40,
            points: 1000,
          };
        }

        if (type === 'cloze_drag') {
          return {
            id: String(q.id),
            type: 'cloze_drag',
            stem: stemText,
            template: String(q.template || ''),
            blanks: (q.blanks as Array<{ id: string; position: number }>) || [],
            wordBank: (q.wordBank as string[]) || [],
            correctAnswer: (q.correctBlanks as Record<string, string>) || {},
            timeLimit: 40,
            points: 1000,
          };
        }

        throw new Error(`Dạng câu hỏi chưa được hỗ trợ: ${type}`);
      });

      // Bắt đầu Activity Quiz Live chế độ Quizizz
      const startQuizRes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/start`,
        headers,
        payload: {
          activityId: 'quiz-live',
          config: {
            title: 'Trận Đấu Quizizz: Đạo Hàm & Khảo Sát Hàm Số',
            mode: 'quizizz',
            enablePowerUps: true,
            powerUpCapacity: 3,
            powerUpDropCondition: 1, // Rơi ngay sau 1 câu đúng
            questions: quizQuestions,
          },
        },
      });
      expect(startQuizRes.statusCode).toBe(200);
      const startQuizData = JSON.parse(startQuizRes.body);
      const runId = startQuizData.run.id as string;
      const initialQuizState = startQuizData.state;

      expect(initialQuizState.mode).toBe('quizizz');
      expect(initialQuizState.totalQuestions).toBe(5);
      expect(initialQuizState.status).toBe('in_question');

      // Kiểm tra câu hỏi đầu tiên (mcq4) có chứa cả ảnh ở câu hỏi và đáp án
      const firstQ = initialQuizState.questions[0];
      expect(firstQ.type).toBe('mcq4');
      expect(firstQ.image).toBeDefined();
      expect(firstQ.image).toContain('/api/assets/');
      expect(firstQ.optionImages).toBeDefined();
      expect(firstQ.optionImages?.[0]).toContain('/api/assets/');
      expect(firstQ.optionImages?.[1]).toContain('/api/assets/');

      // 9. HỌC SINH TỰ TIẾN ĐỘ LÀM BÀI TRONG QUIZIZZ (Self-Paced Progression)

      // 9.1 Học sinh trả lời Câu 0 (MCQ4 có ảnh đề và đáp án)
      const ans0Res = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/student-intent`,
        payload: {
          participantToken,
          runId,
          intent: {
            type: 'submit_answer',
            questionIndex: 0,
            answer: 0, // Phương án A (Đúng)
            responseTimeMs: 800,
          },
        },
      });
      expect(ans0Res.statusCode).toBe(200);
      const stateAfter0 = JSON.parse(ans0Res.body).state;
      const pAfter0 = stateAfter0.participants[participantId];
      expect(pAfter0.correctCount).toBe(1);
      expect(pAfter0.currentStreak).toBe(1);
      expect(pAfter0.currentIndex).toBe(1); // Tự nhảy sang câu tiếp theo
      expect(pAfter0.isCompleted).toBe(false);
      expect(pAfter0.score).toBeGreaterThan(900);
      // Kiểm tra vật phẩm Power-up đã được rơi vào túi đồ học sinh
      expect(pAfter0.inventory?.queue?.length).toBeGreaterThanOrEqual(1);

      // 9.2 Học sinh sử dụng vật phẩm Power-up nhận được
      const usePowerUpRes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/student-intent`,
        payload: {
          participantToken,
          runId,
          intent: {
            type: 'use_powerup',
          },
        },
      });
      expect(usePowerUpRes.statusCode).toBe(200);
      const stateAfterPowerUp = JSON.parse(usePowerUpRes.body).state;
      expect(stateAfterPowerUp.participants[participantId].personalNotification).toBeDefined();

      // 9.3 Học sinh trả lời Câu 1 (Đúng/Sai TF có ảnh ở câu hỏi)
      const ans1Res = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/student-intent`,
        payload: {
          participantToken,
          runId,
          intent: {
            type: 'submit_answer',
            questionIndex: 1,
            answer: true, // Đúng
            responseTimeMs: 1200,
          },
        },
      });
      expect(ans1Res.statusCode).toBe(200);
      const stateAfter1 = JSON.parse(ans1Res.body).state;
      const pAfter1 = stateAfter1.participants[participantId];
      expect(pAfter1.correctCount).toBe(2);
      expect(pAfter1.currentStreak).toBe(2);
      expect(pAfter1.currentIndex).toBe(2);

      // 9.4 Học sinh trả lời Câu 2 (Trả lời ngắn Short có ảnh)
      const ans2Res = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/student-intent`,
        payload: {
          participantToken,
          runId,
          intent: {
            type: 'submit_answer',
            questionIndex: 2,
            answer: '3', // 3 điểm cực trị
            responseTimeMs: 1500,
          },
        },
      });
      expect(ans2Res.statusCode).toBe(200);
      const stateAfter2 = JSON.parse(ans2Res.body).state;
      const pAfter2 = stateAfter2.participants[participantId];
      expect(pAfter2.correctCount).toBe(3);
      expect(pAfter2.currentStreak).toBe(3);
      expect(pAfter2.currentIndex).toBe(3);

      // 9.5 Học sinh trả lời Câu 3 (Nối cột Matching)
      const ans3Res = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/student-intent`,
        payload: {
          participantToken,
          runId,
          intent: {
            type: 'submit_answer',
            questionIndex: 3,
            answer: {
              pairs: {
                left_1: 'right_1',
                left_2: 'right_2',
              },
            },
            responseTimeMs: 2000,
          },
        },
      });
      expect(ans3Res.statusCode).toBe(200);
      const stateAfter3 = JSON.parse(ans3Res.body).state;
      const pAfter3 = stateAfter3.participants[participantId];
      expect(pAfter3.correctCount).toBe(4);
      expect(pAfter3.currentIndex).toBe(4);

      // 9.6 Học sinh trả lời Câu 4 (Kéo thả điền khuyết Cloze Drag)
      const ans4Res = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/student-intent`,
        payload: {
          participantToken,
          runId,
          intent: {
            type: 'submit_answer',
            questionIndex: 4,
            answer: {
              filled: {
                blank_1: 'bằng 0',
                blank_2: 'tới hạn',
              },
            },
            responseTimeMs: 2200,
          },
        },
      });
      expect(ans4Res.statusCode).toBe(200);
      const stateAfter4 = JSON.parse(ans4Res.body).state;
      const pAfter4 = stateAfter4.participants[participantId];
      expect(pAfter4.correctCount).toBe(5);
      // Học sinh đã hoàn tất toàn bộ 5 câu hỏi của bài Quizizz!
      expect(pAfter4.isCompleted).toBe(true);

      // 10. GIÁO VIÊN KẾT THÚC BÀI QUIZ VÀ KIỂM TRA TỔNG KẾT & EXP
      const endQuizRes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/end`,
        headers,
        payload: { runId },
      });
      expect(endQuizRes.statusCode).toBe(200);
      const endQuizData = JSON.parse(endQuizRes.body);
      expect(endQuizData.runId).toBe(runId);
      expect(endQuizData.results).toHaveLength(1);

      const finalResult = endQuizData.results[0];
      expect(finalResult.participantId).toBe(participantId);
      expect(finalResult.rank).toBe(1);
      expect(finalResult.accuracy).toBe(100);
      expect(finalResult.correctCount).toBe(5);
      expect(finalResult.score).toBeGreaterThan(4500);

      // Kiểm tra điểm thưởng EXP đã được ghi nhận trong bảng reward_log
      const expTotals = await app.rewardRepo.getParticipantExpTotals(sessionId, participantId, 'quiz-live');
      expect(expTotals.activityExp).toBeGreaterThan(0);
      expect(expTotals.sessionExp).toBeGreaterThan(0);
    } finally {
      await app.close();
      conn.sqlite.close();
    }
  });
});
