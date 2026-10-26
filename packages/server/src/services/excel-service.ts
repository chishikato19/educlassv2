import * as XLSX from 'xlsx';
import { parseClipboardText } from '@educlass/core';
import type {
  ExamStats,
  ProjectGradingConfig,
  ProjectGradingStudentResult,
  SessionReportSnapshot,
  StudentImportRow,
} from '@educlass/protocol';

export class ExcelService {
  /**
   * Phân tích tệp tin bảng tính Excel (.xlsx) dạng Buffer nhị phân thành danh sách dòng học sinh
   */
  parseXlsxBuffer(buffer: Buffer): StudentImportRow[] {
    if (!buffer || buffer.length === 0) {
      return [];
    }

    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        return [];
      }

      const sheet = workbook.Sheets[firstSheetName];
      if (!sheet) {
        return [];
      }

      // Chuyển đổi nội dung sheet thành định dạng TSV UTF-8 và sử dụng parser đồng nhất từ @educlass/core
      const tsvText = XLSX.utils.sheet_to_csv(sheet, { FS: '\t' });
      return parseClipboardText(tsvText);
    } catch {
      return [];
    }
  }

  /**
   * Tạo tệp Excel mẫu để giáo viên tải về và điền danh sách học sinh
   */
  generateTemplateBuffer(): Buffer {
    const data = [
      ['STT', 'Mã học sinh', 'Họ và tên', 'Mã PIN'],
      [1, 'HS001', 'Nguyễn Văn An', '1234'],
      [2, 'HS002', 'Trần Thị Bích', '5678'],
      [3, 'HS003', 'Lê Văn Cường', ''],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhSachHocSinh');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  /**
   * Xuất báo cáo tổng kết phiên học ra tệp Excel (.xlsx) gồm 3 trang tính:
   * 1. Tổng quan phiên
   * 2. Bảng điểm học sinh
   * 3. Câu hỏi sai nhiều
   */
  exportSessionReportBuffer(snapshot: SessionReportSnapshot): Buffer {
    const workbook = XLSX.utils.book_new();

    // 1. Sheet Tổng quan phiên
    const summaryRows: Array<Array<string | number>> = [
      ['BÁO CÁO TỔNG KẾT PHIÊN HỌC'],
      ['Mã phiên (Join Code)', snapshot.sessionCode],
      ['Lớp học', snapshot.className ?? 'Tự do'],
      ['Thời gian bắt đầu', new Date(snapshot.openedAt).toLocaleString('vi-VN')],
      [
        'Thời gian kết thúc',
        snapshot.closedAt ? new Date(snapshot.closedAt).toLocaleString('vi-VN') : 'Đang diễn ra',
      ],
      ['Chế độ định danh', snapshot.identityMode],
      ['Tổng số học sinh tham gia', snapshot.totalParticipants],
      ['Đang hoạt động (Online)', snapshot.onlineParticipants],
      ['Đã rời khỏi (Offline)', snapshot.offlineParticipants],
      [],
      ['CHỈ SỐ HỌC TẬP TỔNG QUAN'],
      ['Tổng số câu hỏi', snapshot.summary?.totalQuestions ?? 0],
      ['Điểm trung bình', snapshot.summary?.averageScore ?? 0],
      ['Độ chính xác trung bình (%)', `${snapshot.summary?.averageAccuracy ?? 0}%`],
      ['Tổng EXP đã trao', snapshot.summary?.totalExpAwarded ?? 0],
      ['Học sinh dẫn đầu', snapshot.scoreboard?.[0]?.displayName ?? 'Chưa xác định'],
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(workbook, wsSummary, 'Tổng quan phiên');

    // 2. Sheet Bảng điểm học sinh
    const scoreboardHeaders = [
      'Hạng',
      'Họ và tên',
      'Đội/Nhóm',
      'Tổng điểm',
      'Số câu đúng',
      'Tổng câu hỏi',
      'Độ chính xác (%)',
      'EXP nhận được',
    ];
    const scoreboardRows = (snapshot.scoreboard ?? []).map(item => [
      item.rank,
      item.displayName,
      item.teamName ?? '',
      item.score,
      item.correctCount,
      item.totalQuestions,
      `${item.accuracy}%`,
      item.expEarned,
    ]);
    const wsScoreboard = XLSX.utils.aoa_to_sheet([scoreboardHeaders, ...scoreboardRows]);
    XLSX.utils.book_append_sheet(workbook, wsScoreboard, 'Bảng điểm học sinh');

    // 3. Sheet Câu hỏi sai nhiều
    const difficultHeaders = [
      'STT',
      'Hoạt động',
      'Nội dung câu hỏi',
      'Số lượt làm',
      'Số lượt trả lời sai',
      'Tỉ lệ sai (%)',
    ];
    const difficultRows = (snapshot.difficultQuestions ?? []).map((q, idx) => [
      idx + 1,
      q.activityName,
      q.stem,
      q.totalAttempts,
      q.incorrectCount,
      `${q.errorRate}%`,
    ]);
    const wsDifficult = XLSX.utils.aoa_to_sheet([difficultHeaders, ...difficultRows]);
    XLSX.utils.book_append_sheet(workbook, wsDifficult, 'Câu hỏi sai nhiều');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  /**
   * Xuất báo cáo kỳ thi tổng hợp cho cả lớp (hỗ trợ nhiều ca) ra tệp Excel (.xlsx)
   */
  exportExamReportBuffer(input: ExamExportInput): Buffer {
    const workbook = XLSX.utils.book_new();
    const { exam, className, students, records, stats, questions = [] } = input;
    const recordMap = new Map(records.map(r => [r.studentId, r]));
    const submittedCount = records.filter(r => r.status === 'submitted').length;

    // 1. Sheet Bảng điểm tổng hợp cả lớp
    const summaryHeaderRows: Array<Array<string | number>> = [
      ['BẢNG ĐIỂM TỔNG HỢP KỲ THI'],
      ['Tên bài thi', exam.title],
      ['Môn học', exam.subject ?? 'Chung'],
      ['Lớp học', className],
      ['Sĩ số lớp', students.length],
      [
        'Số học sinh đã dự thi',
        `${submittedCount} / ${students.length} (${
          students.length > 0 ? Math.round((submittedCount / students.length) * 100) : 0
        }%)`,
      ],
      ['Điểm trung bình', stats.averageScore],
      ['Điểm cao nhất', stats.highestScore],
      ['Điểm thấp nhất', stats.lowestScore],
      ['Thời gian tạo kỳ thi', new Date(exam.createdAt).toLocaleString('vi-VN')],
      [],
    ];

    const studentHeaders = [
      'STT',
      'Mã học sinh',
      'Họ và tên',
      'Lớp',
      'Trạng thái',
      'Ca thi',
      'Điểm số',
      'Thang điểm',
      'Tỉ lệ đúng (%)',
      'Số câu đúng',
      'Tổng số câu',
      'Thời gian làm bài',
      'Thời điểm nộp bài',
      ...questions.map((q, idx) => {
        const pts = typeof q['points'] === 'number' ? ` (${q['points']}đ)` : '';
        return `Câu ${idx + 1}${pts}`;
      }),
    ];

    const studentRows = students.map((st, idx) => {
      const rec = recordMap.get(st.id);
      if (rec && rec.status === 'submitted') {
        const mins = Math.floor(rec.timeSpentSeconds / 60);
        const secs = rec.timeSpentSeconds % 60;
        const timeStr = `${mins}p ${secs}s`;
        const dateStr = new Date(rec.submittedAt).toLocaleString('vi-VN');

        let reviewData: Array<Record<string, unknown>> = [];
        if (rec.resultJson) {
          try {
            const parsed = JSON.parse(rec.resultJson);
            if (Array.isArray(parsed)) {
              reviewData = parsed;
            }
          } catch {
            // ignore
          }
        }
        let studentAnswers: Record<string, unknown> = {};
        if (rec.answersJson) {
          try {
            studentAnswers = JSON.parse(rec.answersJson);
          } catch {
            // ignore
          }
        }

        const questionCells = questions.map((q, qIdx) => {
          const qId = String(q['id'] || `q_${qIdx + 1}`);
          const rev = reviewData.find(
            it => it && (it['questionId'] === qId || it['id'] === qId || it['order'] === qIdx + 1)
          );
          if (rev) {
            let choice = rev['studentChoiceLabel'] ?? rev['studentAnswer'] ?? '';
            if (typeof choice === 'object' && choice !== null && 'selected' in choice) {
              const sel = (choice as Record<string, unknown>)['selected'];
              choice = ['A', 'B', 'C', 'D'][Number(sel)] ?? String(sel);
            }
            const isCorrect = rev['isCorrect'] === true || rev['correct'] === true;
            if (choice !== '') {
              return `${choice} (${isCorrect ? 'Đúng' : 'Sai'})`;
            }
            return isCorrect ? 'Đúng' : 'Sai';
          }

          const rawAns = studentAnswers[qId] ?? studentAnswers[`q_${qIdx + 1}`] ?? studentAnswers[`q${qIdx + 1}`];
          if (rawAns !== undefined && rawAns !== null && rawAns !== '') {
            let choiceStr = String(rawAns);
            if (typeof rawAns === 'number' && rawAns >= 0 && rawAns < 4) {
              choiceStr = ['A', 'B', 'C', 'D'][rawAns] || String(rawAns);
            } else if (typeof rawAns === 'object' && 'selected' in (rawAns as Record<string, unknown>)) {
              const sel = Number((rawAns as Record<string, unknown>)['selected']);
              choiceStr = ['A', 'B', 'C', 'D'][sel] || String(sel);
            }
            const correctVal = q['correct'] ?? (q as Record<string, unknown>)['correctAnswer'];
            if (correctVal !== undefined) {
              const isCorrect =
                String(rawAns) === String(correctVal) ||
                (typeof rawAns === 'number' && rawAns === correctVal);
              return `${choiceStr} (${isCorrect ? 'Đúng' : 'Sai'})`;
            }
            return choiceStr;
          }

          return '-';
        });

        return [
          idx + 1,
          st.code ?? '',
          st.fullName,
          className,
          'Đã hoàn thành',
          `Ca ${rec.batchIndex}`,
          rec.score,
          rec.maxScore,
          `${rec.percentage}%`,
          rec.correctCount,
          rec.totalQuestions,
          timeStr,
          dateStr,
          ...questionCells,
        ];
      }
      return [
        idx + 1,
        st.code ?? '',
        st.fullName,
        className,
        'Chưa dự thi',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        ...questions.map(() => '-'),
      ];
    });

    const wsGradebook = XLSX.utils.aoa_to_sheet([...summaryHeaderRows, studentHeaders, ...studentRows]);

    // Thiết lập độ rộng cột chuẩn mực, chống tràn và cắt cụt chữ
    wsGradebook['!cols'] = [
      { wch: 6 },   // STT
      { wch: 14 },  // Mã học sinh
      { wch: 24 },  // Họ và tên
      { wch: 12 },  // Lớp
      { wch: 16 },  // Trạng thái
      { wch: 10 },  // Ca thi
      { wch: 10 },  // Điểm số
      { wch: 12 },  // Thang điểm
      { wch: 14 },  // Tỉ lệ đúng (%)
      { wch: 14 },  // Số câu đúng
      { wch: 14 },  // Tổng số câu
      { wch: 18 },  // Thời gian làm bài
      { wch: 22 },  // Thời điểm nộp bài
      ...questions.map(() => ({ wch: 18 })), // Cột phương án câu hỏi
    ];

    XLSX.utils.book_append_sheet(workbook, wsGradebook, 'Bảng điểm lớp');

    // 2. Sheet Phổ điểm & Xếp loại
    const gradeHeaders = ['Xếp loại học lực', 'Khoảng điểm', 'Số lượng', 'Tỉ lệ (%)'];
    const totalSubmitted = submittedCount > 0 ? submittedCount : 1;
    const gradeRows = [
      [
        'Giỏi / Tốt',
        '8.0 - 10.0',
        stats.gradeDistribution.tot,
        `${Math.round((stats.gradeDistribution.tot / totalSubmitted) * 100)}%`,
      ],
      [
        'Khá',
        '6.5 - 7.9',
        stats.gradeDistribution.kha,
        `${Math.round((stats.gradeDistribution.kha / totalSubmitted) * 100)}%`,
      ],
      [
        'Đạt / Trung bình',
        '5.0 - 6.4',
        stats.gradeDistribution.dat,
        `${Math.round((stats.gradeDistribution.dat / totalSubmitted) * 100)}%`,
      ],
      [
        'Chưa đạt',
        '< 5.0',
        stats.gradeDistribution.chuaDat,
        `${Math.round((stats.gradeDistribution.chuaDat / totalSubmitted) * 100)}%`,
      ],
    ];
    const wsGrades = XLSX.utils.aoa_to_sheet([gradeHeaders, ...gradeRows]);
    wsGrades['!cols'] = [
      { wch: 20 },
      { wch: 16 },
      { wch: 12 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(workbook, wsGrades, 'Phổ điểm');

    // 3. Sheet Phân tích câu hỏi
    if (stats.questionAnalysis && stats.questionAnalysis.length > 0) {
      const qHeaders = [
        'STT câu',
        'Mã câu hỏi',
        'Tỉ lệ đúng (%)',
        'Số học sinh làm đúng',
        'Tổng số lượt làm',
      ];
      const qRows = stats.questionAnalysis.map(q => [
        q.order,
        q.questionId,
        `${q.correctRatio}%`,
        q.correctCount,
        q.totalAnswered,
      ]);
      const wsQuestions = XLSX.utils.aoa_to_sheet([qHeaders, ...qRows]);
      wsQuestions['!cols'] = [
        { wch: 10 },
        { wch: 18 },
        { wch: 16 },
        { wch: 22 },
        { wch: 20 },
      ];
      XLSX.utils.book_append_sheet(workbook, wsQuestions, 'Phân tích câu hỏi');
    }

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  /**
   * Xuất báo cáo kết quả chấm điểm dự án đa chiều (4 cột điểm) ra tệp Excel (.xlsx)
   */
  exportProjectGradingBuffer(
    results: ProjectGradingStudentResult[],
    config: ProjectGradingConfig,
    className?: string
  ): Buffer {
    const workbook = XLSX.utils.book_new();

    // 1. Tiêu đề và thông số trọng số
    const headerTitle = ['BÁO CÁO KẾT QUẢ ĐÁNH GIÁ DỰ ÁN ĐA CHIỀU'];
    const subTitle = [
      `Dự án: ${config.title}`,
      `Lớp học: ${className || 'Tự do'}`,
      `Trọng số: Tự chấm ${config.weights.self}% | Tổ chấm ${config.weights.teamMember}% | Chéo nhóm ${config.weights.crossTeam}% | Giáo viên ${config.weights.teacher}%`,
    ];

    const tableHeaders = [
      'Xếp hạng',
      'Họ và tên',
      'Tổ / Nhóm',
      'Vai trò',
      `Tự chấm (${config.weights.self}%)`,
      `Tổ chấm (${config.weights.teamMember}%)`,
      `Chéo nhóm (${config.weights.crossTeam}%)`,
      `Giáo viên (${config.weights.teacher}%)`,
      'ĐIỂM TỔNG KẾT',
      'Nhận xét / Đóng góp',
    ];

    const rows = results.map((r, idx) => [
      r.rank ?? idx + 1,
      r.displayName,
      r.groupName,
      r.isLeader ? 'Nhóm trưởng ⭐' : 'Thành viên',
      r.selfScore !== null ? r.selfScore : '-',
      r.teamMemberScore !== null ? r.teamMemberScore : '-',
      r.crossTeamScore !== null ? r.crossTeamScore : '-',
      r.teacherScore !== null ? r.teacherScore : '-',
      r.finalScore,
      r.feedbackComments?.join('; ') ?? '',
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([
      headerTitle,
      subTitle,
      [],
      tableHeaders,
      ...rows,
    ]);

    worksheet['!cols'] = [
      { wch: 10 },
      { wch: 24 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 45 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'BangDiemDuAn');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}

export interface ExamExportInput {
  exam: {
    id: string;
    title: string;
    subject?: string | null;
    durationMinutes: number;
    createdAt: number;
  };
  className: string;
  students: Array<{
    id: string;
    fullName: string;
    code?: string | null;
  }>;
  records: Array<{
    studentId: string;
    studentName: string;
    batchIndex: number;
    status: string;
    score: number;
    maxScore: number;
    percentage: number;
    correctCount: number;
    totalQuestions: number;
    timeSpentSeconds: number;
    submittedAt: number;
    answersJson?: string;
    resultJson?: string | null;
  }>;
  questions?: Array<Record<string, unknown>>;
  stats: ExamStats;
}

