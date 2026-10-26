import type { FastifyPluginAsync } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type {
  AssetRepository,
  BankQuestionRepository,
  QuestionSetRepository,
} from '@educlass/db';
import {
  BatchCreateBankQuestionRequestSchema,
  CreateBankQuestionRequestSchema,
  DifficultyLevelSchema,
  MatrixGenerateRequestSchema,
  MatrixStatsRequestSchema,
  QuestionTypeSchema,
  UpdateBankQuestionRequestSchema,
  formatProtocolError,
} from '@educlass/protocol';
import type { AuthService } from '../auth/auth-service.js';
import { createAuthenticateHook } from '../auth/plugin.js';

export interface BankRoutesOptions {
  authService: AuthService;
  bankRepo: BankQuestionRepository;
  questionSetRepo: QuestionSetRepository;
  assetRepo: AssetRepository;
  assetsDir?: string | undefined;
}

/**
 * Bóc tách và chuyển đổi các ảnh Base64 Data URL thành CAS Asset lưu trên đĩa và DB
 */
async function processInlineBase64InJson(
  jsonStr: string,
  assetsDir: string,
  assetRepo: AssetRepository,
): Promise<string> {
  const dataUrlRegex = /data:image\/([a-zA-Z0-9/+-]+);base64,([a-zA-Z0-9+/=]+)/g;
  let match: RegExpExecArray | null;
  const toReplace: Array<{ full: string; sha256: string }> = [];

  while ((match = dataUrlRegex.exec(jsonStr)) !== null) {
    const full = match[0];
    const mime = `image/${match[1]}`;
    const base64 = match[2];
    if (!base64) continue;

    try {
      const buffer = Buffer.from(base64, 'base64');
      const sha256 = createHash('sha256').update(buffer).digest('hex');
      const ext = match[1] === 'jpeg' ? 'jpg' : match[1] ?? 'png';
      const fileName = `${sha256}.${ext}`;
      const filePath = path.join(assetsDir, fileName);

      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, buffer);
      }

      await assetRepo.findOrCreate({
        sha256,
        mime,
        path: filePath,
        size: buffer.length,
      });

      toReplace.push({ full, sha256 });
    } catch {
      // Bỏ qua nếu lỗi buffer
    }
  }

  let result = jsonStr;
  for (const item of toReplace) {
    result = result.replaceAll(item.full, item.sha256);
  }
  return result;
}

/**
 * Trích xuất toàn bộ các mã hash SHA-256 của ảnh từ json string
 */
function extractAssetHashesFromStrings(strs: string[]): string[] {
  const hashes = new Set<string>();
  const hexRegex = /[a-f0-9]{64}/gi;

  for (const str of strs) {
    if (!str) continue;
    const matches = str.match(hexRegex);
    if (matches) {
      for (const m of matches) hashes.add(m.toLowerCase());
    }
  }

  return Array.from(hashes);
}

/**
 * Dọn dẹp các tệp ảnh và bản ghi asset không còn được bất kỳ câu hỏi nào trong DB tham chiếu
 */
async function cleanupOrphanAssets(
  hashes: string[],
  bankRepo: BankQuestionRepository,
  questionSetRepo: QuestionSetRepository,
  assetRepo: AssetRepository,
  assetsDir: string,
): Promise<string[]> {
  const cleaned: string[] = [];
  for (const hash of hashes) {
    const isReferencedInSets = await questionSetRepo.isAssetReferenced(hash);
    const isReferencedInBank = await bankRepo.isAssetReferenced(hash);

    if (!isReferencedInSets && !isReferencedInBank) {
      const assetRec = await assetRepo.findBySha256(hash);
      if (assetRec?.path && fs.existsSync(assetRec.path)) {
        try {
          fs.unlinkSync(assetRec.path);
        } catch {
          // Bỏ qua lỗi xóa file
        }
      }

      const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bin'];
      for (const ext of extensions) {
        const p = path.join(assetsDir, `${hash}.${ext}`);
        if (fs.existsSync(p)) {
          try {
            fs.unlinkSync(p);
          } catch {
            // Bỏ qua
          }
        }
      }

      await assetRepo.deleteBySha256(hash);
      cleaned.push(hash);
    }
  }
  return cleaned;
}

