import fs from 'node:fs';
import path from 'node:path';
import fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import {
  AssetRepository,
  ClassRepository,
  createDatabaseConnection,
  type EduClassDatabase,
  ParticipantRepository,
  QuestionSetRepository,
  RewardRepository,
  runMigrations,
  SessionReportRepository,
  SessionRepository,
  StudentRepository,
  TeamRepository,
  TitleRepository,
  ChatRepository,
  UserRepository,
  VideoRepository,
  ExamRepository,
  ExamRecordRepository,
  BankQuestionRepository,
  ClassGroupRepository,
} from '@educlass/db';
import { AdminService } from './auth/admin-service.js';
import { AuthService } from './auth/auth-service.js';
import { type PasswordHasher, ScryptPasswordHasher } from './auth/password-hasher.js';
import { TokenService } from './auth/token-service.js';
import { adminRoutes } from './routes/admin.js';
import { assetsRoutes } from './routes/assets.js';
import { authRoutes } from './routes/auth.js';
import { classesRoutes } from './routes/classes.js';
import { classGroupsRoutes } from './routes/class-groups.js';
import { healthRoutes } from './routes/health.js';
import { questionSetsRoutes } from './routes/question-sets.js';
import { bankRoutes } from './routes/bank.js';
import { sessionsRoutes } from './routes/sessions.js';
import { studentsRoutes } from './routes/students.js';
import { titlesRoutes } from './routes/titles.js';
import { chatRoutes } from './routes/chat.js';
import { videosRoutes } from './routes/videos.js';
import { ExcelService } from './services/excel-service.js';
import { QrService } from './services/qr-service.js';
import { BeaconService } from './services/beacon-service.js';
import { serveUiPlugin, type ServeUiOptions } from './static/serve-ui.js';
import { wsGatewayRoutes, WsGatewayManager } from './ws/gateway.js';
import { ActivityRunRepository } from '@educlass/db';
import { ActivityEngine } from './activity/engine.js';
import { ActivityRegistry, defaultActivityRegistry } from './activity/registry.js';
import { activitiesRoutes } from './routes/activities.js';
import { assignmentsRoutes } from './routes/assignments.js';
import { RewardRuleService } from './rewards/reward-rule-service.js';
import { rewardRulesRoutes } from './routes/reward-rules.js';
import { objectCameraRoutes } from './routes/object-camera.js';
import { examsRoutes } from './routes/exams.js';

declare module 'fastify' {
  interface FastifyInstance {
    userRepo: UserRepository;
    authService: AuthService;
    adminService: AdminService;
    classRepo: ClassRepository;
    studentRepo: StudentRepository;
    titleRepo: TitleRepository;
    chatRepo: ChatRepository;
    questionSetRepo: QuestionSetRepository;
    sessionRepo: SessionRepository;
    sessionReportRepo: SessionReportRepository;
    participantRepo: ParticipantRepository;
    rewardRepo: RewardRepository;
    rewardRuleService: RewardRuleService;
    teamRepo: TeamRepository;
    assetRepo: AssetRepository;
    activityRunRepo: ActivityRunRepository;
    activityEngine: ActivityEngine;
    activityRegistry: ActivityRegistry;
    excelService: ExcelService;
    qrService: QrService;
    beaconService: BeaconService;
    wsManager: WsGatewayManager;
    videoRepo: VideoRepository;
    examRepo: ExamRepository;
    examRecordRepo: ExamRecordRepository;
    bankRepo: BankQuestionRepository;
    classGroupRepo: ClassGroupRepository;
  }
}

