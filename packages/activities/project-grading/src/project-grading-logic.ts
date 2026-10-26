import type {
  ProjectGradingGroupConfig,
  ProjectGradingState,
  ProjectGradingStudentResult,
} from '@educlass/protocol';

/**
 * Làm tròn điểm số với số chữ số thập phân chỉ định (mặc định 2 chữ số)
 */
export function roundScore(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Kiểm tra tính hợp lệ của điểm số nhập vào
 */
export function validateScore(score: number, maxScore: number): boolean {
  if (typeof score !== 'number' || Number.isNaN(score)) return false;
  return score >= 0 && score <= maxScore;
}

/**
 * Tìm nhóm của một học sinh tham gia theo participantId
 */
export function findGroupByParticipantId(
  groups: ProjectGradingGroupConfig[],
  participantId: string
): ProjectGradingGroupConfig | undefined {
  return groups.find(
    (g) =>
      g.memberParticipantIds.includes(participantId) ||
      g.leaderParticipantId === participantId
  );
}

/**
 * Kiểm tra xem một người tham gia có phải là nhóm trưởng của nhóm hay không
 */
export function isParticipantLeader(
  group: ProjectGradingGroupConfig | undefined,
  participantId: string
): boolean {
  if (!group || !group.leaderParticipantId) return false;
  return group.leaderParticipantId === participantId;
}

/**
 * Thu thập và tính toán toàn diện điểm số 4 cột cho toàn bộ học sinh
 */
export function calculateAllFinalScores(
  state: ProjectGradingState
): ProjectGradingStudentResult[] {
  const { config, selfGrades, teamMemberGrades, crossTeamGrades, teacherGroupGrades, teacherStudentGrades } = state;
  const weights = config.weights;
  const results: ProjectGradingStudentResult[] = [];

  // Tạo map tên hiển thị cho các nhóm và thành viên
  for (const group of config.groups) {
    // 1. Tính điểm chéo cho nhóm này từ các nhóm trưởng nhóm khác
    const crossScoresForThisGroup: number[] = [];
    const crossCommentsForThisGroup: string[] = [];

    for (const [leaderId, targetGroupMap] of Object.entries(crossTeamGrades)) {
      // Chỉ tính điểm chấm chéo từ nhóm trưởng các nhóm khác
      if (group.leaderParticipantId !== leaderId && targetGroupMap[group.id]) {
        const entry = targetGroupMap[group.id]!;
        crossScoresForThisGroup.push(entry.score);
        if (entry.comment?.trim()) {
          crossCommentsForThisGroup.push(entry.comment.trim());
        }
      }
    }

    const avgCrossScore =
      crossScoresForThisGroup.length > 0
        ? roundScore(
            crossScoresForThisGroup.reduce((sum, s) => sum + s, 0) /
              crossScoresForThisGroup.length
          )
        : null;

    // 2. Điểm giáo viên cho nhóm
    const teacherGroupEntry = teacherGroupGrades[group.id];

    // Lấy tất cả thành viên trong nhóm (bao gồm nhóm trưởng nếu chưa có trong memberParticipantIds)
    const allMembersInGroup = Array.from(
      new Set([
        ...group.memberParticipantIds,
        ...(group.leaderParticipantId ? [group.leaderParticipantId] : []),
      ])
    );

    for (const memberId of allMembersInGroup) {
      const isLeader = group.leaderParticipantId === memberId;
      const comments: string[] = [];

      // [Cột 1]: Điểm cá nhân tự chấm
      const selfEntry = selfGrades[memberId];
      const selfScore = selfEntry !== undefined ? roundScore(selfEntry.score) : null;
      if (selfEntry?.comment?.trim()) {
        comments.push(`Tự nhận xét: ${selfEntry.comment.trim()}`);
      }

      // [Cột 2]: Điểm tổ trưởng chấm thành viên
      let teamMemberScore: number | null = null;
      if (group.leaderParticipantId) {
        const leaderGrades = teamMemberGrades[group.leaderParticipantId];
        const entry = leaderGrades?.[memberId];
        if (entry !== undefined) {
          teamMemberScore = roundScore(entry.score);
          if (entry.comment?.trim()) {
            comments.push(`Nhóm trưởng nhận xét: ${entry.comment.trim()}`);
          }
        } else if (isLeader) {
          // Nếu chính là nhóm trưởng và chưa có điểm riêng, fallback lấy điểm trung bình nhóm trưởng đã chấm cho các bạn, hoặc null
          teamMemberScore = null;
        }
      }

      // [Cột 3]: Điểm chấm chéo (toàn nhóm hưởng chung điểm chéo này)
      const crossTeamScore = avgCrossScore;
      if (crossCommentsForThisGroup.length > 0) {
        comments.push(...crossCommentsForThisGroup.map((c) => `Nhóm bạn nhận xét: ${c}`));
      }

      // [Cột 4]: Điểm giáo viên (Ưu tiên điểm riêng từng bạn, fallback điểm nhóm)
      const teacherStudentEntry = teacherStudentGrades[memberId];
      let teacherScore: number | null = null;
      if (teacherStudentEntry !== undefined) {
        teacherScore = roundScore(teacherStudentEntry.score);
        if (teacherStudentEntry.comment?.trim()) {
          comments.push(`Giáo viên nhận xét riêng: ${teacherStudentEntry.comment.trim()}`);
        }
      } else if (teacherGroupEntry !== undefined) {
        teacherScore = roundScore(teacherGroupEntry.score);
        if (teacherGroupEntry.comment?.trim()) {
          comments.push(`Giáo viên nhận xét nhóm: ${teacherGroupEntry.comment.trim()}`);
        }
      }

      // 3. Tính điểm tổng kết theo trọng số
      // Công thức: Tổng (Điểm_i * Trọng_số_i) / Tổng (Trọng_số_i có điểm)
      let weightedSum = 0;
      let effectiveWeightSum = 0;

      if (selfScore !== null && weights.self > 0) {
        weightedSum += selfScore * weights.self;
        effectiveWeightSum += weights.self;
      }
      if (teamMemberScore !== null && weights.teamMember > 0) {
        weightedSum += teamMemberScore * weights.teamMember;
        effectiveWeightSum += weights.teamMember;
      }
      if (crossTeamScore !== null && weights.crossTeam > 0) {
        weightedSum += crossTeamScore * weights.crossTeam;
        effectiveWeightSum += weights.crossTeam;
      }
      if (teacherScore !== null && weights.teacher > 0) {
        weightedSum += teacherScore * weights.teacher;
        effectiveWeightSum += weights.teacher;
      }

      const finalScore =
        effectiveWeightSum > 0 ? roundScore(weightedSum / effectiveWeightSum) : 0;

      results.push({
        participantId: memberId,
        studentId: memberId,
        displayName: isLeader && group.leaderDisplayName ? group.leaderDisplayName : `Học sinh (${memberId.slice(-4)})`,
        groupId: group.id,
        groupName: group.name,
        isLeader,
        selfScore,
        teamMemberScore,
        crossTeamScore,
        teacherScore,
        finalScore,
        feedbackComments: comments.length > 0 ? comments : undefined,
      });
    }
  }

  // 4. Xếp hạng (Rank) giảm dần theo finalScore
  results.sort((a, b) => b.finalScore - a.finalScore);
  results.forEach((r, idx) => {
    r.rank = idx + 1;
  });

  return results;
}

/**
 * Thống kê tiến độ chấm điểm theo từng chiều
 */
export function calculateGradingProgress(state: ProjectGradingState) {
  const { config, selfGrades, teamMemberGrades, crossTeamGrades, teacherGroupGrades, teacherStudentGrades } = state;

  let totalMembers = 0;
  for (const g of config.groups) {
    const unique = new Set([
      ...g.memberParticipantIds,
      ...(g.leaderParticipantId ? [g.leaderParticipantId] : []),
    ]);
    totalMembers += unique.size;
  }

  const selfSubmitted = Object.keys(selfGrades).length;

  let expectedTeamMemberGrades = 0;
  let actualTeamMemberGrades = 0;
  for (const g of config.groups) {
    if (g.leaderParticipantId) {
      // Nhóm trưởng chấm cho các thành viên còn lại
      expectedTeamMemberGrades += g.memberParticipantIds.filter((id) => id !== g.leaderParticipantId).length;
      const grades = teamMemberGrades[g.leaderParticipantId];
      if (grades) {
        actualTeamMemberGrades += Object.keys(grades).length;
      }
    }
  }

  const numGroups = config.groups.length;
  // Mỗi nhóm trưởng chấm cho (numGroups - 1) nhóm còn lại
  const expectedCrossGrades = numGroups * Math.max(0, numGroups - 1);
  let actualCrossGrades = 0;
  for (const [, targetMap] of Object.entries(crossTeamGrades)) {
    actualCrossGrades += Object.keys(targetMap).length;
  }

  const teacherGroupGraded = Object.keys(teacherGroupGrades).length;
  const teacherStudentGraded = Object.keys(teacherStudentGrades).length;

  return {
    totalStudents: totalMembers,
    selfGrading: {
      submitted: selfSubmitted,
      total: totalMembers,
      percentage: totalMembers > 0 ? Math.round((selfSubmitted / totalMembers) * 100) : 0,
    },
    teamMemberGrading: {
      submitted: actualTeamMemberGrades,
      total: expectedTeamMemberGrades,
      percentage:
        expectedTeamMemberGrades > 0
          ? Math.round((actualTeamMemberGrades / expectedTeamMemberGrades) * 100)
          : 100,
    },
    crossTeamGrading: {
      submitted: actualCrossGrades,
      total: expectedCrossGrades,
      percentage:
        expectedCrossGrades > 0
          ? Math.round((actualCrossGrades / expectedCrossGrades) * 100)
          : 100,
    },
    teacherGrading: {
      groupsGraded: teacherGroupGraded,
      totalGroups: numGroups,
      studentsGradedDirectly: teacherStudentGraded,
    },
  };
}
