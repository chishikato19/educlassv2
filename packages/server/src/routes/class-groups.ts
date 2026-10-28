import type { FastifyPluginAsync } from 'fastify';
import type { ClassGroupRepository, ClassRepository, StudentRepository } from '@educlass/db';
import {
  AssignGroupLeaderRequestSchema,
  AssignStudentGroupRequestSchema,
  CreateClassGroupRequestSchema,
  formatProtocolError,
  RandomizeGroupsRequestSchema,
  UpdateClassGroupRequestSchema,
  type ClassGroupDto,
  type ClassGroupWithMembersDto,
} from '@educlass/protocol';
import type { AuthService } from '../auth/auth-service.js';
import { createOwnerGuard } from '../auth/owner-guard.js';
import { createAuthenticateHook } from '../auth/plugin.js';
import { toStudentDto } from './students.js';

export interface ClassGroupsRoutesOptions {
  authService: AuthService;
  classRepo: ClassRepository;
  classGroupRepo: ClassGroupRepository;
  studentRepo: StudentRepository;
}

export const classGroupsRoutes: FastifyPluginAsync<ClassGroupsRoutesOptions> = async (
  fastify,
  options
) => {
  const { authService, classRepo, classGroupRepo, studentRepo } = options;
  const authenticate = createAuthenticateHook(authService);

  // Guard bảo vệ theo lớp học: Chỉ giáo viên sở hữu lớp (hoặc Admin) mới được thao tác nhóm của lớp đó
  const classOwnerGuard = createOwnerGuard(authService, async request => {
    const { classId } = request.params as { classId: string };
    return classRepo.findById(classId);
  });

  /**
   * GET /api/classes/:classId/groups
   * Lấy cấu trúc toàn bộ nhóm trong lớp kèm thành viên, nhóm trưởng và học sinh chưa phân nhóm
   */
  fastify.get<{ Params: { classId: string } }>(
    '/api/classes/:classId/groups',
    { preHandler: classOwnerGuard },
    async (request, reply) => {
      const { classId } = request.params;
      const overview = await classGroupRepo.getGroupsOverview(classId);

      const groups: ClassGroupWithMembersDto[] = overview.groups.map(g => ({
        id: g.group.id,
        classId: g.group.classId,
        name: g.group.name,
        orderIndex: g.group.orderIndex,
        leaderStudentId: g.group.leaderStudentId,
        createdAt: g.group.createdAt,
        memberCount: g.members.length,
        members: g.members.map(toStudentDto),
        leader: g.leader ? toStudentDto(g.leader) : null,
      }));

      const unassignedStudents = overview.unassignedStudents.map(toStudentDto);
      const totalStudents =
        groups.reduce((acc, g) => acc + g.members.length, 0) + unassignedStudents.length;

      return reply.status(200).send({
        groups,
        unassignedStudents,
        totalStudents,
      });
    }
  );

  /**
   * POST /api/classes/:classId/groups
   * Tạo một nhóm học sinh mới trong lớp
   */
  fastify.post<{ Params: { classId: string } }>(
    '/api/classes/:classId/groups',
    { preHandler: classOwnerGuard },
    async (request, reply) => {
      const { classId } = request.params;
      const parseResult = CreateClassGroupRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: formatProtocolError(
            'INVALID_PAYLOAD',
            parseResult.error.errors[0]?.message ?? 'Dữ liệu tạo nhóm không hợp lệ',
            parseResult.error.format()
          ),
        });
      }

      const existingGroups = await classGroupRepo.listByClassId(classId);
      const nextOrder = parseResult.data.orderIndex ?? existingGroups.length;

      const created = await classGroupRepo.create({
        classId,
        name: parseResult.data.name,
        orderIndex: nextOrder,
        leaderStudentId: parseResult.data.leaderStudentId ?? null,
      });

      const dto: ClassGroupDto = {
        id: created.id,
        classId: created.classId,
        name: created.name,
        orderIndex: created.orderIndex,
        leaderStudentId: created.leaderStudentId,
        createdAt: created.createdAt,
        memberCount: 0,
      };

      return reply.status(201).send({ group: dto });
    }
  );

  /**
   * POST /api/classes/:classId/groups/randomize
   * Chia đều ngẫu nhiên học sinh vào N nhóm tùy chỉnh
   */
  fastify.post<{ Params: { classId: string } }>(
    '/api/classes/:classId/groups/randomize',
    { preHandler: classOwnerGuard },
    async (request, reply) => {
      const { classId } = request.params;
      const parseResult = RandomizeGroupsRequestSchema.safeParse(request.body ?? {});
      if (!parseResult.success) {
        return reply.status(400).send({
          error: formatProtocolError(
            'INVALID_PAYLOAD',
            parseResult.error.errors[0]?.message ?? 'Thông số chia nhóm không hợp lệ',
            parseResult.error.format()
          ),
        });
      }

      const overview = await classGroupRepo.randomizeGroups(classId, {
        groupCount: parseResult.data.groupCount,
        ...(parseResult.data.groupNames ? { groupNames: parseResult.data.groupNames } : {}),
        autoAssignLeader: parseResult.data.autoAssignLeader,
      });

      const groups: ClassGroupWithMembersDto[] = overview.groups.map(g => ({
        id: g.group.id,
        classId: g.group.classId,
        name: g.group.name,
        orderIndex: g.group.orderIndex,
        leaderStudentId: g.group.leaderStudentId,
        createdAt: g.group.createdAt,
        memberCount: g.members.length,
        members: g.members.map(toStudentDto),
        leader: g.leader ? toStudentDto(g.leader) : null,
      }));

      const unassignedStudents = overview.unassignedStudents.map(toStudentDto);
      const totalStudents =
        groups.reduce((acc, g) => acc + g.members.length, 0) + unassignedStudents.length;

      return reply.status(200).send({
        groups,
        unassignedStudents,
        totalStudents,
      });
    }
  );

  /**
   * PUT /api/students/:studentId/group
   * Gán hoặc di chuyển học sinh sang nhóm mới (hoặc null để bỏ nhóm)
   */
  fastify.put<{ Params: { studentId: string } }>(
    '/api/students/:studentId/group',
    { preHandler: authenticate },
    async (request, reply) => {
      const { studentId } = request.params;
      const student = await studentRepo.findById(studentId);
      if (!student) {
        return reply
          .status(404)
          .send({ error: formatProtocolError('STUDENT_NOT_FOUND', 'Không tìm thấy học sinh') });
      }

      // Kiểm tra quyền giáo viên với lớp học
      const cls = await classRepo.findById(student.classId);
      if (!cls || (request.user!.role !== 'admin' && cls.ownerId !== request.user!.id)) {
        return reply.status(403).send({
          error: formatProtocolError('FORBIDDEN', 'Bạn không có quyền thao tác học sinh lớp này'),
        });
      }

      const parseResult = AssignStudentGroupRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: formatProtocolError(
            'INVALID_PAYLOAD',
            parseResult.error.errors[0]?.message ?? 'Dữ liệu gán nhóm không hợp lệ'
          ),
        });
      }

      const targetGroupId = parseResult.data.groupId;
      if (targetGroupId) {
        const targetGroup = await classGroupRepo.findById(targetGroupId);
        if (!targetGroup || targetGroup.classId !== student.classId) {
          return reply.status(400).send({
            error: formatProtocolError(
              'GROUP_NOT_FOUND',
              'Nhóm đích không hợp lệ hoặc không thuộc lớp học này'
            ),
          });
        }
      }

      await classGroupRepo.assignStudentGroup(studentId, targetGroupId);
      const updatedStudent = await studentRepo.findById(studentId);

      return reply.status(200).send({
        success: true,
        student: updatedStudent ? toStudentDto(updatedStudent) : null,
      });
    }
  );

  /**
   * PUT /api/groups/:groupId/leader
   * Chỉ định hoặc thay đổi nhóm trưởng cho nhóm
   */
  fastify.put<{ Params: { groupId: string } }>(
    '/api/groups/:groupId/leader',
    { preHandler: authenticate },
    async (request, reply) => {
      const { groupId } = request.params;
      const group = await classGroupRepo.findById(groupId);
      if (!group) {
        return reply
          .status(404)
          .send({ error: formatProtocolError('GROUP_NOT_FOUND', 'Không tìm thấy nhóm') });
      }

      const cls = await classRepo.findById(group.classId);
      if (!cls || (request.user!.role !== 'admin' && cls.ownerId !== request.user!.id)) {
        return reply.status(403).send({
          error: formatProtocolError('FORBIDDEN', 'Bạn không có quyền quản lý nhóm lớp này'),
        });
      }

      const parseResult = AssignGroupLeaderRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: formatProtocolError(
            'INVALID_PAYLOAD',
            parseResult.error.errors[0]?.message ?? 'Dữ liệu chỉ định nhóm trưởng không hợp lệ'
          ),
        });
      }

      const studentId = parseResult.data.studentId;
      if (studentId) {
        const student = await studentRepo.findById(studentId);
        if (!student || student.classId !== group.classId) {
          return reply.status(400).send({
            error: formatProtocolError(
              'STUDENT_NOT_FOUND',
              'Học sinh không tồn tại hoặc không thuộc lớp học này'
            ),
          });
        }
      }

      const updated = await classGroupRepo.setLeader(groupId, studentId);
      return reply.status(200).send({
        success: true,
        group: updated,
      });
    }
  );

  /**
   * PATCH /api/groups/:groupId
   * Đổi tên nhóm hoặc thứ tự nhóm
   */
  fastify.patch<{ Params: { groupId: string } }>(
    '/api/groups/:groupId',
    { preHandler: authenticate },
    async (request, reply) => {
      const { groupId } = request.params;
      const group = await classGroupRepo.findById(groupId);
      if (!group) {
        return reply
          .status(404)
          .send({ error: formatProtocolError('GROUP_NOT_FOUND', 'Không tìm thấy nhóm') });
      }

      const cls = await classRepo.findById(group.classId);
      if (!cls || (request.user!.role !== 'admin' && cls.ownerId !== request.user!.id)) {
        return reply
          .status(403)
          .send({ error: formatProtocolError('FORBIDDEN', 'Bạn không có quyền sửa nhóm lớp này') });
      }

      const parseResult = UpdateClassGroupRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: formatProtocolError(
            'INVALID_PAYLOAD',
            parseResult.error.errors[0]?.message ?? 'Dữ liệu cập nhật nhóm không hợp lệ'
          ),
        });
      }

      const updated = await classGroupRepo.update(groupId, parseResult.data);
      return reply.status(200).send({
        success: true,
        group: updated,
      });
    }
  );

  /**
   * DELETE /api/groups/:groupId
   * Xóa một nhóm (các học sinh trong nhóm chuyển về chưa phân nhóm)
   */
  fastify.delete<{ Params: { groupId: string } }>(
    '/api/groups/:groupId',
    { preHandler: authenticate },
    async (request, reply) => {
      const { groupId } = request.params;
      const group = await classGroupRepo.findById(groupId);
      if (!group) {
        return reply
          .status(404)
          .send({ error: formatProtocolError('GROUP_NOT_FOUND', 'Không tìm thấy nhóm') });
      }

      const cls = await classRepo.findById(group.classId);
      if (!cls || (request.user!.role !== 'admin' && cls.ownerId !== request.user!.id)) {
        return reply
          .status(403)
          .send({ error: formatProtocolError('FORBIDDEN', 'Bạn không có quyền xóa nhóm lớp này') });
      }

      await classGroupRepo.deleteById(groupId);
      return reply.status(200).send({ success: true });
    }
  );
};