export interface BuildServerOptions {
  fastifyOptions?: FastifyServerOptions | undefined;
  wsManager?: WsGatewayManager | undefined;
  teacherUiDir?: string | undefined;
  studentUiDir?: string | undefined;
  dataDir?: string | undefined;
  assetsDir?: string | undefined;
  submissionsDir?: string | undefined;
  materialsDir?: string | undefined;
  tempDir?: string | undefined;
  db?: EduClassDatabase | undefined;
  userRepo?: UserRepository | undefined;
  classRepo?: ClassRepository | undefined;
  classGroupRepo?: ClassGroupRepository | undefined;
  studentRepo?: StudentRepository | undefined;
  titleRepo?: TitleRepository | undefined;
  chatRepo?: ChatRepository | undefined;
  videoRepo?: VideoRepository | undefined;
  examRepo?: ExamRepository | undefined;
  examRecordRepo?: ExamRecordRepository | undefined;
  bankRepo?: BankQuestionRepository | undefined;
  questionSetRepo?: QuestionSetRepository | undefined;
  sessionRepo?: SessionRepository | undefined;
  sessionReportRepo?: SessionReportRepository | undefined;
  participantRepo?: ParticipantRepository | undefined;
  rewardRepo?: RewardRepository | undefined;
  teamRepo?: TeamRepository | undefined;
  assetRepo?: AssetRepository | undefined;
  activityRunRepo?: ActivityRunRepository | undefined;
  activityRegistry?: ActivityRegistry | undefined;
  activityEngine?: ActivityEngine | undefined;
  rewardRuleService?: RewardRuleService | undefined;
  passwordHasher?: PasswordHasher | undefined;
  tokenService?: TokenService | undefined;
  authService?: AuthService | undefined;
  adminService?: AdminService | undefined;
  excelService?: ExcelService | undefined;
  qrService?: QrService | undefined;
  beaconService?: BeaconService | undefined;
  beaconPort?: number | undefined;
  autoSeedAdmin?: boolean | undefined;
  dbPath?: string | undefined;
}

/**
 * Xây dựng và khởi tạo phiên bản Fastify Server của EduClass v2
 */
