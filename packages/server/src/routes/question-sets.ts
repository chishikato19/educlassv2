import type { FastifyPluginAsync } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { getOwnerFilterId } from '@educlass/core';
import type { AssetRepository, QuestionSetRepository } from '@educlass/db';
import {
  CreateQuestionSetRequestSchema,
  EduclassPackageSchema,
  formatProtocolError,
  UpdateQuestionSetRequestSchema,
  type EduclassPackage,
} from '@educlass/protocol';
import { QuestionSchema, parseWordDocx, generateStandardExamTemplateDocx } from '@educlass/question-kit';
import type { AuthService } from '../auth/auth-service.js';
import { createOwnerGuard } from '../auth/owner-guard.js';
import { createAuthenticateHook } from '../auth/plugin.js';

export interface QuestionSetsRoutesOptions {
  authService: AuthService;
  questionSetRepo: QuestionSetRepository;
  assetRepo: AssetRepository;
  assetsDir?: string | undefined;
}

function getExtensionForMime(mime: string): string {
  switch (mime.toLowerCase()) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/svg+xml':
      return 'svg';
    default:
      return 'bin';
  }
}

/**
 * Trích xuất toàn bộ các SHA-256 hash của ảnh nhúng trong một câu hỏi
 */
function extractHashesFromObject(obj: unknown, hashes: Set<string>): void {
  if (!obj || typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      extractHashesFromObject(item, hashes);
    }
    return;
  }

  const record = obj as Record<string, unknown>;
  if (Array.isArray(record['images'])) {
    for (const img of record['images']) {
      if (typeof img === 'string' && img.length > 0) {
        // Nếu là URL dạng /api/assets/<hash>, bóc tách lấy hash
        const urlMatch = img.match(/\/api\/assets\/([a-f0-9]{64})/i);
        if (urlMatch && urlMatch[1]) {
          hashes.add(urlMatch[1].toLowerCase());
        } else if (/^[a-f0-9]{64}$/i.test(img)) {
          hashes.add(img.toLowerCase());
        }
      }
    }
  }

  for (const value of Object.values(record)) {
    if (typeof value === 'object' && value !== null) {
      extractHashesFromObject(value, hashes);
    }
  }
}

/**
 * Trích xuất toàn bộ các mã hash SHA-256 của ảnh từ danh sách câu hỏi trong database
 */
function extractAssetHashesFromQuestions(
  rawQuestions: Array<{ contentJson: string; answerJson: string }>,
): string[] {
  const hashes = new Set<string>();
  const hexRegex = /[a-f0-9]{64}/gi;

  for (const q of rawQuestions) {
    if (q.contentJson) {
      const matches = q.contentJson.match(hexRegex);
      if (matches) {
        for (const m of matches) hashes.add(m.toLowerCase());
      }
    }
    if (q.answerJson) {
      const matches = q.answerJson.match(hexRegex);
      if (matches) {
        for (const m of matches) hashes.add(m.toLowerCase());
      }
    }
  }

  return Array.from(hashes);
}

/**
 * Dọn dẹp các tệp ảnh và bản ghi asset không còn được bất kỳ câu hỏi nào trong DB tham chiếu
 */
async function cleanupOrphanAssets(
  hashes: string[],
  questionSetRepo: QuestionSetRepository,
  assetRepo: AssetRepository,
  assetsDir: string,
): Promise<string[]> {
  const cleaned: string[] = [];
  for (const hash of hashes) {
    // Kiểm tra xem còn câu hỏi nào trong cơ sở dữ liệu tham chiếu mã hash này không
    const isReferenced = await questionSetRepo.isAssetReferenced(hash);
    if (!isReferenced) {
      // 1. Tìm bản ghi trong DB để lấy đường dẫn file chính xác
      const assetRec = await assetRepo.findBySha256(hash);
      if (assetRec?.path && fs.existsSync(assetRec.path)) {
        try {
          fs.unlinkSync(assetRec.path);
        } catch {
          // Bỏ qua lỗi xóa file vật lý
        }
      }

      // 2. Dọn các file khớp với hash.* trong thư mục assets để đảm bảo triệt để
      try {
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
      } catch {
        // Bỏ qua
      }

      // 3. Xóa bản ghi trong bảng assets
      await assetRepo.deleteBySha256(hash);
      cleaned.push(hash);
    }
  }
  return cleaned;
}