export const bankRoutes: FastifyPluginAsync<BankRoutesOptions> = async (
  fastify,
  options,
) => {
  const { authService, bankRepo, questionSetRepo, assetRepo } = options;
  const authenticate = createAuthenticateHook(authService);
  const assetsDir = options.assetsDir ?? path.join(process.cwd(), 'data', 'assets');

  /**
   * GET /api/bank/tree
   * Lấy cây phân cấp Chương - Bài kèm số lượng câu hỏi của từng mức độ
   */
  fastify.get('/api/bank/tree', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as { grade?: string; subject?: string };
    const grade = query.grade ? Number(query.grade) : 12;
    const subject = query.subject?.trim() || 'Toán';
    const teacherId = request.user!.id;

    const tree = await bankRepo.getCurriculumTree(teacherId, grade, subject);
    return reply.status(200).send(tree);
  });

  /**
   * GET /api/bank/questions
   * Lọc danh sách câu hỏi trong ngân hàng
   */
  fastify.get('/api/bank/questions', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as {
      grade?: string;
      subject?: string;
      chapter?: string;
      lesson?: string;
      difficulty?: string;
      type?: string;
      search?: string;
      limit?: string;
      offset?: string;
    };

    const teacherId = request.user!.id;
    const grade = query.grade ? Number(query.grade) : undefined;
    const limit = query.limit ? Number(query.limit) : undefined;
    const offset = query.offset ? Number(query.offset) : undefined;

    const diffParse = DifficultyLevelSchema.safeParse(query.difficulty);
    const difficulty = diffParse.success ? diffParse.data : undefined;

    const typeParse = QuestionTypeSchema.safeParse(query.type);
    const type = typeParse.success ? typeParse.data : undefined;

    const questions = await bankRepo.list({
      ownerId: teacherId,
      grade,
      subject: query.subject?.trim() || undefined,
      chapter: query.chapter?.trim() || undefined,
      lesson: query.lesson?.trim() || undefined,
      difficulty,
      type,
      search: query.search?.trim() || undefined,
      limit,
      offset,
    });

    return reply.status(200).send(questions);
  });

  /**
   * GET /api/bank/questions/:id
   * Chi tiết câu hỏi ngân hàng
   */
  fastify.get('/api/bank/questions/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const question = await bankRepo.findById(id);

    if (!question) {
      return reply.status(404).send({
        error: formatProtocolError('BANK_QUESTION_NOT_FOUND', 'Không tìm thấy câu hỏi ngân hàng'),
      });
    }

    if (question.ownerId !== request.user!.id && request.user!.role !== 'admin') {
      return reply.status(403).send({
        error: formatProtocolError('FORBIDDEN', 'Bạn không có quyền xem câu hỏi này'),
      });
    }

    return reply.status(200).send(question);
  });

  /**
   * POST /api/bank/questions
   * Thêm một câu hỏi vào ngân hàng
   */
  fastify.post('/api/bank/questions', { preHandler: authenticate }, async (request, reply) => {
    const parseResult = CreateBankQuestionRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: formatProtocolError('INVALID_PAYLOAD', 'Dữ liệu câu hỏi không hợp lệ'),
        details: parseResult.error.format(),
      });
    }

    const teacherId = request.user!.id;
    const data = parseResult.data;

    // Chuyển đổi inline base64 images thành assets
    const contentJson = await processInlineBase64InJson(data.contentJson, assetsDir, assetRepo);
    const answerJson = await processInlineBase64InJson(data.answerJson, assetsDir, assetRepo);

    const created = await bankRepo.create({
      ownerId: teacherId,
      grade: data.grade,
      subject: data.subject.trim(),
      chapter: data.chapter.trim(),
      lesson: data.lesson.trim(),
      difficulty: data.difficulty,
      type: data.type,
      contentJson,
      answerJson,
      points: data.points,
    });

    return reply.status(201).send(created);
  });

  /**
   * POST /api/bank/questions/batch
   * Nhập hàng loạt câu hỏi vào ngân hàng (phục vụ Import Word)
   */
  fastify.post('/api/bank/questions/batch', { preHandler: authenticate }, async (request, reply) => {
    const parseResult = BatchCreateBankQuestionRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: formatProtocolError('INVALID_PAYLOAD', 'Dữ liệu danh sách câu hỏi không hợp lệ'),
        details: parseResult.error.format(),
      });
    }

    const teacherId = request.user!.id;
    const itemsToInsert = [];

    for (const q of parseResult.data.questions) {
      const contentJson = await processInlineBase64InJson(q.contentJson, assetsDir, assetRepo);
      const answerJson = await processInlineBase64InJson(q.answerJson, assetsDir, assetRepo);
      itemsToInsert.push({
        ownerId: teacherId,
        grade: q.grade,
        subject: q.subject.trim(),
        chapter: q.chapter.trim(),
        lesson: q.lesson.trim(),
        difficulty: q.difficulty,
        type: q.type,
        contentJson,
        answerJson,
        points: q.points,
      });
    }

    const count = await bankRepo.createMany(itemsToInsert);
    return reply.status(201).send({ success: true, count });
  });

  /**
   * PUT /api/bank/questions/:id
   * Cập nhật câu hỏi trong ngân hàng
   */
  fastify.put('/api/bank/questions/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await bankRepo.findById(id);

    if (!existing) {
      return reply.status(404).send({
        error: formatProtocolError('BANK_QUESTION_NOT_FOUND', 'Không tìm thấy câu hỏi ngân hàng'),
      });
    }

    if (existing.ownerId !== request.user!.id && request.user!.role !== 'admin') {
      return reply.status(403).send({
        error: formatProtocolError('FORBIDDEN', 'Bạn không có quyền sửa câu hỏi này'),
      });
    }

    const parseResult = UpdateBankQuestionRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: formatProtocolError('INVALID_PAYLOAD', 'Dữ liệu cập nhật không hợp lệ'),
        details: parseResult.error.format(),
      });
    }

    const data = parseResult.data;
    const updatePayload: Record<string, unknown> = {};

    if (data.grade !== undefined) updatePayload.grade = data.grade;
    if (data.subject !== undefined) updatePayload.subject = data.subject.trim();
    if (data.chapter !== undefined) updatePayload.chapter = data.chapter.trim();
    if (data.lesson !== undefined) updatePayload.lesson = data.lesson.trim();
    if (data.difficulty !== undefined) updatePayload.difficulty = data.difficulty;
    if (data.type !== undefined) updatePayload.type = data.type;
    if (data.points !== undefined) updatePayload.points = data.points;

    if (data.contentJson !== undefined) {
      updatePayload.contentJson = await processInlineBase64InJson(data.contentJson, assetsDir, assetRepo);
    }
    if (data.answerJson !== undefined) {
      updatePayload.answerJson = await processInlineBase64InJson(data.answerJson, assetsDir, assetRepo);
    }

    const updated = await bankRepo.update(id, updatePayload);
    return reply.status(200).send(updated);
  });

  /**
   * DELETE /api/bank/questions/:id
   * Xóa câu hỏi khỏi ngân hàng và dọn dẹp ảnh mồ côi nếu có
   */
  fastify.delete('/api/bank/questions/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await bankRepo.findById(id);

    if (!existing) {
      return reply.status(404).send({
        error: formatProtocolError('BANK_QUESTION_NOT_FOUND', 'Không tìm thấy câu hỏi ngân hàng'),
      });
    }

    if (existing.ownerId !== request.user!.id && request.user!.role !== 'admin') {
      return reply.status(403).send({
        error: formatProtocolError('FORBIDDEN', 'Bạn không có quyền xóa câu hỏi này'),
      });
    }

    const hashes = extractAssetHashesFromStrings([existing.contentJson, existing.answerJson]);
    const success = await bankRepo.delete(id);

    let cleanedAssets: string[] = [];
    if (success && hashes.length > 0) {
      cleanedAssets = await cleanupOrphanAssets(
        hashes,
        bankRepo,
        questionSetRepo,
        assetRepo,
        assetsDir,
      );
    }

    return reply.status(200).send({
      success,
      cleanedAssetsCount: cleanedAssets.length,
    });
  });

  /**
   * POST /api/bank/matrix-stats
   * Thống kê số câu sẵn có theo từng bài cho bảng ma trận
   */
  fastify.post('/api/bank/matrix-stats', { preHandler: authenticate }, async (request, reply) => {
    const parseResult = MatrixStatsRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: formatProtocolError('INVALID_PAYLOAD', 'Dữ liệu yêu cầu thống kê không hợp lệ'),
        details: parseResult.error.format(),
      });
    }

    const { grade, subject, lessons } = parseResult.data;
    const teacherId = request.user!.id;

    const stats = await bankRepo.getMatrixStats(teacherId, grade, subject, lessons);
    return reply.status(200).send({ stats });
  });

  /**
   * POST /api/bank/generate-set
   * Thuật toán bốc ngẫu nhiên câu hỏi theo ma trận và lưu snapshot vào Bộ đề (question_sets)
   */
  fastify.post('/api/bank/generate-set', { preHandler: authenticate }, async (request, reply) => {
    const parseResult = MatrixGenerateRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: formatProtocolError('INVALID_PAYLOAD', 'Cấu hình ma trận không hợp lệ'),
        details: parseResult.error.format(),
      });
    }

    const { title, grade, subject, matrix, shuffleQuestions } = parseResult.data;
    const teacherId = request.user!.id;

    // 1. Thu thập câu hỏi ngẫu nhiên theo ma trận
    const pickedBankQuestions: Array<Awaited<ReturnType<typeof bankRepo.pickRandom>>[number]> = [];
    for (const row of matrix) {
      const diffLevels: Array<'nb' | 'th' | 'vd' | 'vdc'> = ['nb', 'th', 'vd', 'vdc'];
      for (const diff of diffLevels) {
        const countNeeded = row.counts[diff] ?? 0;
        if (countNeeded > 0) {
          const picked = await bankRepo.pickRandom(teacherId, row.lesson, diff, countNeeded);
          pickedBankQuestions.push(...picked);
        }
      }
    }

    if (pickedBankQuestions.length === 0) {
      return reply.status(400).send({
        error: formatProtocolError(
          'INVALID_PAYLOAD',
          'Không tìm thấy câu hỏi phù hợp trong kho theo ma trận đã chọn',
        ),
      });
    }

    // 2. Xáo trộn thứ tự câu nếu có yêu cầu
    if (shuffleQuestions) {
      for (let i = pickedBankQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const itemI = pickedBankQuestions[i]!;
        const itemJ = pickedBankQuestions[j]!;
        pickedBankQuestions[i] = itemJ;
        pickedBankQuestions[j] = itemI;
      }
    }

    // 3. Chuẩn bị snapshot câu hỏi đưa vào QuestionSet
    const snapshotQuestions = pickedBankQuestions.map((bq) => ({
      type: bq.type,
      contentJson: bq.contentJson,
      answerJson: bq.answerJson,
      points: bq.points,
    }));

    // 4. Tạo bộ đề mới trong question_sets
    const newSet = await questionSetRepo.create({
      ownerId: teacherId,
      title: title.trim(),
      subject: subject.trim(),
      grade,
      tags: ['Sinh từ Ma trận', `Khối ${grade}`, subject.trim()],
      questions: snapshotQuestions,
    });

    return reply.status(201).send({
      success: true,
      setId: newSet.id,
      title: newSet.title,
      totalQuestions: snapshotQuestions.length,
    });
  });

  /**
   * POST /api/bank/preview-set
   * Bốc ngẫu nhiên câu hỏi theo ma trận để xem trước và đổi câu tương đương (Task 4.2)
   */
  fastify.post('/api/bank/preview-set', { preHandler: authenticate }, async (request, reply) => {
    const parseResult = MatrixGenerateRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: formatProtocolError('INVALID_PAYLOAD', 'Cấu hình ma trận không hợp lệ'),
        details: parseResult.error.format(),
      });
    }

    const { matrix, shuffleQuestions } = parseResult.data;
    const teacherId = request.user!.id;

    // 1. Thu thập câu hỏi ngẫu nhiên theo ma trận
    const pickedBankQuestions: Array<Awaited<ReturnType<typeof bankRepo.pickRandom>>[number]> = [];
    for (const row of matrix) {
      const diffLevels: Array<'nb' | 'th' | 'vd' | 'vdc'> = ['nb', 'th', 'vd', 'vdc'];
      for (const diff of diffLevels) {
        const countNeeded = row.counts[diff] ?? 0;
        if (countNeeded > 0) {
          const picked = await bankRepo.pickRandom(teacherId, row.lesson, diff, countNeeded);
          pickedBankQuestions.push(...picked);
        }
      }
    }

    if (pickedBankQuestions.length === 0) {
      return reply.status(400).send({
        error: formatProtocolError(
          'INVALID_PAYLOAD',
          'Không tìm thấy câu hỏi phù hợp trong kho theo ma trận đã chọn',
        ),
      });
    }

    // 2. Xáo trộn thứ tự câu nếu có yêu cầu
    if (shuffleQuestions) {
      for (let i = pickedBankQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const itemI = pickedBankQuestions[i]!;
        const itemJ = pickedBankQuestions[j]!;
        pickedBankQuestions[i] = itemJ;
        pickedBankQuestions[j] = itemI;
      }
    }

    return reply.status(200).send({
      questions: pickedBankQuestions,
      totalQuestions: pickedBankQuestions.length,
    });
  });
};
