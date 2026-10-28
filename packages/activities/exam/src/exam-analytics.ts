import * as XLSX from 'xlsx';
import { type Question, gradeQuestion, richTextToString } from '@educlass/question-kit';
import type { ExamResult, ParticipantExamStatus } from './exam-schemas.js';
import { unmapStudentAnswer } from './exam-shuffler.js';

export interface ScoreBucket {
  id: string;
  label: string;
  range: string;
  minScore: number;
  maxScore: number;
  count: number;
  percentage: number;
  color: string;
  studentNames: string[];
}

export interface ExamOverviewReport {
  totalParticipants: number;
  submittedCount: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  medianScore: number;
  passCount: number;
  passRate: number;
  buckets: ScoreBucket[];
}

export interface QuestionOptionBreakdown {
  index: number;
  label: string;
  text: string;
  isCorrect: boolean;
  selectedCount: number;
  percentage: number;
}

export interface QuestionErrorAnalysisItem {
  questionId: string;
  order: number;
  stemText: string;
  type: string;
  points: number;
  totalAttempts: number;
  correctCount: number;
  incorrectCount: number;
  errorRate: number;
  unansweredCount: number;
  options?: QuestionOptionBreakdown[] | undefined;
}

/**
 * Tính toán Phổ điểm (Score Distribution) và các chỉ số thống kê tổng quan
 * theo thang điểm chuẩn của kỳ thi (mặc định quy đổi hoặc lấy theo maxScore)
 */
export function calculateScoreDistribution(
  results: ExamResult[],
  standardMax = 10
): ExamOverviewReport {
  if (!results || results.length === 0) {
    const emptyBuckets: ScoreBucket[] = [
      {
        id: 'under_5',
        label: 'Dưới 5.0 (Yếu/Kém)',
        range: '< 5.0',
        minScore: 0,
        maxScore: 4.99,
        count: 0,
        percentage: 0,
        color: '#EF4444',
        studentNames: [],
      },
      {
        id: '5_to_6_5',
        label: '5.0 - < 6.5 (Trung bình)',
        range: '5.0 - < 6.5',
        minScore: 5.0,
        maxScore: 6.49,
        count: 0,
        percentage: 0,
        color: '#F59E0B',
        studentNames: [],
      },
      {
        id: '6_5_to_8',
        label: '6.5 - < 8.0 (Khá)',
        range: '6.5 - < 8.0',
        minScore: 6.5,
        maxScore: 7.99,
        count: 0,
        percentage: 0,
        color: '#3B82F6',
        studentNames: [],
      },
      {
        id: '8_to_9',
        label: '8.0 - < 9.0 (Giỏi)',
        range: '8.0 - < 9.0',
        minScore: 8.0,
        maxScore: 8.99,
        count: 0,
        percentage: 0,
        color: '#10B981',
        studentNames: [],
      },
      {
        id: '9_to_10',
        label: '9.0 - 10.0 (Xuất sắc)',
        range: '9.0 - 10.0',
        minScore: 9.0,
        maxScore: 10.0,
        count: 0,
        percentage: 0,
        color: '#8B5CF6',
        studentNames: [],
      },
    ];

    return {
      totalParticipants: 0,
      submittedCount: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      medianScore: 0,
      passCount: 0,
      passRate: 0,
      buckets: emptyBuckets,
    };
  }

  const scores = results.map(r => {
    // Quy đổi điểm về thang standardMax (ví dụ 10) nếu bài thi dùng thang điểm khác
    const rawScore = r.score;
    const max = r.maxScore > 0 ? r.maxScore : standardMax;
    const normalized =
      standardMax === max ? rawScore : Math.round((rawScore / max) * standardMax * 100) / 100;
    return {
      normalized,
      displayName: r.displayName,
      score: r.score,
    };
  });

  const numericScores = scores.map(s => s.normalized).sort((a, b) => a - b);
  const total = numericScores.length;
  const sum = numericScores.reduce((acc, s) => acc + s, 0);
  const averageScore = Math.round((sum / total) * 100) / 100;
  const highestScore = numericScores[total - 1] ?? 0;
  const lowestScore = numericScores[0] ?? 0;

  // Tính trung vị
  let medianScore = 0;
  if (total % 2 === 1) {
    medianScore = numericScores[Math.floor(total / 2)] ?? 0;
  } else {
    const mid1 = numericScores[total / 2 - 1] ?? 0;
    const mid2 = numericScores[total / 2] ?? 0;
    medianScore = Math.round(((mid1 + mid2) / 2) * 100) / 100;
  }

  // Khởi tạo các dải điểm chuẩn
  const under5: string[] = [];
  const from5to65: string[] = [];
  const from65to8: string[] = [];
  const from8to9: string[] = [];
  const from9to10: string[] = [];

  for (const s of scores) {
    if (s.normalized < 5.0) {
      under5.push(s.displayName);
    } else if (s.normalized < 6.5) {
      from5to65.push(s.displayName);
    } else if (s.normalized < 8.0) {
      from65to8.push(s.displayName);
    } else if (s.normalized < 9.0) {
      from8to9.push(s.displayName);
    } else {
      from9to10.push(s.displayName);
    }
  }

  const passCount = scores.filter(s => s.normalized >= 5.0).length;
  const passRate = Math.round((passCount / total) * 100);

  const buckets: ScoreBucket[] = [
    {
      id: 'under_5',
      label: 'Dưới 5.0 (Yếu/Kém)',
      range: '< 5.0',
      minScore: 0,
      maxScore: 4.99,
      count: under5.length,
      percentage: Math.round((under5.length / total) * 100),
      color: '#EF4444',
      studentNames: under5,
    },
    {
      id: '5_to_6_5',
      label: '5.0 - < 6.5 (Trung bình)',
      range: '5.0 - < 6.5',
      minScore: 5.0,
      maxScore: 6.49,
      count: from5to65.length,
      percentage: Math.round((from5to65.length / total) * 100),
      color: '#F59E0B',
      studentNames: from5to65,
    },
    {
      id: '6_5_to_8',
      label: '6.5 - < 8.0 (Khá)',
      range: '6.5 - < 8.0',
      minScore: 6.5,
      maxScore: 7.99,
      count: from65to8.length,
      percentage: Math.round((from65to8.length / total) * 100),
      color: '#3B82F6',
      studentNames: from65to8,
    },
    {
      id: '8_to_9',
      label: '8.0 - < 9.0 (Giỏi)',
      range: '8.0 - < 9.0',
      minScore: 8.0,
      maxScore: 8.99,
      count: from8to9.length,
      percentage: Math.round((from8to9.length / total) * 100),
      color: '#10B981',
      studentNames: from8to9,
    },
    {
      id: '9_to_10',
      label: '9.0 - 10.0 (Xuất sắc)',
      range: '9.0 - 10.0',
      minScore: 9.0,
      maxScore: 10.0,
      count: from9to10.length,
      percentage: Math.round((from9to10.length / total) * 100),
      color: '#8B5CF6',
      studentNames: from9to10,
    },
  ];

  return {
    totalParticipants: total,
    submittedCount: results.filter(r => r.submittedAt !== null).length,
    averageScore,
    highestScore,
    lowestScore,
    medianScore,
    passCount,
    passRate,
    buckets,
  };
}