/**
 * Bóc tách và chuyển đổi các ảnh Base64 Data URL thành CAS Asset lưu trên đĩa và DB
 */
async function processInlineBase64Images(
  rawQuestions: unknown[],
  assetsDir: string,
  assetRepo: AssetRepository,
): Promise<unknown[]> {
  const saveBase64 = async (dataUrl: string): Promise<string | null> => {
    const match = dataUrl.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
    if (!match || !match[1] || !match[2]) return null;
    const mime = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length === 0) return null;

    const hash = createHash('sha256').update(buffer).digest('hex');
    const ext = getExtensionForMime(mime);
    const fileName = `${hash}.${ext}`;
    const filePath = path.join(assetsDir, fileName);

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, buffer);
    }

    await assetRepo.findOrCreate({
      sha256: hash,
      mime,
      path: filePath,
      size: buffer.length,
    });

    return hash;
  };

  const traverseAndReplace = async (node: unknown): Promise<unknown> => {
    if (!node || typeof node !== 'object') {
      if (typeof node === 'string' && node.startsWith('data:image/')) {
        const hash = await saveBase64(node);
        if (hash) return `/api/assets/${hash}`;
      }
      return node;
    }

    if (Array.isArray(node)) {
      const newArr = [];
      for (const item of node) {
        if (typeof item === 'string' && item.startsWith('data:image/')) {
          const hash = await saveBase64(item);
          newArr.push(hash ? hash : item);
        } else {
          newArr.push(await traverseAndReplace(item));
        }
      }
      return newArr;
    }

    const obj = node as Record<string, unknown>;
    const copy: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(obj)) {
      if (key === 'images' && Array.isArray(val)) {
        const newImages: string[] = [];
        for (const img of val) {
          if (typeof img === 'string' && img.startsWith('data:image/')) {
            const hash = await saveBase64(img);
            newImages.push(hash ? hash : img);
          } else if (typeof img === 'string') {
            newImages.push(img);
          }
        }
        copy[key] = newImages;
      } else if (typeof val === 'string' && val.includes('data:image/')) {
        let replacedStr = val;
        const dataUrlRegex = /data:image\/[a-zA-Z0-9/+-]+;base64,[A-Za-z0-9+/=]+/g;
        const matches = val.match(dataUrlRegex);
        if (matches) {
          for (const m of matches) {
            const hash = await saveBase64(m);
            if (hash) {
              replacedStr = replacedStr.replaceAll(m, `/api/assets/${hash}`);
            }
          }
        }
        copy[key] = replacedStr;
      } else {
        copy[key] = await traverseAndReplace(val);
      }
    }
    return copy;
  };

  const processedList = [];
  for (const q of rawQuestions) {
    processedList.push(await traverseAndReplace(q));
  }
  return processedList;
}