export async function buildServer(options: BuildServerOptions = {}): Promise<FastifyInstance> {
  const app = fastify({
    bodyLimit: 150 * 1024 * 1024, // 150MB cho phép upload file bài tập (Word, Excel, PPTX, PDF, Zip...) và gói .educlass
    ...options.fastifyOptions,
  });

  // Cho phép body rỗng khi Content-Type là application/json (tránh lỗi FST_ERR_CTP_EMPTY_JSON_BODY)
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string', bodyLimit: 150 * 1024 * 1024 },
    (_req, body, done) => {
      if (!body || (typeof body === 'string' && body.trim() === '')) {
        return done(null, {});
      }
      try {
        const content = typeof body === 'string' ? body : body.toString('utf-8');
        done(null, JSON.parse(content));
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );

  const wsManager = options.wsManager ?? new WsGatewayManager();

  // Khởi tạo Database & Repositories
  let db = options.db;
  if (
    !db &&
    (!options.userRepo || !options.classRepo || !options.studentRepo || !options.sessionRepo)
  ) {
    let conn;
    if (options.dbPath) {
      const dir = path.dirname(options.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      conn = createDatabaseConnection({ path: options.dbPath });
    } else {
      conn = createDatabaseConnection({ inMemory: true });
    }
    runMigrations({ sqlite: conn.sqlite, dbPath: options.dbPath });
    db = conn.db;
  }

  const userRepo = options.userRepo ?? new UserRepository(db!);
  const classRepo = options.classRepo ?? new ClassRepository(db!);
  const studentRepo = options.studentRepo ?? new StudentRepository(db!);
  const titleRepo = options.titleRepo ?? new TitleRepository(db!);
  const chatRepo = options.chatRepo ?? new ChatRepository(db!);
  const videoRepo = options.videoRepo ?? new VideoRepository(db!);
  const examRepo = options.examRepo ?? new ExamRepository(db!);
  const examRecordRepo = options.examRecordRepo ?? new ExamRecordRepository(db!);
  const bankRepo = options.bankRepo ?? new BankQuestionRepository(db!);
  const classGroupRepo = options.classGroupRepo ?? new ClassGroupRepository(db!);
  const questionSetRepo = options.questionSetRepo ?? new QuestionSetRepository(db!);
  const sessionRepo = options.sessionRepo ?? new SessionRepository(db!);
  const sessionReportRepo = options.sessionReportRepo ?? new SessionReportRepository(db!);
  const participantRepo = options.participantRepo ?? new ParticipantRepository(db!);
  const rewardRepo = options.rewardRepo ?? new RewardRepository(db!);
  const rewardRuleService = options.rewardRuleService ?? new RewardRuleService(rewardRepo);
  const teamRepo = options.teamRepo ?? new TeamRepository(db!);
  const assetRepo = options.assetRepo ?? new AssetRepository(db!);
  const activityRunRepo = options.activityRunRepo ?? new ActivityRunRepository(db!);
  const activityRegistry = options.activityRegistry ?? defaultActivityRegistry;
  const beaconService = options.beaconService ?? new BeaconService({ port: options.beaconPort });
  const activityEngine =
    options.activityEngine ??
    new ActivityEngine({
      registry: activityRegistry,
      activityRunRepo,
      rewardRepo,
      rewardRuleService,
      sessionRepo,
      studentRepo,
      participantRepo,
      classRepo,
      wsManager,
      examRecordRepo,
      examRepo,
      beaconService,
    });

  // Khởi tạo Auth & Admin Services & Excel Service & Qr Service
  const passwordHasher = options.passwordHasher ?? new ScryptPasswordHasher();
  const tokenService = options.tokenService ?? new TokenService();
  const authService =
    options.authService ?? new AuthService(userRepo, passwordHasher, tokenService);
  const adminService = options.adminService ?? new AdminService(userRepo, passwordHasher);
  const excelService = options.excelService ?? new ExcelService();
  const qrService = options.qrService ?? new QrService();

  // Tự động tạo tài khoản admin mặc định nếu DB chưa có người dùng
  if (options.autoSeedAdmin !== false) {
    await authService.ensureInitialAdmin();
  }

  app.decorate('userRepo', userRepo);
  app.decorate('authService', authService);
  app.decorate('adminService', adminService);
  app.decorate('classRepo', classRepo);
  app.decorate('studentRepo', studentRepo);
  app.decorate('titleRepo', titleRepo);
  app.decorate('chatRepo', chatRepo);
  app.decorate('videoRepo', videoRepo);
  app.decorate('examRepo', examRepo);
  app.decorate('examRecordRepo', examRecordRepo);
  app.decorate('bankRepo', bankRepo);
  app.decorate('classGroupRepo', classGroupRepo);
  app.decorate('questionSetRepo', questionSetRepo);
  app.decorate('sessionRepo', sessionRepo);
  app.decorate('sessionReportRepo', sessionReportRepo);
  app.decorate('participantRepo', participantRepo);
  app.decorate('rewardRepo', rewardRepo);
  app.decorate('rewardRuleService', rewardRuleService);
  app.decorate('teamRepo', teamRepo);
  app.decorate('assetRepo', assetRepo);
  app.decorate('activityRunRepo', activityRunRepo);
  app.decorate('activityRegistry', activityRegistry);
  app.decorate('activityEngine', activityEngine);
  app.decorate('excelService', excelService);
  app.decorate('qrService', qrService);
  app.decorate('beaconService', beaconService);
  app.decorate('wsManager', wsManager);

  // Đăng ký WebSocket plugin
  await app.register(fastifyWebsocket);

  // Đăng ký route kiểm tra sức khỏe
  await app.register(healthRoutes);

  // Xác định các thư mục lưu trữ dữ liệu an toàn (ưu tiên dataDir được chỉ định)
  const resolvedDataDir =
    options.dataDir ??
    (options.dbPath ? path.dirname(options.dbPath) : path.join(process.cwd(), 'data'));

  const resolvedAssetsDir = options.assetsDir ?? path.join(resolvedDataDir, 'assets');
  const resolvedSubmissionsDir = options.submissionsDir ?? path.join(resolvedDataDir, 'submissions');
  const resolvedMaterialsDir = options.materialsDir ?? path.join(resolvedDataDir, 'materials');
  const resolvedTempDir = options.tempDir ?? path.join(resolvedDataDir, 'temp', 'object-camera');

  // Đăng ký Assets routes (upload ảnh, hash SHA-256, deduplication, static serve theo hash)
  await app.register(assetsRoutes, {
    authService,
    assetRepo,
    assetsDir: resolvedAssetsDir,
  });

  // Đăng ký Auth routes và Admin routes
  await app.register(authRoutes, { authService });
  await app.register(adminRoutes, { authService, adminService });

  // Đăng ký Classes routes (có phân quyền Owner Guard theo D5)
  await app.register(classesRoutes, { authService, classRepo });

  // Đăng ký Students routes (CRUD, PIN, Import Excel & Paste clipboard)
  await app.register(studentsRoutes, {
    authService,
    classRepo,
    studentRepo,
    passwordHasher,
    excelService,
  });

  // Đăng ký Class Groups routes (Quản lý nhóm, chia đều ngẫu nhiên, chuyển nhóm, gán nhóm trưởng)
  await app.register(classGroupsRoutes, {
    authService,
    classRepo,
    classGroupRepo,
    studentRepo,
  });

  // Đăng ký Titles routes (Danh hiệu, Avatar nhân vật, Hồ sơ game hóa)
  await app.register(titlesRoutes, {
    titleRepo,
    studentRepo,
  });

  // Đăng ký Chat routes (Chat GV↔HS chung/riêng, khóa chat, nút giơ tay xin giúp)
  await app.register(chatRoutes, {
    chatRepo,
    sessionRepo,
    participantRepo,
    authService,
    tokenService,
    wsManager,
  });

  // Đăng ký Question Sets routes (quản lý bộ đề, tags, tìm kiếm, nhân bản, xuất/nhập file .educlass)
  await app.register(questionSetsRoutes, {
    authService,
    questionSetRepo,
    assetRepo,
    assetsDir: resolvedAssetsDir,
  });

  // Đăng ký Bank routes (Ngân hàng câu hỏi & Sinh đề theo ma trận)
  await app.register(bankRoutes, {
    authService,
    bankRepo,
    questionSetRepo,
    assetRepo,
    assetsDir: resolvedAssetsDir,
  });

  // Đăng ký Videos routes (Kho lưu video YouTube, phân loại, trình chiếu không quảng cáo)
  await app.register(videosRoutes, {
    authService,
    videoRepo,
  });


  // Đăng ký Sessions routes (Mở phiên, chọn lớp/tự do, mã 6 số, QR, tra cứu, HS vào lớp, đóng phiên & báo cáo, thưởng EXP)
  await app.register(sessionsRoutes, {
    authService,
    sessionRepo,
    sessionReportRepo,
    classRepo,
    userRepo,
    studentRepo,
    participantRepo,
    rewardRepo,
    teamRepo,
    tokenService,
    passwordHasher,
    qrService,
    wsManager,
    activityRunRepo,
    excelService,
    titleRepo,
    examRepo,
    examRecordRepo,
    activityEngine,
    beaconService,
  });

  // Đăng ký Activities routes (quản lý plugin, khởi chạy, đồng bộ state, thu kết quả)
  await app.register(activitiesRoutes, {
    authService,
    tokenService,
    sessionRepo,
    registry: activityRegistry,
    activityEngine,
  });

  // Đăng ký Assignments routes (Thu - phát bài tập, nộp file, tải file, xem trước Office/PDF, mở thư mục OS)
  await app.register(assignmentsRoutes, {
    submissionsBaseDir: resolvedSubmissionsDir,
    materialsBaseDir: resolvedMaterialsDir,
  });

  // Đăng ký Object Camera routes (Camera vật thể, chụp từ điện thoại GV, stream file tạm LAN)
  await app.register(objectCameraRoutes, {
    tempBaseDir: resolvedTempDir,
  });

  // Đăng ký Reward Rules routes (Cài đặt EXP, ưu tiên global/teacher, trần EXP chống lạm phát)
  await app.register(rewardRulesRoutes, {
    authService,
    rewardRuleService,
  });

  // Đăng ký Exams routes (Kỳ thi theo ca & Quản lý báo cáo kỳ thi lâu dài)
  await app.register(examsRoutes, {
    authService,
    examRepo,
    examRecordRepo,
    classRepo,
    studentRepo,
    questionSetRepo,
    sessionRepo,
    activityEngine,
    excelService,
    participantRepo,
  });

  // Đăng ký WebSocket gateway
  await app.register(wsGatewayRoutes, { manager: wsManager, participantRepo });

  // Đăng ký phục vụ static assets cho 2 giao diện Teacher UI và Student UI
  const serveUiOpts: ServeUiOptions = {};
  if (options.teacherUiDir !== undefined) {
    serveUiOpts.teacherUiDir = options.teacherUiDir;
  }
  if (options.studentUiDir !== undefined) {
    serveUiOpts.studentUiDir = options.studentUiDir;
  }

  await app.register(serveUiPlugin, serveUiOpts);

  app.addHook('onClose', async () => {
    await beaconService.stop();
  });

  return app;
}