/**
 * Phân tích tỷ lệ sai và mức độ làm bài của từng câu hỏi trong kỳ thi
 */
export function calculateQuestionAnalysis(
  questions: Question[],
  participants: Record<string, ParticipantExamStatus>
): QuestionErrorAnalysisItem[] {
  const participantList = Object.values(participants);
  const totalStudents = participantList.length;

  return questions.map((origQ, idx) => {
    let totalAttempts = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    // Phân tích các phương án cho câu trắc nghiệm mcq4
    const mcqSelections: number[] = [0, 0, 0, 0];

    for (const p of participantList) {
      const studentRawAnswer = p.answers[origQ.id];
      const optionOrder = p.optionOrders[origQ.id];

      if (studentRawAnswer === undefined || studentRawAnswer === null || studentRawAnswer === '') {
        unansweredCount++;
        continue;
      }

      totalAttempts++;
      const mappedAnswer = unmapStudentAnswer(origQ, studentRawAnswer, optionOrder);
      const rev = (p.reviewData as Array<Record<string, unknown>> | undefined)?.find(
        r => r['questionId'] === origQ.id || r['id'] === origQ.id
      );
      let isCorrect = false;
      if (rev && typeof rev['isCorrect'] === 'boolean') {
        isCorrect = rev['isCorrect'];
      } else {
        const grade = gradeQuestion(origQ, mappedAnswer);
        isCorrect = grade.isCorrect;
      }

      if (isCorrect) {
        correctCount++;
      } else {
        incorrectCount++;
      }

      if (
        origQ.type === 'mcq4' &&
        mappedAnswer &&
        typeof mappedAnswer === 'object' &&
        'selected' in mappedAnswer &&
        typeof (mappedAnswer as { selected: unknown }).selected === 'number'
      ) {
        const selIdx = (mappedAnswer as { selected: number }).selected;
        if (selIdx >= 0 && selIdx < 4) {
          mcqSelections[selIdx] = (mcqSelections[selIdx] ?? 0) + 1;
        }
      }
    }

    const errorRate =
      totalAttempts > 0
        ? Math.round((incorrectCount / totalAttempts) * 100)
        : totalStudents > 0
          ? 0
          : 0;

    let options: QuestionOptionBreakdown[] | undefined;
    if (origQ.type === 'mcq4' && Array.isArray(origQ.options)) {
      const labels = ['A', 'B', 'C', 'D'];
      options = origQ.options.map((opt, optIdx) => {
        const count = mcqSelections[optIdx] ?? 0;
        return {
          index: optIdx,
          label: labels[optIdx] ?? `${optIdx + 1}`,
          text: richTextToString(opt),
          isCorrect: origQ.correct === optIdx,
          selectedCount: count,
          percentage: totalAttempts > 0 ? Math.round((count / totalAttempts) * 100) : 0,
        };
      });
    }

    return {
      questionId: origQ.id,
      order: idx + 1,
      stemText: richTextToString(origQ.stem),
      type: origQ.type,
      points: origQ.points,
      totalAttempts,
      correctCount,
      incorrectCount,
      errorRate,
      unansweredCount,
      options,
    };
  });
}

