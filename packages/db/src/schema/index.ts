import { integer, real, sqliteTable, text, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';

/**
 * 1. Bảng users: Giáo viên và Quản trị viên
 */
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  subject: text('subject'),
  avatar: text('avatar'),
  role: text('role', { enum: ['admin', 'teacher'] }).notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull(),
});

/**
 * 2. Bảng classes: Lớp học thuộc sở hữu của giáo viên
 */
export const classes = sqliteTable('classes', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  year: integer('year').notNull(),
  createdAt: integer('created_at').notNull(),
});

/**
 * 3. Bảng students: Học sinh trong danh sách lớp
 */
export const students = sqliteTable('students', {
  id: text('id').primaryKey(),
  classId: text('class_id')
    .notNull()
    .references(() => classes.id, { onDelete: 'cascade' }),
  groupId: text('group_id').references((): AnySQLiteColumn => classGroups.id, { onDelete: 'set null' }),
  fullName: text('full_name').notNull(),
  code: text('code'),
  passwordHash: text('password_hash'),
  exp: integer('exp').notNull().default(0),
  level: integer('level').notNull().default(1),
  elo: integer('elo').notNull().default(1000),
  avatarJson: text('avatar_json'),
  academicPerformance: text('academic_performance', {
    enum: ['tot', 'kha', 'dat', 'chua_dat'],
  })
    .notNull()
    .default('dat'),
  createdAt: integer('created_at').notNull(),
});

/**
 * 3.5 Bảng class_groups: Tổ / Nhóm học tập cố định theo lớp
 */
export const classGroups = sqliteTable('class_groups', {
  id: text('id').primaryKey(),
  classId: text('class_id')
    .notNull()
    .references(() => classes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  orderIndex: integer('order_index').notNull().default(0),
  leaderStudentId: text('leader_student_id').references((): AnySQLiteColumn => students.id, { onDelete: 'set null' }),
  createdAt: integer('created_at').notNull(),
});

export type ClassGroupSelect = typeof classGroups.$inferSelect;
export type ClassGroupInsert = typeof classGroups.$inferInsert;

/**
 * 4. Bảng titles: Danh mục danh hiệu game hóa
 */
export const titles = sqliteTable('titles', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  iconKey: text('icon_key').notNull(),
  ruleJson: text('rule_json').notNull(),
});

export type TitleSelect = typeof titles.$inferSelect;
export type TitleInsert = typeof titles.$inferInsert;

/**
 * 5. Bảng student_titles: Danh hiệu đã cấp cho học sinh
 */
export const studentTitles = sqliteTable('student_titles', {
  id: text('id').primaryKey(),
  studentId: text('student_id')
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  titleId: text('title_id')
    .notNull()
    .references(() => titles.id, { onDelete: 'cascade' }),
  awardedAt: integer('awarded_at').notNull(),
  sessionId: text('session_id'),
});

export type StudentTitleSelect = typeof studentTitles.$inferSelect;
export type StudentTitleInsert = typeof studentTitles.$inferInsert;

/**
 * 6. Bảng question_sets: Bộ câu hỏi
 */
export const questionSets = sqliteTable('question_sets', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  subject: text('subject').notNull(),
  grade: integer('grade').notNull(),
  tagsJson: text('tags_json'),
  schemaVersion: integer('schema_version').notNull().default(1),
  updatedAt: integer('updated_at').notNull(),
});

/**
 * 7. Bảng questions: Từng câu hỏi trong bộ đề
 */
export const questions = sqliteTable('questions', {
  id: text('id').primaryKey(),
  setId: text('set_id')
    .notNull()
    .references(() => questionSets.id, { onDelete: 'cascade' }),
  orderIndex: integer('order_index').notNull(),
  type: text('type', {
    enum: ['mcq4', 'tf', 'tf_group', 'short', 'matching', 'cloze_drag'],
  }).notNull(),
  contentJson: text('content_json').notNull(),
  answerJson: text('answer_json').notNull(),
  points: integer('points').notNull().default(10),
});

/**
 * 8. Bảng assets: Tập tin đa phương tiện theo mã băm sha256
 */
export const assets = sqliteTable('assets', {
  id: text('id').primaryKey(),
  sha256: text('sha256').notNull().unique(),
  mime: text('mime').notNull(),
  path: text('path').notNull(),
  size: integer('size').notNull(),
});

/**
 * 9. Bảng sessions: Phiên học tương tác
 */
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  classId: text('class_id').references(() => classes.id, { onDelete: 'set null' }),
  joinCode: text('join_code').notNull(),
  status: text('status', { enum: ['open', 'closing', 'closed'] })
    .notNull()
    .default('open'),
  identityMode: text('identity_mode', {
    enum: ['roster_only', 'roster_or_guest', 'guest_only'],
  }).notNull(),
  allowTeams: integer('allow_teams', { mode: 'boolean' }).notNull().default(false),
  settingsJson: text('settings_json'),
  openedAt: integer('opened_at').notNull(),
  closedAt: integer('closed_at'),
});