function transformQuestionsForDb(rawQuestions: unknown[]): Array<{
  id?: string;
  type: 'mcq4' | 'tf' | 'tf_group' | 'short';
  contentJson: string;
  answerJson: string;
  points: number;
}> {
  const result = [];
  for (const item of rawQuestions) {
    if (!item || typeof item !== 'object') continue;
    const qObj = item as Record<string, unknown>;
    const type = (qObj['type'] as 'mcq4' | 'tf' | 'tf_group' | 'short') ?? 'mcq4';
    const points = typeof qObj['points'] === 'number' ? qObj['points'] : 10;
    const id = typeof qObj['id'] === 'string' ? qObj['id'] : undefined;

    // Nếu đối tượng câu hỏi đã được đóng gói sẵn thành contentJson và answerJson
    if (typeof qObj['contentJson'] === 'string') {
      const qItem: {
        id?: string;
        type: 'mcq4' | 'tf' | 'tf_group' | 'short';
        contentJson: string;
        answerJson: string;
        points: number;
      } = {
        type,
        contentJson: qObj['contentJson'],
        answerJson: typeof qObj['answerJson'] === 'string' ? qObj['answerJson'] : '{}',
        points,
      };
      if (id !== undefined) {
        qItem.id = id;
      }
      result.push(qItem);
      continue;
    }

    // Tách các trường đáp án và đề bài
    const {
      id: _id,
      type: _type,
      points: _points,
      orderIndex: _orderIndex,
      correct,
      accepted,
      scale,
      explanation,
      ...contentOnly
    } = qObj;

    const answerObj: Record<string, unknown> = {};
    if (correct !== undefined) answerObj['correct'] = correct;
    if (accepted !== undefined) answerObj['accepted'] = accepted;
    if (scale !== undefined) answerObj['scale'] = scale;
    if (explanation !== undefined) answerObj['explanation'] = explanation;

    const qItem: {
      id?: string;
      type: 'mcq4' | 'tf' | 'tf_group' | 'short';
      contentJson: string;
      answerJson: string;
      points: number;
    } = {
      type,
      contentJson: JSON.stringify(contentOnly),
      answerJson: JSON.stringify(answerObj),
      points,
    };
    if (id !== undefined) {
      qItem.id = id;
    }
    result.push(qItem);
  }
  return result;
}

function restoreQuestionsFromDb(rawQuestions: Array<{
  id: string;
  setId?: string;
  orderIndex?: number;
  type: string;
  contentJson: string;
  answerJson: string;
  points: number;
}>): unknown[] {
  return rawQuestions.map((q) => {
    let content: Record<string, unknown> = {};
    let answer: Record<string, unknown> = {};
    try {
      content = JSON.parse(q.contentJson) as Record<string, unknown>;
    } catch {
      // Bỏ qua lỗi
    }
    try {
      answer = JSON.parse(q.answerJson) as Record<string, unknown>;
    } catch {
      // Bỏ qua lỗi
    }
    return {
      id: q.id,
      type: q.type,
      points: q.points,
      orderIndex: q.orderIndex,
      ...content,
      ...answer,
    };
  });
}