export interface GenerateExamExcelParams {
  examTitle: string;
  durationMinutes?: number | undefined;
  questions: Question[];
  results: ExamResult[];
  participants: Record<string, ParticipantExamStatus>;
  questionAnalysis?: QuestionErrorAnalysisItem[] | undefined;
}

/**
 * Sinh tệp bảng tính Excel (.xlsx) báo cáo chi tiết kỳ thi
 * gồm 4 sheets chuyên nghiệp:
 * 1. Tổng quan & Phổ điểm
 * 2. Bảng điểm học sinh
 * 3. Phân tích câu hỏi
 * 4. Ma trận làm bài
 */
export function generateExamExcelWorkbook(params: GenerateExamExcelParams): XLSX.WorkBook {
  const { examTitle, durationMinutes = 45, questions, results, participants } = params;
  const overview = calculateScoreDistribution(results);
  const questionAnalysis =
    params.questionAnalysis && params.questionAnalysis.length > 0
      ? params.questionAnalysis
      : calculateQuestionAnalysis(questions, participants);

  const workbook = XLSX.utils.book_new();

  // --- SHEET 1: Tổng quan & Phổ điểm ---
  const summaryRows: Array<Array<string | number>> = [
    ['BÁO CÁO KỲ THI'],
    ['Tên kỳ thi', examTitle],
    ['Thời lượng (phút)', durationMinutes],
    ['Tổng số câu hỏi', questions.length],
    ['Số thí sinh tham gia', results.length],
    ['Số bài đã nộp', overview.submittedCount],
    [],
    ['CHỈ SỐ THỐNG KÊ KẾT QUẢ'],
    ['Điểm trung bình', overview.averageScore],
    ['Điểm cao nhất', overview.highestScore],
    ['Điểm thấp nhất', overview.lowestScore],
    ['Điểm trung vị', overview.medianScore],
    ['Số học sinh đạt (≥ 5.0)', overview.passCount],
    ['Tỷ lệ đạt (%)', `${overview.passRate}%`],
    [],
    ['PHỔ ĐIỂM CHI TIẾT (BẢNG PHÂN BỐ ĐIỂM)'],
    ['STT', 'Khoảng điểm', 'Phân loại', 'Số lượng thí sinh', 'Tỷ lệ (%)', 'Danh sách thí sinh'],
  ];

  overview.buckets.forEach((b, idx) => {
    summaryRows.push([
      idx + 1,
      b.range,
      b.label,
      b.count,
      `${b.percentage}%`,
      b.studentNames.join(', '),
    ]);
  });

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(workbook, wsSummary, 'Tổng quan & Phổ điểm');

  // Helper format thời gian làm bài phút:giây (mm:ss)
  function formatExamDuration(
    startedAt: number | null | undefined,
    submittedAt: number | null | undefined
  ): string {
    if (!startedAt) return '-';
    if (!submittedAt) return 'Đang làm';
    const totalSecs = Math.max(0, Math.floor((submittedAt - startedAt) / 1000));
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  // --- SHEET 2: Bảng điểm học sinh ---
  const studentScoreHeaders = [
    'Hạng',
    'Mã thí sinh',
    'Họ và tên',
    'Điểm số',
    'Điểm tối đa',
    'Tỷ lệ (%)',
    'Số câu đúng',
    'Tổng số câu',
    'Thời gian bắt đầu làm bài',
    'Thời gian làm bài',
    'Thời gian nộp bài',
  ];

  const studentRows = results.map(r => {
    const p = participants[r.participantId];
    const startedAt = p?.startedAt;
    const submittedAt = r.submittedAt ?? p?.submittedAt;
    return [
      r.rank ?? '-',
      r.participantId,
      r.displayName,
      r.score,
      r.maxScore,
      `${r.percentage}%`,
      r.correctCount,
      r.totalQuestions,
      startedAt ? new Date(startedAt).toLocaleTimeString('vi-VN') : '-',
      formatExamDuration(startedAt, submittedAt),
      submittedAt ? new Date(submittedAt).toLocaleTimeString('vi-VN') : 'Chưa nộp',
    ];
  });

  const wsScoreboard = XLSX.utils.aoa_to_sheet([studentScoreHeaders, ...studentRows]);
  XLSX.utils.book_append_sheet(workbook, wsScoreboard, 'Bảng điểm học sinh');

  // --- SHEET 3: Tổng hợp (Chi tiết lựa chọn từng câu của học sinh) ---
  const summaryMatrixHeaders = [
    'Hạng',
    'Mã thí sinh',
    'Họ và tên',
    'Điểm',
    'Số câu đúng',
    'Tổng số câu',
    'Thời gian bắt đầu làm',
    'Thời gian làm bài',
    ...questions.map((_, idx) => `Câu ${idx + 1}`),
  ];

  const baseOptionLetters = ['A', 'B', 'C', 'D'];

  const summaryMatrixRows = results.map(r => {
    const p = participants[r.participantId];
    const startedAt = p?.startedAt;
    const submittedAt = r.submittedAt ?? p?.submittedAt;

    const row: Array<string | number> = [
      r.rank ?? '-',
      r.participantId,
      r.displayName,
      r.score,
      r.correctCount,
      r.totalQuestions,
      startedAt ? new Date(startedAt).toLocaleTimeString('vi-VN') : '-',
      formatExamDuration(startedAt, submittedAt),
    ];

    for (const q of questions) {
      if (!p) {
        row.push('-');
        continue;
      }
      const rawAns = p.answers[q.id];
      if (rawAns === undefined || rawAns === null || rawAns === '') {
        row.push('-');
      } else {
        const rev = (p.reviewData as Array<Record<string, unknown>> | undefined)?.find(
          r => r['questionId'] === q.id || r['id'] === q.id
        );
        const optionOrder = p.optionOrders ? p.optionOrders[q.id] : undefined;
        const mapped = unmapStudentAnswer(q, rawAns, optionOrder);

        let isCorrect = false;
        if (rev && typeof rev['isCorrect'] === 'boolean') {
          isCorrect = rev['isCorrect'];
        } else {
          const grade = gradeQuestion(q, mapped);
          isCorrect = grade.isCorrect;
        }

        if (q.type === 'mcq4') {
          const letter =
            rev && rev['studentChoiceLabel']
              ? String(rev['studentChoiceLabel'])
              : (() => {
                  const selectedIdx = mapped && mapped.type === 'mcq4' ? mapped.selected : null;
                  return typeof selectedIdx === 'number' && selectedIdx >= 0 && selectedIdx < 4
                    ? baseOptionLetters[selectedIdx]
                    : typeof rawAns === 'number' && rawAns >= 0 && rawAns < 4
                      ? baseOptionLetters[rawAns]
                      : '-';
                })();
          row.push(`${letter} (${isCorrect ? 'Đúng' : 'Sai'})`);
        } else if (q.type === 'tf') {
          const selectedBool = mapped && mapped.type === 'tf' ? mapped.selected : rawAns;
          const label = selectedBool === true ? 'Đúng' : selectedBool === false ? 'Sai' : '-';
          row.push(`${label} (${isCorrect ? 'Đúng' : 'Sai'})`);
        } else if (q.type === 'short') {
          const shortVal = mapped && mapped.type === 'short' ? mapped.text : String(rawAns || '-');
          row.push(`${shortVal} (${isCorrect ? 'Đúng' : 'Sai'})`);
        } else {
          row.push(isCorrect ? 'Đúng' : 'Sai');
        }
      }
    }
    return row;
  });

  const wsComprehensive = XLSX.utils.aoa_to_sheet([summaryMatrixHeaders, ...summaryMatrixRows]);
  XLSX.utils.book_append_sheet(workbook, wsComprehensive, 'Tổng hợp');

  // --- SHEET 4: Phân tích câu hỏi ---
  const questionHeaders = [
    'Câu số',
    'Mã câu hỏi',
    'Loại câu hỏi',
    'Nội dung câu hỏi',
    'Điểm câu',
    'Số lượt làm',
    'Số câu đúng',
    'Số câu sai',
    'Tỷ lệ sai (%)',
    'Số bạn bỏ trống',
  ];

  const questionRows = questionAnalysis.map(q => [
    q.order,
    q.questionId,
    q.type,
    q.stemText,
    q.points,
    q.totalAttempts,
    q.correctCount,
    q.incorrectCount,
    `${q.errorRate}%`,
    q.unansweredCount,
  ]);

  const wsQuestions = XLSX.utils.aoa_to_sheet([questionHeaders, ...questionRows]);
  XLSX.utils.book_append_sheet(workbook, wsQuestions, 'Phân tích câu hỏi');

  // --- SHEET 5: Ma trận làm bài ---
  const matrixHeaders = ['Họ và tên thí sinh', ...questions.map((_, idx) => `Câu ${idx + 1}`)];
  const matrixRows = results.map(r => {
    const p = participants[r.participantId];
    const row: Array<string | number> = [r.displayName];

    for (const q of questions) {
      if (!p) {
        row.push('-');
        continue;
      }
      const rawAns = p.answers[q.id];
      if (rawAns === undefined || rawAns === null || rawAns === '') {
        row.push('-');
      } else {
        const rev = (p.reviewData as Array<Record<string, unknown>> | undefined)?.find(
          r => r['questionId'] === q.id || r['id'] === q.id
        );
        let isCorrect = false;
        if (rev && typeof rev['isCorrect'] === 'boolean') {
          isCorrect = rev['isCorrect'];
        } else {
          const optionOrder = p.optionOrders ? p.optionOrders[q.id] : undefined;
          const mapped = unmapStudentAnswer(q, rawAns, optionOrder);
          const grade = gradeQuestion(q, mapped);
          isCorrect = grade.isCorrect;
        }
        row.push(isCorrect ? 'Đúng' : 'Sai');
      }
    }
    return row;
  });

  const wsMatrix = XLSX.utils.aoa_to_sheet([matrixHeaders, ...matrixRows]);
  XLSX.utils.book_append_sheet(workbook, wsMatrix, 'Ma trận làm bài');

  return workbook;
}

/**
 * Xuất dữ liệu báo cáo kỳ thi thành Uint8Array để lưu trữ hoặc tải về
 */
export function exportExamExcelBuffer(params: GenerateExamExcelParams): Uint8Array {
  const workbook = generateExamExcelWorkbook(params);
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Uint8Array;
}

/**
 * Chấm điểm và tính kết quả thi cho tất cả thí sinh dựa trên bộ câu hỏi gốc
 */
export function computeExamResults(
  originalQuestions: Question[],
  participants: Record<string, ParticipantExamStatus>
): ExamResult[] {
  const results: ExamResult[] = [];

  for (const participant of Object.values(participants)) {
    let totalScore = 0;
    let maxScore = 0;
    let correctCount = 0;

    for (const origQ of originalQuestions) {
      maxScore += origQ.points;
      const studentRawAnswer = participant.answers[origQ.id];
      const optionOrder = participant.optionOrders[origQ.id];

      const mappedAnswer = unmapStudentAnswer(origQ, studentRawAnswer, optionOrder);
      const grade = gradeQuestion(origQ, mappedAnswer);

      totalScore += grade.pointsEarned;
      if (grade.isCorrect) {
        correctCount++;
      }
    }

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    results.push({
      participantId: participant.participantId,
      displayName: participant.displayName,
      score: Math.round(totalScore * 100) / 100,
      maxScore: Math.round(maxScore * 100) / 100,
      percentage,
      correctCount,
      totalQuestions: originalQuestions.length,
      rank: null,
      submittedAt: participant.submittedAt ?? null,
    });
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.correctCount - a.correctCount;
  });

  results.forEach((item, index) => {
    item.rank = index + 1;
  });

  return results;
}
