import { asc, eq, inArray } from 'drizzle-orm';
import type { EduClassDatabase } from '../connection.js';
import { generateId } from '../id.js';
import { classGroups, students, type ClassGroupInsert, type ClassGroupSelect } from '../schema/index.js';
import type { StudentSelect } from './student-repository.js';

export interface UpdateClassGroupData {
  name?: string | undefined;
  orderIndex?: number | undefined;
  leaderStudentId?: string | null | undefined;
}

export interface ClassGroupWithMembers {
  group: ClassGroupSelect;
  members: StudentSelect[];
  leader: StudentSelect | null;
}

export interface ClassGroupsOverview {
  groups: ClassGroupWithMembers[];
  unassignedStudents: StudentSelect[];
}

export class ClassGroupRepository {
  constructor(private readonly db: EduClassDatabase) {}

  /**
   * Tạo một nhóm học sinh mới trong lớp
   */
  async create(
    data: Omit<ClassGroupInsert, 'id' | 'createdAt'> & {
      id?: string;
      createdAt?: number;
    }
  ): Promise<ClassGroupSelect> {
    const id = data.id ?? generateId();
    const createdAt = data.createdAt ?? Date.now();

    const insertPayload: ClassGroupInsert = {
      ...data,
      id,
      createdAt,
      orderIndex: data.orderIndex ?? 0,
      leaderStudentId: data.leaderStudentId ?? null,
    };

    await this.db.insert(classGroups).values(insertPayload);
    const created = await this.findById(id);
    if (!created) {
      throw new Error(`Không thể tìm thấy nhóm vừa tạo với id: ${id}`);
    }
    return created;
  }

  /**
   * Tìm nhóm theo ID
   */
  async findById(id: string): Promise<ClassGroupSelect | null> {
    const result = await this.db.select().from(classGroups).where(eq(classGroups.id, id)).limit(1);
    return result[0] ?? null;
  }

  /**
   * Lấy danh sách nhóm trong một lớp theo thứ tự orderIndex tăng dần
   */
  async listByClassId(classId: string): Promise<ClassGroupSelect[]> {
    return this.db
      .select()
      .from(classGroups)
      .where(eq(classGroups.classId, classId))
      .orderBy(asc(classGroups.orderIndex), asc(classGroups.createdAt));
  }

  /**
   * Cập nhật thông tin nhóm (tên, thứ tự, nhóm trưởng)
   */
  async update(id: string, data: UpdateClassGroupData): Promise<ClassGroupSelect | null> {
    const valuesToUpdate: {
      name?: string;
      orderIndex?: number;
      leaderStudentId?: string | null;
    } = {};

    if (data.name !== undefined) {
      valuesToUpdate.name = data.name;
    }
    if (data.orderIndex !== undefined) {
      valuesToUpdate.orderIndex = data.orderIndex;
    }
    if (data.leaderStudentId !== undefined) {
      valuesToUpdate.leaderStudentId = data.leaderStudentId;
    }

    if (Object.keys(valuesToUpdate).length > 0) {
      await this.db.update(classGroups).set(valuesToUpdate).where(eq(classGroups.id, id));
    }

    return this.findById(id);
  }

  /**
   * Chỉ định hoặc hủy nhóm trưởng
   */
  async setLeader(groupId: string, studentId: string | null): Promise<ClassGroupSelect | null> {
    const group = await this.findById(groupId);
    if (!group) return null;

    if (studentId) {
      // Đảm bảo học sinh này thuộc nhóm
      await this.db
        .update(students)
        .set({ groupId })
        .where(eq(students.id, studentId));
    }

    await this.db
      .update(classGroups)
      .set({ leaderStudentId: studentId })
      .where(eq(classGroups.id, groupId));

    return this.findById(groupId);
  }

  /**
   * Gán hoặc chuyển học sinh vào một nhóm
   */
  async assignStudentGroup(studentId: string, groupId: string | null): Promise<boolean> {
    const student = await this.db
      .select()
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);

    if (!student[0]) return false;

    const oldGroupId = student[0].groupId;

    // Nếu học sinh đang là nhóm trưởng của nhóm cũ mà chuyển nhóm khác -> reset leader nhóm cũ
    if (oldGroupId && oldGroupId !== groupId) {
      await this.db
        .update(classGroups)
        .set({ leaderStudentId: null })
        .where(eq(classGroups.leaderStudentId, studentId));
    }

    await this.db
      .update(students)
      .set({ groupId })
      .where(eq(students.id, studentId));