export const questionSetsRoutes: FastifyPluginAsync<QuestionSetsRoutesOptions> = async (
  fastify,
  options,
) => {
  const { authService, questionSetRepo, assetRepo } = options;
  const authenticate = createAuthenticateHook(authService);
  const assetsDir = options.assetsDir ?? path.join(process.cwd(), 'data', 'assets');

  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const questionSetOwnerGuard = createOwnerGuard(authService, async (request) => {
    const { id } = request.params as { id: string };
    return questionSetRepo.findById(id);
  });

  /**
   * GET /api/question-sets
   * Lấy danh sách bộ đề theo phân quyền (GV chỉ thấy của mình, Admin thấy tất cả)
   * Hỗ trợ tìm kiếm theo tiêu đề/môn học và lọc theo thẻ/thư mục (tags), môn học, khối lớp
   */
  fastify.get('/api/question-sets', { preHandler: authenticate }, async (request, reply) => {
    const ownerFilterId = getOwnerFilterId(request.user!);
    const query = request.query as {
      search?: string;
      tag?: string;
      subject?: string;
      grade?: string;
    };

    const filter: {
      ownerId?: string;
      search?: string;
      tag?: string;
      subject?: string;
      grade?: number;
    } = {};

    if (ownerFilterId) {
      filter.ownerId = ownerFilterId;
    }
    if (query.search) {
      filter.search = query.search.trim();
    }
    if (query.tag) {
      filter.tag = query.tag.trim();
    }
    if (query.subject) {
      filter.subject = query.subject.trim();
    }
    if (query.grade !== undefined && !Number.isNaN(Number(query.grade))) {
      filter.grade = Number(query.grade);
    }

    const list = await questionSetRepo.list(filter);
    return reply.status(200).send({
      questionSets: list,
    });
  });

  /**
   * POST /api/question-sets
   * Tạo mới bộ câu hỏi (kèm danh sách câu hỏi nếu có)
   */
  fastify.post('/api/question-sets', { preHandler: authenticate }, async (request, reply) => {
    const parseResult = CreateQuestionSetRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: formatProtocolError(
          'INVALID_PAYLOAD',
          parseResult.error.errors[0]?.message ?? 'Dữ liệu tạo bộ đề không hợp lệ',
          parseResult.error.format(),
        ),
      });
    }

    let rawQuestions = parseResult.data.questions;
    if (rawQuestions && rawQuestions.length > 0) {
      rawQuestions = (await processInlineBase64Images(
        rawQuestions,
        assetsDir,
        assetRepo,
      )) as typeof rawQuestions;
    }

    const questionsToInsert = rawQuestions
      ? transformQuestionsForDb(rawQuestions)
      : undefined;

    const createPayload: Parameters<typeof questionSetRepo.create>[0] = {
      ownerId: request.user!.id,
      title: parseResult.data.title,
      subject: parseResult.data.subject,
      grade: parseResult.data.grade,
      tags: parseResult.data.tags,
    };
    if (questionsToInsert && questionsToInsert.length > 0) {
      createPayload.questions = questionsToInsert;
    }

    const created = await questionSetRepo.create(createPayload);

    return reply.status(201).send({
      questionSet: created,
    });
  });

  /**
   * POST /api/question-sets/import
   * Nhập bộ câu hỏi từ file .educlass
   */
  fastify.post('/api/question-sets/import', { preHandler: authenticate }, async (request, reply) => {
    const parseResult = EduclassPackageSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: formatProtocolError(
          'INVALID_PAYLOAD',
          parseResult.error.errors[0]?.message ?? 'Gói file .educlass không hợp lệ',
          parseResult.error.format(),
        ),
      });
    }

    const pkg = parseResult.data;

    // 1. Nhập và lưu trữ các assets đính kèm vào kho CAS
    if (pkg.assets && pkg.assets.length > 0) {
      for (const asset of pkg.assets) {
        try {
          const buffer = Buffer.from(asset.base64, 'base64');
          const computedHash = createHash('sha256').update(buffer).digest('hex');
          const ext = getExtensionForMime(asset.mime);
          const fileName = `${computedHash}.${ext}`;
          const filePath = path.join(assetsDir, fileName);

          if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, buffer);
          }

          await assetRepo.findOrCreate({
            sha256: computedHash,
            mime: asset.mime,
            path: filePath,
            size: buffer.length,
          });
        } catch {
          // Bỏ qua lỗi asset đơn lẻ để đảm bảo import không gãy hoàn toàn
        }
      }
    }

    // 2. Chuyển đổi và tạo bộ đề mới
    const questionsToInsert = pkg.questions.map((q) => {
      const type = (q['type'] as 'mcq4' | 'tf' | 'tf_group' | 'short') ?? 'mcq4';
      const points = typeof q['points'] === 'number' ? q['points'] : 10;

      // Tách content và answer
      const {
        id: _id,
        type: _type,
        points: _points,
        correct,
        accepted,
        scale,
        explanation,
        ...contentRest
      } = q;

      const answerObj: Record<string, unknown> = {};
      if (correct !== undefined) answerObj['correct'] = correct;
      if (accepted !== undefined) answerObj['accepted'] = accepted;
      if (scale !== undefined) answerObj['scale'] = scale;
      if (explanation !== undefined) answerObj['explanation'] = explanation;

      return {
        type,
        contentJson: JSON.stringify(contentRest),
        answerJson: JSON.stringify(answerObj),
        points,
      };
    });

    const newSet = await questionSetRepo.create({
      ownerId: request.user!.id,
      title: pkg.questionSet.title,
      subject: pkg.questionSet.subject,
      grade: pkg.questionSet.grade,
      tags: pkg.questionSet.tags,
      questions: questionsToInsert,
    });

    return reply.status(201).send({
      questionSet: newSet,
    });
  });

  /**
   * GET /api/question-sets/:id
   * Lấy chi tiết bộ đề kèm danh sách câu hỏi đã được giải mã đầy đủ
   */
  fastify.get(
    '/api/question-sets/:id',
    { preHandler: [authenticate, questionSetOwnerGuard] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const set = await questionSetRepo.findWithQuestions(id);
      if (!set) {
        return reply.status(404).send({
          error: formatProtocolError('QUESTION_SET_NOT_FOUND', 'Không tìm thấy bộ đề'),
        });
      }
      const restored = restoreQuestionsFromDb(set.questions);
      return reply.status(200).send({
        questionSet: {
          ...set,
          questions: restored,
        },
        questions: restored,
      });
    },
  );

  /**
   * PUT /api/question-sets/:id
   * Cập nhật thông tin tiêu đề, môn, khối lớp, tags và câu hỏi của bộ đề
   */
  fastify.put(
    '/api/question-sets/:id',
    { preHandler: [authenticate, questionSetOwnerGuard] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parseResult = UpdateQuestionSetRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: formatProtocolError(
            'INVALID_PAYLOAD',
            parseResult.error.errors[0]?.message ?? 'Dữ liệu cập nhật bộ đề không hợp lệ',
            parseResult.error.format(),
          ),
        });
      }

      if (parseResult.data.questions) {
        // Thu thập hash cũ trước khi cập nhật câu hỏi mới
        const existingSet = await questionSetRepo.findWithQuestions(id);
        const oldHashes = existingSet ? extractAssetHashesFromQuestions(existingSet.questions) : [];

        // Xử lý các ảnh Base64 nếu có
        const processedQuestions = (await processInlineBase64Images(
          parseResult.data.questions,
          assetsDir,
          assetRepo,
        )) as Array<Record<string, unknown>>;

        const questionsToUpdate = transformQuestionsForDb(processedQuestions);
        await questionSetRepo.updateQuestions(id, questionsToUpdate);

        // Sau khi update, dọn dẹp các ảnh cũ bị gỡ bỏ mà không còn đề nào dùng
        if (oldHashes.length > 0) {
          await cleanupOrphanAssets(oldHashes, questionSetRepo, assetRepo, assetsDir);
        }
      }

      const updated = await questionSetRepo.update(id, parseResult.data);
      return reply.status(200).send({
        questionSet: updated,
      });
    },
  );

  /**
   * PUT /api/question-sets/:id/questions
   * Cập nhật danh sách câu hỏi trong bộ đề
   */
  fastify.put(
    '/api/question-sets/:id/questions',
    { preHandler: [authenticate, questionSetOwnerGuard] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as { questions?: unknown[] };

      if (!body || !Array.isArray(body.questions)) {
        return reply.status(400).send({
          error: formatProtocolError('INVALID_PAYLOAD', 'Danh sách câu hỏi không hợp lệ'),
        });
      }

      // Thu thập hash cũ trước khi cập nhật câu hỏi mới
      const existingSet = await questionSetRepo.findWithQuestions(id);
      const oldHashes = existingSet ? extractAssetHashesFromQuestions(existingSet.questions) : [];

      const rawQuestions = (await processInlineBase64Images(
        body.questions,
        assetsDir,
        assetRepo,
      )) as unknown[];

      const questionsToUpdate = [];
      for (const item of rawQuestions) {
        const parsed = QuestionSchema.safeParse({
          id: (item as { id?: string })?.id ?? 'temp_id',
          ...(item as Record<string, unknown>),
        });

        if (!parsed.success) {
          return reply.status(400).send({
            error: formatProtocolError(
              'INVALID_PAYLOAD',
              `Câu hỏi không đúng định dạng: ${parsed.error.errors[0]?.message}`,
              parsed.error.format(),
            ),
          });
        }

        const q = parsed.data;
        const {
          id: _id,
          type,
          points,
          orderIndex: _orderIndex,
          ...rest
        } = q as unknown as Record<string, unknown>;

        // Phân biệt các trường đáp án và đề bài
        const { correct, accepted, scale, explanation, ...contentOnly } = rest;
        const answerObj: Record<string, unknown> = {};
        if (correct !== undefined) answerObj['correct'] = correct;
        if (accepted !== undefined) answerObj['accepted'] = accepted;
        if (scale !== undefined) answerObj['scale'] = scale;
        if (explanation !== undefined) answerObj['explanation'] = explanation;

        questionsToUpdate.push({
          type: type as 'mcq4' | 'tf' | 'tf_group' | 'short',
          contentJson: JSON.stringify(contentOnly),
          answerJson: JSON.stringify(answerObj),
          points: (points as number) ?? 10,
        });
      }

      const result = await questionSetRepo.updateQuestions(id, questionsToUpdate);

      // Sau khi update, dọn dẹp các ảnh cũ bị gỡ bỏ mà không còn đề nào dùng
      if (oldHashes.length > 0) {
        await cleanupOrphanAssets(oldHashes, questionSetRepo, assetRepo, assetsDir);
      }

      return reply.status(200).send({
        questions: result,
      });
    },
  );

  /**
   * POST /api/question-sets/:id/clone
   * Nhân bản bộ câu hỏi cho giáo viên đang đăng nhập
   */
  fastify.post('/api/question-sets/:id/clone', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as { title?: string }) ?? {};

    const original = await questionSetRepo.findById(id);
    if (!original) {
      return reply.status(404).send({
        error: formatProtocolError('QUESTION_SET_NOT_FOUND', 'Không tìm thấy bộ đề để nhân bản'),
      });
    }

    const cloned = await questionSetRepo.clone(id, request.user!.id, {
      newTitle: body.title,
    });

    return reply.status(201).send({
      questionSet: cloned,
    });
  });

  /**
   * GET /api/question-sets/:id/export
   * Xuất bộ đề ra file định dạng .educlass kèm toàn bộ ảnh nhúng CAS Base64
   */
  fastify.get(
    '/api/question-sets/:id/export',
    { preHandler: [authenticate, questionSetOwnerGuard] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const set = await questionSetRepo.findWithQuestions(id);
      if (!set) {
        return reply.status(404).send({
          error: formatProtocolError('QUESTION_SET_NOT_FOUND', 'Không tìm thấy bộ đề'),
        });
      }

      const hashes = new Set<string>();
      const restoredQuestions = set.questions.map((q) => {
        let content = {};
        let answer = {};
        try {
          content = JSON.parse(q.contentJson);
        } catch {
          // Bỏ qua lỗi cú pháp JSON và dùng object rỗng
        }
        try {
          answer = JSON.parse(q.answerJson);
        } catch {
          // Bỏ qua lỗi cú pháp JSON và dùng object rỗng
        }

        extractHashesFromObject(content, hashes);
        extractHashesFromObject(answer, hashes);

        return {
          id: q.id,
          type: q.type,
          points: q.points,
          ...content,
          ...answer,
        };
      });

      // Lấy assets từ database và disk
      const assetsList: Array<{ sha256: string; mime: string; base64: string }> = [];
      for (const hash of hashes) {
        const assetRec = await assetRepo.findBySha256(hash);
        if (assetRec) {
          const filePath = assetRec.path && fs.existsSync(assetRec.path)
            ? assetRec.path
            : path.join(assetsDir, `${hash}.${getExtensionForMime(assetRec.mime)}`);
          if (fs.existsSync(filePath)) {
            const buf = fs.readFileSync(filePath);
            assetsList.push({
              sha256: hash,
              mime: assetRec.mime,
              base64: buf.toString('base64'),
            });
          }
        }
      }

      const educlassPackage: EduclassPackage = {
        format: 'educlass',
        version: 1,
        exportedAt: Date.now(),
        questionSet: {
          title: set.title,
          subject: set.subject,
          grade: set.grade,
          tags: set.tags,
        },
        questions: restoredQuestions as Array<Record<string, unknown>>,
        assets: assetsList,
      };

      reply.header(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(set.title)}.educlass"`,
      );
      reply.header('Content-Type', 'application/json');

      return reply.status(200).send(educlassPackage);
    },
  );

  /**
   * GET /api/question-sets/templates/word
   * Tải về tập tin Word mẫu chuẩn để giáo viên soạn đề
   */
  fastify.get('/api/question-sets/templates/word', async (_request, reply) => {
    const fixturePath = path.resolve(process.cwd(), 'tests/fixtures/word-samples/de-thi-mau-educlass.docx');
    let buffer: Buffer;

    if (fs.existsSync(fixturePath)) {
      buffer = fs.readFileSync(fixturePath);
    } else {
      buffer = await generateStandardExamTemplateDocx();
    }

    reply.header(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    reply.header('Content-Disposition', 'attachment; filename="de-thi-mau-educlass.docx"');
    return reply.status(200).send(buffer);
  });

  /**
   * POST /api/question-sets/import-word
   * Phân tích tập tin Word (.docx) và trích xuất câu hỏi, công thức toán LaTeX, hình ảnh CAS
   */
  fastify.post('/api/question-sets/import-word', { preHandler: authenticate }, async (request, reply) => {
    const body = request.body as { base64?: string };
    if (!body || !body.base64 || typeof body.base64 !== 'string') {
      return reply.status(400).send({
        error: formatProtocolError('INVALID_PAYLOAD', 'Dữ liệu tập tin Word base64 không hợp lệ'),
      });
    }

    try {
      const buffer = Buffer.from(body.base64, 'base64');
      const parseResult = await parseWordDocx(buffer);

      // Lưu trữ các assets ảnh trích xuất được vào kho CAS nếu có
      for (const asset of parseResult.assets) {
        try {
          const imgBuf = Buffer.from(asset.base64, 'base64');
          const ext = getExtensionForMime(asset.mime);
          const fileName = `${asset.sha256}.${ext}`;
          const filePath = path.join(assetsDir, fileName);

          if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, imgBuf);
          }

          await assetRepo.findOrCreate({
            sha256: asset.sha256,
            mime: asset.mime,
            path: filePath,
            size: imgBuf.length,
          });
        } catch {
          // Bỏ qua lỗi asset đơn lẻ
        }
      }

      return reply.status(200).send({
        questions: parseResult.questions,
        warnings: parseResult.warnings,
        totalDetected: parseResult.totalDetected,
        successCount: parseResult.successCount,
        assets: parseResult.assets.map((a) => ({
          sha256: a.sha256,
          mime: a.mime,
        })),
      });
    } catch (err: unknown) {
      return reply.status(400).send({
        error: formatProtocolError(
          'INVALID_PAYLOAD',
          `Không thể phân tích file Word: ${err instanceof Error ? err.message : 'Định dạng file lỗi'}`,
        ),
      });
    }
  });

  /**
   * DELETE /api/question-sets/:id
   * Xóa bộ đề và dọn dẹp các tập tin hình ảnh thuộc bộ đề đó nếu không còn ai tham chiếu
   */
  fastify.delete(
    '/api/question-sets/:id',
    { preHandler: [authenticate, questionSetOwnerGuard] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      // 1. Lấy thông tin bộ đề và danh sách câu hỏi trước khi xóa
      const setWithQuestions = await questionSetRepo.findWithQuestions(id);
      if (!setWithQuestions) {
        return reply.status(404).send({
          error: formatProtocolError('QUESTION_SET_NOT_FOUND', 'Không tìm thấy bộ đề'),
        });
      }

      // 2. Trích xuất toàn bộ các SHA-256 hash của ảnh có trong bộ đề
      const hashes = extractAssetHashesFromQuestions(setWithQuestions.questions);

      // 3. Thực hiện xóa bộ đề và câu hỏi khỏi database
      const success = await questionSetRepo.deleteById(id);

      // 4. Dọn dẹp các hình ảnh thuộc đề này nếu không còn bộ đề nào khác dùng chung
      let cleanedAssets: string[] = [];
      if (success && hashes.length > 0) {
        cleanedAssets = await cleanupOrphanAssets(
          hashes,
          questionSetRepo,
          assetRepo,
          assetsDir,
        );
      }

      return reply.status(200).send({
        success,
        cleanedAssetsCount: cleanedAssets.length,
        cleanedAssets,
      });
    },
  );
};