/**
 * 10. Bảng teams: Nhóm trong phiên học
 */
export const teams = sqliteTable('teams', {
  id: text('id').primaryKey(),
  sessionId: text('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
});

/**
 * 11. Bảng participants: Người tham gia phiên
 */
export const participants = sqliteTable('participants', {
  id: text('id').primaryKey(),
  sessionId: text('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  studentId: text('student_id').references(() => students.id, { onDelete: 'set null' }),
  studentIdsJson: text('student_ids_json'),
  displayName: text('display_name').notNull(),
  identityLevel: text('identity_level', {
    enum: ['account', 'roster', 'guest'],
  }).notNull(),
  teamId: text('team_id').references(() => teams.id, { onDelete: 'set null' }),
  status: text('status', { enum: ['online', 'offline'] })
    .notNull()
    .default('online'),
  joinedAt: integer('joined_at').notNull(),
  leftAt: integer('left_at'),
});

/**
 * 12. Bảng activity_runs: Lượt chạy tiện ích / trò chơi trong phiên
 */
export const activityRuns = sqliteTable('activity_runs', {
  id: text('id').primaryKey(),
  sessionId: text('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  activityId: text('activity_id').notNull(),
  configJson: text('config_json').notNull(),
  status: text('status', { enum: ['ready', 'running', 'ended'] })
    .notNull()
    .default('ready'),
  startedAt: integer('started_at').notNull(),
  endedAt: integer('ended_at'),
});

/**
 * 13. Bảng activity_results: Kết quả snapshot bất biến của người chơi
 */
export const activityResults = sqliteTable('activity_results', {
  id: text('id').primaryKey(),
  runId: text('run_id')
    .notNull()
    .references(() => activityRuns.id, { onDelete: 'cascade' }),
  participantId: text('participant_id')
    .notNull()
    .references(() => participants.id, { onDelete: 'cascade' }),
  scoreJson: text('score_json').notNull(),
  rank: integer('rank'),
});

export type ActivityRunSelect = typeof activityRuns.$inferSelect;
export type ActivityRunInsert = typeof activityRuns.$inferInsert;
export type ActivityResultSelect = typeof activityResults.$inferSelect;
export type ActivityResultInsert = typeof activityResults.$inferInsert;

/**
 * 14. Bảng exam_answers: Nhật ký đáp án thi dạng append-only
 */
export const examAnswers = sqliteTable('exam_answers', {
  id: text('id').primaryKey(),
  runId: text('run_id')
    .notNull()
    .references(() => activityRuns.id, { onDelete: 'cascade' }),
  participantId: text('participant_id')
    .notNull()
    .references(() => participants.id, { onDelete: 'cascade' }),
  questionId: text('question_id')
    .notNull()
    .references(() => questions.id, { onDelete: 'cascade' }),
  answerJson: text('answer_json').notNull(),
  ts: integer('ts').notNull(),
});

/**
 * 15. Bảng reward_rules: Cấu hình quy tắc cộng EXP
 */
export const rewardRules = sqliteTable('reward_rules', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').references(() => users.id, { onDelete: 'cascade' }),
  scope: text('scope', { enum: ['global', 'teacher'] }).notNull(),
  activityId: text('activity_id'),
  trigger: text('trigger').notNull(),
  exp: integer('exp').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
});

export type RewardRuleSelect = typeof rewardRules.$inferSelect;
export type RewardRuleInsert = typeof rewardRules.$inferInsert;


/**
 * 16. Bảng reward_log: Nhật ký thưởng EXP
 */
export const rewardLog = sqliteTable('reward_log', {
  id: text('id').primaryKey(),
  sessionId: text('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  participantId: text('participant_id')
    .notNull()
    .references(() => participants.id, { onDelete: 'cascade' }),
  studentId: text('student_id').references(() => students.id, { onDelete: 'set null' }),
  exp: integer('exp').notNull(),
  reason: text('reason').notNull(),
  persisted: integer('persisted', { mode: 'boolean' }).notNull().default(false),
  ts: integer('ts').notNull(),
});

/**
 * 17. Bảng chat_messages: Tin nhắn trong lớp học
 */
export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  sessionId: text('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  fromParticipantId: text('from_participant_id').references(() => participants.id, {
    onDelete: 'set null',
  }),
  toParticipantId: text('to_participant_id').references(() => participants.id, {
    onDelete: 'set null',
  }),
  fromTeacher: integer('from_teacher', { mode: 'boolean' }).notNull().default(false),
  text: text('text').notNull(),
  ts: integer('ts').notNull(),
});

