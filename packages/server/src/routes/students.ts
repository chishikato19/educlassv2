import type { FastifyPluginAsync } from 'fastify';
import { parseClipboardText, validateAndPreviewStudents } from '@educlass/core';
import type { ClassRepository, StudentRepository, StudentSelect } from '@educlass/db';
import {
  CommitStudentImportRequestSchema,
  CreateStudentRequestSchema,
  formatProtocolError,
  PreviewPasteRequestSchema,
  PreviewXlsxRequestSchema,
  SetStudentPinRequestSchema,
  UpdateAvatarRequestSchema,
  UpdateStudentRequestSchema,
  type AcademicPerformance,
  type StudentDto,
} from '@educlass/protocol';
import type { AuthService } from '../auth/auth-service.js';
import { createOwnerGuard } from '../auth/owner-guard.js';
import type { PasswordHasher } from '../auth/password-hasher.js';
import type { ExcelService } from '../services/excel-service.js';

export interface StudentsRoutesOptions {
  authService: AuthService;
  classRepo: ClassRepository;
  studentRepo: StudentRepository;
  passwordHasher: PasswordHasher;
  excelService: ExcelService;
}

export function toStudentDto(s: StudentSelect): StudentDto {
  const result: StudentDto = {
    id: s.id,
    classId: s.classId,
    groupId: s.groupId ?? null,
    fullName: s.fullName,
    hasPin: Boolean(s.passwordHash),
    exp: s.exp,
    level: s.level,
    elo: (s as { elo?: number }).elo ?? 1000,
    academicPerformance: s.academicPerformance ?? 'dat',
    createdAt: s.createdAt,
  };
  if (s.code) {
    result.code = s.code;
  }
  if (s.avatarJson) {
    result.avatarJson = s.avatarJson;
    try {
      result.avatar = JSON.parse(s.avatarJson);
    } catch {
      // ignore
    }
  }
  return result;
}