    return true;
  }

  /**
   * Xóa nhóm theo ID (học sinh trong nhóm sẽ về trạng thái chưa phân nhóm)
   */
  async deleteById(id: string): Promise<boolean> {
    // Đưa học sinh trong nhóm về groupId = null
    await this.db
      .update(students)
      .set({ groupId: null })
      .where(eq(students.groupId, id));

    const result = await this.db.delete(classGroups).where(eq(classGroups.id, id));
    return (result.changes ?? 0) > 0;
  }

  /**
   * Lấy toàn bộ nhóm kèm danh sách thành viên và học sinh chưa phân nhóm
   */
  async getGroupsOverview(classId: string): Promise<ClassGroupsOverview> {
    const groupList = await this.listByClassId(classId);
    const allStudents = await this.db
      .select()
      .from(students)
      .where(eq(students.classId, classId));

    const studentMap = new Map<string, StudentSelect>();
    for (const s of allStudents) {
      studentMap.set(s.id, s);
    }

    const groupsWithMembers: ClassGroupWithMembers[] = groupList.map((grp) => {
      const members = allStudents.filter((s) => s.groupId === grp.id);
      const leader = grp.leaderStudentId ? studentMap.get(grp.leaderStudentId) ?? null : null;
      return {
        group: grp,
        members,
        leader,
      };
    });

    const unassignedStudents = allStudents.filter((s) => !s.groupId);

    return {
      groups: groupsWithMembers,
      unassignedStudents,
    };
  }

  /**
   * Chia đều ngẫu nhiên học sinh vào N nhóm tùy chỉnh (Fisher-Yates shuffle)
   */
  async randomizeGroups(
    classId: string,
    options: {
      groupCount?: number;
      groupNames?: string[];
      autoAssignLeader?: boolean;
    } = {}
  ): Promise<ClassGroupsOverview> {
    const count = Math.max(2, Math.min(options.groupCount ?? 4, 30));
    const autoAssignLeader = options.autoAssignLeader ?? true;

    // 1. Lấy toàn bộ học sinh của lớp
    const allStudents = await this.db
      .select()
      .from(students)
      .where(eq(students.classId, classId));

    // 2. Xóa các nhóm cũ của lớp này
    const oldGroups = await this.listByClassId(classId);
    if (oldGroups.length > 0) {
      const oldGroupIds = oldGroups.map((g) => g.id);
      await this.db
        .update(students)
        .set({ groupId: null })
        .where(inArray(students.groupId, oldGroupIds));

      await this.db.delete(classGroups).where(eq(classGroups.classId, classId));
    }

    // 3. Tạo N nhóm mới
    const newGroups: ClassGroupSelect[] = [];
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      const name = options.groupNames?.[i]?.trim() || `Nhóm ${i + 1}`;
      const groupId = generateId();
      await this.db.insert(classGroups).values({
        id: groupId,
        classId,
        name,
        orderIndex: i,
        leaderStudentId: null,
        createdAt: now + i,
      });
      const g = await this.findById(groupId);
      if (g) newGroups.push(g);
    }

    if (allStudents.length === 0) {
      return {
        groups: newGroups.map((group) => ({ group, members: [], leader: null })),
        unassignedStudents: [],
      };
    }

    // 4. Xáo trộn ngẫu nhiên học sinh (Fisher-Yates)
    const shuffled = [...allStudents];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i]!;
      shuffled[i] = shuffled[j]!;
      shuffled[j] = temp;
    }

    // 5. Chia đều vào N nhóm
    const groupMemberMap = new Map<string, StudentSelect[]>();
    for (const g of newGroups) {
      groupMemberMap.set(g.id, []);
    }

    for (let i = 0; i < shuffled.length; i++) {
      const targetGroup = newGroups[i % count]!;
      const student = shuffled[i]!;
      await this.db
        .update(students)
        .set({ groupId: targetGroup.id })
        .where(eq(students.id, student.id));

      groupMemberMap.get(targetGroup.id)?.push({ ...student, groupId: targetGroup.id });
    }

    // 6. Tự động chỉ định nhóm trưởng nếu bật autoAssignLeader
    const resultGroups: ClassGroupWithMembers[] = [];
    for (const group of newGroups) {
      const members = groupMemberMap.get(group.id) ?? [];
      let leader: StudentSelect | null = null;
      let updatedGroup = group;

      if (autoAssignLeader && members.length > 0) {
        leader = members[0]!;
        await this.db
          .update(classGroups)
          .set({ leaderStudentId: leader.id })
          .where(eq(classGroups.id, group.id));
        updatedGroup = { ...group, leaderStudentId: leader.id };
      }

      resultGroups.push({
        group: updatedGroup,
        members,
        leader,
      });
    }

    return {
      groups: resultGroups,
      unassignedStudents: [],
    };
  }
}