export type ChatMessageSelect = typeof chatMessages.$inferSelect;
export type ChatMessageInsert = typeof chatMessages.$inferInsert;

/**
 * 18. Bảng session_reports: Snapshot tổng kết phiên khi kết thúc
 */
export const sessionReports = sqliteTable('session_reports', {
  id: text('id').primaryKey(),
  sessionId: text('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  snapshotJson: text('snapshot_json').notNull(),
  createdAt: integer('created_at').notNull(),
});

/**
 * 19. Bảng audit_log: Nhật ký kiểm toán thao tác hệ thống
 */
export const auditLog = sqliteTable('audit_log', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  targetJson: text('target_json'),
  ts: integer('ts').notNull(),
});

/**
 * 20. Bảng _migrations: Theo dõi các phiên bản migration đã áp dụng
 */
export const schemaMigrations = sqliteTable('_migrations', {
  id: text('id').primaryKey(),
  version: integer('version').notNull().unique(),
  name: text('name').notNull(),
  appliedAt: integer('applied_at').notNull(),
});

/**
 * 21. Bảng videos: Kho lưu trữ video học liệu YouTube
 */
export const videos = sqliteTable('videos', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  youtubeUrl: text('youtube_url').notNull(),
  youtubeId: text('youtube_id').notNull(),
  category: text('category').notNull().default('Khởi động'),
  description: text('description'),
  duration: text('duration'),
  tagsJson: text('tags_json'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type VideoSelect = typeof videos.$inferSelect;
export type VideoInsert = typeof videos.$inferInsert;

/**
 * 22. Bảng exams: Quản lý kỳ thi lâu dài của lớp học (hỗ trợ chia ca thi)
 */
export const exams = sqliteTable('exams', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  classId: text('class_id')
    .notNull()
    .references(() => classes.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  subject: text('subject'),
  durationMinutes: integer('duration_minutes').notNull().default(45),
  configJson: text('config_json').notNull(),
  questionsSnapshotJson: text('questions_snapshot_json').notNull(),
  status: text('status', {
    enum: ['ready', 'in_progress', 'waiting_next_batch', 'finished'],
  })
    .notNull()
    .default('ready'),
  currentBatch: integer('current_batch').notNull().default(1),
  activeSessionId: text('active_session_id').references(() => sessions.id, {
    onDelete: 'set null',
  }),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type ExamSelect = typeof exams.$inferSelect;
export type ExamInsert = typeof exams.$inferInsert;

/**
 * 23. Bảng exam_records: Kết quả thi của từng học sinh (gắn theo kỳ thi và ca thi)
 */
export const examRecords = sqliteTable('exam_records', {
  id: text('id').primaryKey(),
  examId: text('exam_id')
    .notNull()
    .references(() => exams.id, { onDelete: 'cascade' }),
  studentId: text('student_id')
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  studentName: text('student_name').notNull(),
  batchIndex: integer('batch_index').notNull().default(1),
  status: text('status', {
    enum: ['in_progress', 'submitted'],
  })
    .notNull()
    .default('submitted'),
  score: real('score').notNull().default(0),
  maxScore: real('max_score').notNull().default(10),
  percentage: real('percentage').notNull().default(0),
  correctCount: integer('correct_count').notNull().default(0),
  totalQuestions: integer('total_questions').notNull().default(0),
  answersJson: text('answers_json').notNull(),
  resultJson: text('result_json'),
  timeSpentSeconds: integer('time_spent_seconds').notNull().default(0),
  submittedAt: integer('submitted_at').notNull(),
});

export type ExamRecordSelect = typeof examRecords.$inferSelect;
export type ExamRecordInsert = typeof examRecords.$inferInsert;

/**
 * 24. Bảng bank_questions: Ngân hàng câu hỏi tập trung phân loại theo bài học & mức độ
 */
export const bankQuestions = sqliteTable('bank_questions', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  grade: integer('grade').notNull(),
  subject: text('subject').notNull(),
  chapter: text('chapter').notNull(),
  lesson: text('lesson').notNull(),
  difficulty: text('difficulty', {
    enum: ['nb', 'th', 'vd', 'vdc'],
  }).notNull(),
  type: text('type', {
    enum: ['mcq4', 'tf', 'tf_group', 'short', 'matching', 'cloze_drag'],
  }).notNull(),
  contentJson: text('content_json').notNull(),
  answerJson: text('answer_json').notNull(),
  points: integer('points').notNull().default(10),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type BankQuestionSelect = typeof bankQuestions.$inferSelect;
export type BankQuestionInsert = typeof bankQuestions.$inferInsert;