export const studentsRoutes: FastifyPluginAsync<StudentsRoutesOptions> = async (
  fastify,
  options
) => {
  const { authService, classRepo, studentRepo, passwordHasher, excelService } = options;

  // Guard bảo vệ: Chỉ chủ sở hữu của lớp học (hoặc Admin) mới được thao tác học sinh của lớp đó
  const classOwnerGuard = createOwnerGuard(authService, async request => {
    const { classId } = request.params as { classId: string };
    return classRepo.findById(classId);
  });

  /**
   * GET /api/classes/:classId/students
   * Lấy danh sách toàn bộ học sinh trong một lớp
   */
  fastify.get<{ Params: { classId: string } }>(
    '/api/classes/:classId/students',
    { preHandler: classOwnerGuard },
    async (request, reply) => {
      const { classId } = request.params;
      const list = await studentRepo.listByClassId(classId);
      return reply.status(200).send({
        students: list.map(toStudentDto),
        total: list.length,
      });
    }
  );

  /**
   * POST /api/classes/:classId/students
   * Thêm học sinh bằng tay vào lớp
   */
  fastify.post<{ Params: { classId: string } }>(
    '/api/classes/:classId/students',
    { preHandler: classOwnerGuard },
    async (request, reply) => {
      const { classId } = request.params;
      const parseResult = CreateStudentRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        reply.status(400).send({
          error: formatProtocolError(
            'INVALID_PAYLOAD',
            parseResult.error.errors[0]?.message ?? 'Dữ liệu học sinh không hợp lệ',
            parseResult.error.format()
          ),
        });
        return;
      }

      const { fullName, code, pin, academicPerformance } = parseResult.data;
      let passwordHash: string | undefined;
      if (pin && pin.length > 0) {
        passwordHash = await passwordHasher.hash(pin);
      }

      const created = await studentRepo.create({
        classId,
        fullName,
        code,
        passwordHash,
        academicPerformance: academicPerformance ?? 'dat',
      });

      return reply.status(201).send({
        student: toStudentDto(created),
      });
    }
  );

  /**
   * PATCH /api/classes/:classId/students/:studentId
   * Sửa thông tin học sinh (họ tên, mã HS)
   */
  fastify.patch<{ Params: { classId: string; studentId: string } }>(
    '/api/classes/:classId/students/:studentId',
    { preHandler: classOwnerGuard },
    async (request, reply) => {
      const { studentId } = request.params;
      const parseResult = UpdateStudentRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        reply.status(400).send({
          error: formatProtocolError(
            'INVALID_PAYLOAD',
            parseResult.error.errors[0]?.message ?? 'Dữ liệu cập nhật học sinh không hợp lệ',
            parseResult.error.format()
          ),
        });
        return;
      }

      const updated = await studentRepo.update(studentId, parseResult.data);
      if (!updated) {
        reply.status(404).send({ error: formatProtocolError('STUDENT_NOT_FOUND') });
        return;
      }

      return reply.status(200).send({
        student: toStudentDto(updated),
      });
    }
  );

  /**
   * POST /api/classes/:classId/students/:studentId/pin
   * Đặt hoặc xóa (reset) mã PIN cho học sinh
   */
  fastify.post<{ Params: { classId: string; studentId: string } }>(
    '/api/classes/:classId/students/:studentId/pin',
    { preHandler: classOwnerGuard },
    async (request, reply) => {
      const { studentId } = request.params;
      const parseResult = SetStudentPinRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        reply.status(400).send({
          error: formatProtocolError(
            'INVALID_PAYLOAD',
            parseResult.error.errors[0]?.message ?? 'Mã PIN không hợp lệ',
            parseResult.error.format()
          ),
        });
        return;
      }

      const { pin } = parseResult.data;
      let passwordHash: string | null = null;
      if (pin && pin.length > 0) {
        passwordHash = await passwordHasher.hash(pin);
      }

      const updated = await studentRepo.updatePin(studentId, passwordHash);
      if (!updated) {
        reply.status(404).send({ error: formatProtocolError('STUDENT_NOT_FOUND') });
        return;
      }

      return reply.status(200).send({
        success: true,
        hasPin: Boolean(updated.passwordHash),
      });
    }
  );

  /**
   * DELETE /api/classes/:classId/students/:studentId
   * Xóa một học sinh khỏi lớp
   */
  fastify.delete<{ Params: { classId: string; studentId: string } }>(
    '/api/classes/:classId/students/:studentId',
    { preHandler: classOwnerGuard },
    async (request, reply) => {
      const { studentId } = request.params;
      const deleted = await studentRepo.deleteById(studentId);
      if (!deleted) {
        reply.status(404).send({ error: formatProtocolError('STUDENT_NOT_FOUND') });
        return;
      }
      return reply.status(200).send({ success: true });
    }
  );

  /**
   * POST /api/classes/:classId/students/preview-paste
   * Phân tích và xem trước dữ liệu dán từ clipboard (báo trùng/thiếu)
   */
  fastify.post<{ Params: { classId: string } }>(
    '/api/classes/:classId/students/preview-paste',
    { preHandler: classOwnerGuard },
    async (request, reply) => {
      const { classId } = request.params;
      const parseResult = PreviewPasteRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        reply.status(400).send({
          error: formatProtocolError(
            'INVALID_PAYLOAD',
            parseResult.error.errors[0]?.message ?? 'Dữ liệu dán không hợp lệ',
            parseResult.error.format()
          ),
        });
        return;
      }

      const rows = parseClipboardText(parseResult.data.text);
      const existingStudents = await studentRepo.listByClassId(classId);
      const preview = validateAndPreviewStudents(rows, existingStudents);

      return reply.status(200).send(preview);
    }
  );

  /**
   * POST /api/classes/:classId/students/preview-xlsx
   * Phân tích và xem trước tệp Excel tải lên (dạng Base64)
   */
  fastify.post<{ Params: { classId: string } }>(
    '/api/classes/:classId/students/preview-xlsx',
    { preHandler: classOwnerGuard },
    async (request, reply) => {
      const { classId } = request.params;
      const parseResult = PreviewXlsxRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        reply.status(400).send({
          error: formatProtocolError(
            'INVALID_PAYLOAD',
            parseResult.error.errors[0]?.message ?? 'Tập tin Excel không hợp lệ',
            parseResult.error.format()
          ),
        });
        return;
      }

      try {
        const buffer = Buffer.from(parseResult.data.fileBase64, 'base64');
        const rows = excelService.parseXlsxBuffer(buffer);
        const existingStudents = await studentRepo.listByClassId(classId);
        const preview = validateAndPreviewStudents(rows, existingStudents);

        return reply.status(200).send(preview);
      } catch {
        return reply.status(400).send({
          error: formatProtocolError('INVALID_PAYLOAD', 'Không thể đọc nội dung tập tin Excel.'),
        });
      }
    }
  );

  /**
   * POST /api/classes/:classId/students/import
   * Xác nhận import danh sách học sinh vào lớp học
   */
  fastify.post<{ Params: { classId: string } }>(
    '/api/classes/:classId/students/import',
    { preHandler: classOwnerGuard },
    async (request, reply) => {
      const { classId } = request.params;
      const parseResult = CommitStudentImportRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        reply.status(400).send({
          error: formatProtocolError(
            'INVALID_PAYLOAD',
            parseResult.error.errors[0]?.message ?? 'Dữ liệu nhập học sinh không hợp lệ',
            parseResult.error.format()
          ),
        });
        return;
      }

      const { students: importList, skipDuplicates } = parseResult.data;
      const existing = await studentRepo.listByClassId(classId);
      const existingNames = new Set(existing.map(s => s.fullName.toLowerCase().trim()));
      const existingCodes = new Set(
        existing.map(s => s.code?.toLowerCase().trim()).filter((c): c is string => Boolean(c))
      );

      const toInsert: Array<{
        classId: string;
        fullName: string;
        code?: string | undefined;
        passwordHash?: string | undefined;
        academicPerformance?: AcademicPerformance | undefined;
      }> = [];

      for (const item of importList) {
        const nameKey = item.fullName.toLowerCase().trim();
        const codeKey = item.code?.toLowerCase().trim();

        if (skipDuplicates) {
          if (existingNames.has(nameKey) || (codeKey && existingCodes.has(codeKey))) {
            continue; // Bỏ qua học sinh trùng lặp
          }
        }

        let passwordHash: string | undefined;
        if (item.pin && item.pin.length > 0) {
          passwordHash = await passwordHasher.hash(item.pin);
        }

        toInsert.push({
          classId,
          fullName: item.fullName,
          code: item.code,
          passwordHash,
          academicPerformance: item.academicPerformance ?? 'dat',
        });

        // Cập nhật tập tên để chống trùng trong cùng đợt import nếu trùng lặp lặp lại
        existingNames.add(nameKey);
        if (codeKey) {
          existingCodes.add(codeKey);
        }
      }

      const inserted = await studentRepo.createMany(toInsert);

      return reply.status(201).send({
        added: inserted.length,
        insertedCount: inserted.length,
        students: inserted.map(toStudentDto),
      });
    }
  );

  /**
   * PATCH /api/students/:studentId/avatar
   * Cập nhật avatar/diện mạo của học sinh
   */
  fastify.patch<{ Params: { studentId: string } }>(
    '/api/students/:studentId/avatar',
    async (request, reply) => {
      const { studentId } = request.params;
      const parseResult = UpdateAvatarRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        reply.status(400).send({
          error: formatProtocolError(
            'INVALID_PAYLOAD',
            parseResult.error.errors[0]?.message ?? 'Cấu hình avatar không hợp lệ',
            parseResult.error.format()
          ),
        });
        return;
      }

      const updated = await studentRepo.updateAvatar(
        studentId,
        JSON.stringify(parseResult.data.avatar)
      );
      if (!updated) {
        reply.status(404).send({
          error: formatProtocolError('STUDENT_NOT_FOUND', 'Không tìm thấy học sinh với ID này.'),
        });
        return;
      }

      return reply.status(200).send({
        success: true,
        avatar: parseResult.data.avatar,
        student: toStudentDto(updated),
      });
    }
  );
};
