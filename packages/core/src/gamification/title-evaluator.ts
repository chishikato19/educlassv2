import type {
  StudentGamificationStats,
  TitleCondition,
  TitleDto,
  TitleRule,
} from '@educlass/protocol';

/**
 * Danh mục các danh hiệu mặc định của hệ thống với luật dạng dữ liệu (data-driven rules)
 */
export const DEFAULT_TITLES: ReadonlyArray<Omit<TitleDto, 'id'>> = [
  {
    key: 'tan_binh',
    name: 'Tân binh lớp học',
    iconKey: 'seedling',
    rule: {
      conditions: [{ type: 'min_level', threshold: 1, description: 'Đạt Cấp độ 1 trở lên' }],
      description: 'Bước chân đầu tiên trên hành trình tri thức.',
    },
  },
  {
    key: 'cham_chi',
    name: 'Học sinh chăm chỉ',
    iconKey: 'bee',
    rule: {
      conditions: [{ type: 'min_exp', threshold: 100, description: 'Tích lũy tối thiểu 100 EXP' }],
      description: 'Chăm chỉ tích lũy điểm kinh nghiệm qua các bài học.',
    },
  },
  {
    key: 'sieu_cap',
    name: 'Siêu cấp tiến bộ',
    iconKey: 'rocket',
    rule: {
      conditions: [{ type: 'min_level', threshold: 3, description: 'Đạt Cấp độ 3 trở lên' }],
      description: 'Sự tiến bộ vượt bậc không ngừng nghỉ.',
    },
  },
  {
    key: 'hoc_ba',
    name: 'Học bá uyên bác',
    iconKey: 'owl',
    rule: {
      conditions: [{ type: 'min_exp', threshold: 500, description: 'Tích lũy tối thiểu 500 EXP' }],
      description: 'Kiến thức sâu rộng được tôi luyện qua thời gian.',
    },
  },
  {
    key: 'thu_khoa',
    name: 'Thủ khoa trường thi',
    iconKey: 'grad_cap',
    rule: {
      conditions: [
        { type: 'exam_high_scores', threshold: 1, description: 'Đạt điểm giỏi (≥ 8.0) trong kỳ thi ít nhất 1 lần' },
      ],
      description: 'Khẳng định tài năng trong các kỳ thi kiểm tra.',
    },
  },
  {
    key: 'diem_muoi',
    name: 'Điểm mười hoàn hảo',
    iconKey: 'hundred',
    rule: {
      conditions: [
        { type: 'exam_perfect', threshold: 1, description: 'Đạt điểm tuyệt đối (10/10) trong kỳ thi' },
      ],
      description: 'Chính xác tuyệt đối không tì vết.',
    },
  },
  {
    key: 'vua_toc_do',
    name: 'Tia chớp tốc độ',
    iconKey: 'lightning',
    rule: {
      conditions: [
        { type: 'quiz_streak', threshold: 1, description: 'Đạt chuỗi trả lời đúng tốc độ trong Quiz Live' },
      ],
      description: 'Phản xạ nhanh như chớp và luôn chuẩn xác.',
    },
  },
  {
    key: 'dai_su',
    name: 'Đại sư tri thức',
    iconKey: 'crown',
    rule: {
      conditions: [
        { type: 'min_level', threshold: 10, description: 'Đạt Cấp độ 10' },
        { type: 'min_exp', threshold: 2000, description: 'Tích lũy tối thiểu 2000 EXP' },
      ],
      description: 'Đỉnh cao của sự thông thái và kiên trì.',
    },
  },
];

/**
 * Kiểm tra xem học sinh có thỏa mãn một điều kiện danh hiệu cụ thể hay không
 */
export function checkTitleCondition(
  stats: StudentGamificationStats,
  condition: TitleCondition
): boolean {
  switch (condition.type) {
    case 'min_exp':
      return stats.exp >= condition.threshold;
    case 'min_level':
      return stats.level >= condition.threshold;
    case 'exam_high_scores':
      return stats.examHighScores >= condition.threshold;
    case 'exam_perfect':
      return stats.examPerfects >= condition.threshold;
    case 'quiz_streak':
      return stats.quizStreak >= condition.threshold;
    case 'attendance_sessions':
      return stats.attendanceSessions >= condition.threshold;
    default:
      return false;
  }
}

/**
 * Kiểm tra xem học sinh có thỏa mãn toàn bộ điều kiện của luật danh hiệu hay không
 */
export function isTitleEligible(
  stats: StudentGamificationStats,
  rule: TitleRule
): boolean {
  if (!rule.conditions || rule.conditions.length === 0) {
    return false;
  }
  // Thỏa mãn TẤT CẢ các điều kiện trong danh hiệu (AND logic)
  return rule.conditions.every((c: TitleCondition) => checkTitleCondition(stats, c));
}

/**
 * Đánh giá danh sách danh hiệu đủ điều kiện được cấp cho học sinh
 */
export function evaluateStudentTitleRules(
  stats: StudentGamificationStats,
  titles: ReadonlyArray<Omit<TitleDto, 'id'> | TitleDto>
): string[] {
  const eligibleKeys: string[] = [];
  for (const t of titles) {
    if (isTitleEligible(stats, t.rule)) {
      eligibleKeys.push(t.key);
    }
  }
  return eligibleKeys;
}
