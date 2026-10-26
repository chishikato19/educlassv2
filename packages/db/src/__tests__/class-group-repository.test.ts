import { describe, expect, it } from 'vitest';
import { createDatabaseConnection } from '../connection.js';
import { runMigrations } from '../migrator.js';
import { ClassGroupRepository } from '../repositories/class-group-repository.js';
import { ClassRepository } from '../repositories/class-repository.js';
import { StudentRepository } from '../repositories/student-repository.js';
import { UserRepository } from '../repositories/user-repository.js';

describe('ClassGroupRepository', () => {
  it('handles CRUD, leader assignment, and member overview', async () => {
    const { db, sqlite, close } = createDatabaseConnection({ inMemory: true });
    try {
      runMigrations({ sqlite });
      const userRepo = new UserRepository(db);
      const classRepo = new ClassRepository(db);
      const studentRepo = new StudentRepository(db);
      const groupRepo = new ClassGroupRepository(db);

      const teacher = await userRepo.create({
        username: 'gv_toan',
        passwordHash: 'hash',
        displayName: 'Thầy Toán',
        role: 'teacher',
      });

      const cls = await classRepo.create({
        ownerId: teacher.id,
        name: '12A1',
        year: 2026,
      });

      // Tạo 4 học sinh
      const s1 = await studentRepo.create({ classId: cls.id, fullName: 'Nguyễn Văn An' });
      const s2 = await studentRepo.create({ classId: cls.id, fullName: 'Trần Thị Bình' });
      const s3 = await studentRepo.create({ classId: cls.id, fullName: 'Lê Hoàng Cường' });
      const s4 = await studentRepo.create({ classId: cls.id, fullName: 'Phạm Thu Dung' });

      // 1. Tạo 2 nhóm
      const group1 = await groupRepo.create({
        classId: cls.id,
        name: 'Nhóm 1',
        orderIndex: 0,
      });
      const group2 = await groupRepo.create({
        classId: cls.id,
        name: 'Nhóm 2',
        orderIndex: 1,
      });

      expect(group1.id).toBeDefined();
      expect(group2.id).toBeDefined();

      // 2. Gán học sinh vào nhóm
      await groupRepo.assignStudentGroup(s1.id, group1.id);
      await groupRepo.assignStudentGroup(s2.id, group1.id);
      await groupRepo.assignStudentGroup(s3.id, group2.id);

      // s4 chưa phân nhóm
      let overview = await groupRepo.getGroupsOverview(cls.id);
      expect(overview.groups).toHaveLength(2);
      expect(overview.groups[0]?.members).toHaveLength(2);
      expect(overview.groups[1]?.members).toHaveLength(1);
      expect(overview.unassignedStudents).toHaveLength(1);
      expect(overview.unassignedStudents[0]?.id).toBe(s4.id);

      // 3. Chỉ định nhóm trưởng
      await groupRepo.setLeader(group1.id, s1.id);
      const updatedG1 = await groupRepo.findById(group1.id);
      expect(updatedG1?.leaderStudentId).toBe(s1.id);

      overview = await groupRepo.getGroupsOverview(cls.id);
      expect(overview.groups[0]?.leader?.id).toBe(s1.id);

      // 4. Chuyển s1 sang nhóm 2 -> nhóm 1 phải tự động bỏ nhóm trưởng
      await groupRepo.assignStudentGroup(s1.id, group2.id);
      const g1AfterMove = await groupRepo.findById(group1.id);
      expect(g1AfterMove?.leaderStudentId).toBeNull();

      // 5. Xóa nhóm 2 -> s1 và s3 trở về chưa phân nhóm
      await groupRepo.deleteById(group2.id);
      const s1After = await studentRepo.findById(s1.id);
      expect(s1After?.groupId).toBeNull();
    } finally {
      close();
    }
  });

  it('randomizes and distributes students evenly across customizable number of groups', async () => {
    const { db, sqlite, close } = createDatabaseConnection({ inMemory: true });
    try {
      runMigrations({ sqlite });
      const userRepo = new UserRepository(db);
      const classRepo = new ClassRepository(db);
      const studentRepo = new StudentRepository(db);
      const groupRepo = new ClassGroupRepository(db);

      const teacher = await userRepo.create({
        username: 'gv_van',
        passwordHash: 'hash',
        displayName: 'Cô Văn',
        role: 'teacher',
      });

      const cls = await classRepo.create({
        ownerId: teacher.id,
        name: '10A5',
        year: 2026,
      });

      // Tạo 10 học sinh
      for (let i = 1; i <= 10; i++) {
        await studentRepo.create({
          classId: cls.id,
          fullName: `Học sinh ${i}`,
        });
      }

      // Chia đều vào 3 nhóm tùy chỉnh
      const result3 = await groupRepo.randomizeGroups(cls.id, {
        groupCount: 3,
        groupNames: ['Tổ 1', 'Tổ 2', 'Tổ 3'],
        autoAssignLeader: true,
      });

      expect(result3.groups).toHaveLength(3);
      expect(result3.groups[0]?.group.name).toBe('Tổ 1');
      expect(result3.groups[1]?.group.name).toBe('Tổ 2');
      expect(result3.groups[2]?.group.name).toBe('Tổ 3');

      // 10 HS chia 3 nhóm: 4, 3, 3
      const memberCounts = result3.groups.map((g) => g.members.length).sort((a, b) => b - a);
      expect(memberCounts).toEqual([4, 3, 3]);

      // Mỗi nhóm đều có nhóm trưởng
      for (const g of result3.groups) {
        expect(g.leader).not.toBeNull();
        expect(g.group.leaderStudentId).toBe(g.leader?.id);
      }

      // Chia lại thành 4 nhóm
      const result4 = await groupRepo.randomizeGroups(cls.id, {
        groupCount: 4,
        autoAssignLeader: true,
      });
      expect(result4.groups).toHaveLength(4);
      // 10 HS chia 4 nhóm: 3, 3, 2, 2
      const memberCounts4 = result4.groups.map((g) => g.members.length).sort((a, b) => b - a);
      expect(memberCounts4).toEqual([3, 3, 2, 2]);
    } finally {
      close();
    }
  });
});
