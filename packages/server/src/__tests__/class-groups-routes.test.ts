import { describe, expect, it } from 'vitest';
import { buildServer } from '../app.js';

describe('Class Groups REST API & Randomize Flow (Phases 1-2 & Phase 6 Verification)', () => {
  it('manages groups, performs random even distribution, moves students, assigns leader, and guards cross-teacher access', async () => {
    const app = await buildServer({
      fastifyOptions: { logger: false },
    });

    try {
      // 1. Đăng nhập Admin và tạo 2 giáo viên (Teacher 1, Teacher 2)
      const adminLogin = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'admin', password: 'admin123' },
      });
      const adminToken = JSON.parse(adminLogin.body).token;

      await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { username: 'gv_group_1', password: 'password123', displayName: 'Thầy Hùng', role: 'teacher' },
      });

      await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { username: 'gv_group_2', password: 'password123', displayName: 'Cô Lan', role: 'teacher' },
      });

      const token1 = JSON.parse(
        (await app.inject({
          method: 'POST',
          url: '/api/auth/login',
          payload: { username: 'gv_group_1', password: 'password123' },
        })).body
      ).token;

      const token2 = JSON.parse(
        (await app.inject({
          method: 'POST',
          url: '/api/auth/login',
          payload: { username: 'gv_group_2', password: 'password123' },
        })).body
      ).token;

      // 2. Thầy Hùng tạo lớp học 11A1
      const createClassRes = await app.inject({
        method: 'POST',
        url: '/api/classes',
        headers: { authorization: `Bearer ${token1}` },
        payload: { name: 'Lớp 11A1' },
      });
      const classId = JSON.parse(createClassRes.body).class.id;

      // 3. Tạo 7 học sinh cho lớp 11A1
      const studentIds: string[] = [];
      for (let i = 1; i <= 7; i++) {
        const createStudentRes = await app.inject({
          method: 'POST',
          url: `/api/classes/${classId}/students`,
          headers: { authorization: `Bearer ${token1}` },
          payload: {
            fullName: `Học sinh ${i}`,
            code: `HS00${i}`,
          },
        });
        studentIds.push(JSON.parse(createStudentRes.body).student.id);
      }
      expect(studentIds).toHaveLength(7);

      // 4. Kiểm tra lấy danh sách nhóm ban đầu (trống)
      const initialGroupsRes = await app.inject({
        method: 'GET',
        url: `/api/classes/${classId}/groups`,
        headers: { authorization: `Bearer ${token1}` },
      });
      expect(initialGroupsRes.statusCode).toBe(200);
      expect(JSON.parse(initialGroupsRes.body).groups).toHaveLength(0);

      // 5. Khởi tạo một nhóm đơn lẻ
      const createGroupRes = await app.inject({
        method: 'POST',
        url: `/api/classes/${classId}/groups`,
        headers: { authorization: `Bearer ${token1}` },
        payload: { name: 'Nhóm Thử Nghiệm' },
      });
      expect(createGroupRes.statusCode).toBe(201);
      const singleGroup = JSON.parse(createGroupRes.body).group;
      expect(singleGroup.name).toBe('Nhóm Thử Nghiệm');

      // 6. Phân chia ngẫu nhiên đều 7 học sinh vào 3 nhóm (Fisher-Yates)
      // 7 học sinh chia 3 nhóm -> kích thước các nhóm phải là 3, 2, 2 (chênh lệch tối đa 1)
      const randomizeRes = await app.inject({
        method: 'POST',
        url: `/api/classes/${classId}/groups/randomize`,
        headers: { authorization: `Bearer ${token1}` },
        payload: { groupCount: 3 },
      });
      expect(randomizeRes.statusCode).toBe(200);
      const randomizedGroups = JSON.parse(randomizeRes.body).groups;
      expect(randomizedGroups).toHaveLength(3);

      const memberCounts = randomizedGroups.map((g: { members: unknown[] }) => g.members.length);
      const totalAssigned = memberCounts.reduce((acc: number, cur: number) => acc + cur, 0);
      expect(totalAssigned).toBe(7);

      // Kiểm tra tính chia đều (Even distribution: Max - Min <= 1)
      const maxMembers = Math.max(...memberCounts);
      const minMembers = Math.min(...memberCounts);
      expect(maxMembers - minMembers).toBeLessThanOrEqual(1);

      // 7. Gán nhóm trưởng cho Nhóm 1
      const firstMemberId = randomizedGroups[0].members[0]?.id;
      expect(firstMemberId).toBeDefined();

      const assignLeaderRes = await app.inject({
        method: 'PUT',
        url: `/api/groups/${randomizedGroups[0].id}/leader`,
        headers: { authorization: `Bearer ${token1}` },
        payload: { studentId: firstMemberId },
      });
      expect(assignLeaderRes.statusCode).toBe(200);
      expect(JSON.parse(assignLeaderRes.body).group.leaderStudentId).toBe(firstMemberId);

      // 8. Di chuyển học sinh giữa các nhóm
      const moveRes = await app.inject({
        method: 'PUT',
        url: `/api/students/${firstMemberId}/group`,
        headers: { authorization: `Bearer ${token1}` },
        payload: {
          groupId: randomizedGroups[1].id,
        },
      });
      expect(moveRes.statusCode).toBe(200);

      // Xác nhận học sinh đã chuyển sang Nhóm 2
      const updatedGroupsRes = await app.inject({
        method: 'GET',
        url: `/api/classes/${classId}/groups`,
        headers: { authorization: `Bearer ${token1}` },
      });
      const g2 = JSON.parse(updatedGroupsRes.body).groups.find((g: { id: string }) => g.id === randomizedGroups[1].id);
      expect(g2.members.some((m: { id: string }) => m.id === firstMemberId)).toBe(true);

      // 9. Bảo vệ quyền sở hữu (Cross-teacher guard): Cô Lan không được thao tác lớp của Thầy Hùng
      const unauthorizedRes = await app.inject({
        method: 'GET',
        url: `/api/classes/${classId}/groups`,
        headers: { authorization: `Bearer ${token2}` },
      });
      expect(unauthorizedRes.statusCode).toBe(403);

      const unauthorizedRandomizeRes = await app.inject({
        method: 'POST',
        url: `/api/classes/${classId}/groups/randomize`,
        headers: { authorization: `Bearer ${token2}` },
        payload: { groupCount: 3 },
      });
      expect(unauthorizedRandomizeRes.statusCode).toBe(403);
    } finally {
      await app.close();
    }
  });
});
