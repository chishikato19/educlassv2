import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { ExcelService } from '../services/excel-service.js';

describe('ExcelService (.xlsx processing)', () => {
  const excelService = new ExcelService();

  it('generates a valid .xlsx template and parses it back accurately', () => {
    const templateBuffer = excelService.generateTemplateBuffer();
    expect(templateBuffer).toBeInstanceOf(Buffer);
    expect(templateBuffer.length).toBeGreaterThan(0);

    const parsedRows = excelService.parseXlsxBuffer(templateBuffer);
    expect(parsedRows).toHaveLength(3);

    expect(parsedRows[0]).toEqual({
      fullName: 'Nguyễn Văn An',
      code: 'HS001',
      pin: '1234',
    });
    expect(parsedRows[1]).toEqual({
      fullName: 'Trần Thị Bích',
      code: 'HS002',
      pin: '5678',
    });
    expect(parsedRows[2]?.fullName).toBe('Lê Văn Cường');
    expect(parsedRows[2]?.code).toBe('HS003');
  });

  it('handles empty or corrupt buffer gracefully', () => {
    const emptyRows = excelService.parseXlsxBuffer(Buffer.from([]));
    expect(emptyRows).toEqual([]);
  });

  it('exports session report buffer with 3 sheets correctly', () => {
    const mockSnapshot = {
      sessionId: 'sess-123',
      sessionCode: 'ABC999',
      className: 'Lớp 10A1',
      identityMode: 'roster_or_guest' as const,
      allowTeams: true,
      openedAt: 1700000000000,
      closedAt: 1700003600000,
      totalParticipants: 2,
      onlineParticipants: 0,
      offlineParticipants: 2,
      participants: [],
      teams: [],
      scoreboard: [
        {
          participantId: 'p-1',
          displayName: 'Nguyễn Văn A',
          identityLevel: 'roster' as const,
          teamName: 'Đội Đỏ',
          score: 1800,
          correctCount: 9,
          totalQuestions: 10,
          accuracy: 90,
          expEarned: 120,
          rank: 1,
        },
        {
          participantId: 'p-2',
          displayName: 'Trần Thị B',
          identityLevel: 'roster' as const,
          teamName: 'Đội Xanh',
          score: 1200,
          correctCount: 6,
          totalQuestions: 10,
          accuracy: 60,
          expEarned: 80,
          rank: 2,
        },
      ],
      difficultQuestions: [
        {
          questionId: 'q-5',
          activityId: 'quiz-live',
          activityName: 'Quiz Địa Lý',
          stem: 'Thủ đô của nước Úc là gì?',
          totalAttempts: 2,
          correctCount: 0,
          incorrectCount: 2,
          errorRate: 100,
        },
      ],
      summary: {
        totalQuestions: 10,
        averageScore: 1500,
        averageAccuracy: 75,
        totalExpAwarded: 200,
      },
    };

    const buf = excelService.exportSessionReportBuffer(mockSnapshot);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(0);

    const wb = XLSX.read(buf, { type: 'buffer' });
    expect(wb.SheetNames).toEqual([
      'Tổng quan phiên',
      'Bảng điểm học sinh',
      'Câu hỏi sai nhiều',
    ]);

    // Kiểm tra sheet Bảng điểm học sinh
    const scoreboardSheet = wb.Sheets['Bảng điểm học sinh']!;
    const scoreboardData = XLSX.utils.sheet_to_json<Record<string, unknown>>(scoreboardSheet);
    expect(scoreboardData).toHaveLength(2);
    expect(scoreboardData[0]?.['Họ và tên']).toBe('Nguyễn Văn A');
    expect(scoreboardData[0]?.['Tổng điểm']).toBe(1800);
    expect(scoreboardData[0]?.['Hạng']).toBe(1);

    // Kiểm tra sheet Câu hỏi sai nhiều
    const difficultSheet = wb.Sheets['Câu hỏi sai nhiều']!;
    const difficultData = XLSX.utils.sheet_to_json<Record<string, unknown>>(difficultSheet);
    expect(difficultData).toHaveLength(1);
    expect(difficultData[0]?.['Nội dung câu hỏi']).toBe('Thủ đô của nước Úc là gì?');
    expect(difficultData[0]?.['Số lượt trả lời sai']).toBe(2);
    expect(difficultData[0]?.['Tỉ lệ sai (%)']).toBe('100%');
  });

  it('exports multi-dimensional project grading results buffer accurately', () => {
    const mockConfig = {
      title: 'Báo cáo Dự án STEM',
      maxScore: 10,
      stepScore: 0.1,
      weights: {
        self: 10,
        teamMember: 20,
        crossTeam: 20,
        teacher: 50,
      },
      groups: [],
      allowFeedbackComment: true,
    };

    const mockResults = [
      {
        participantId: 'p-1',
        studentId: 'st-1',
        displayName: 'Nguyễn Văn An',
        groupId: 'g-1',
        groupName: 'Nhóm 1',
        isLeader: true,
        selfScore: 9.5,
        teamMemberScore: 9.0,
        crossTeamScore: 8.5,
        teacherScore: 9.0,
        finalScore: 8.95,
        rank: 1,
        feedbackComments: ['Làm việc nhóm rất tốt', 'Thuyết trình mạch lạc'],
      },
      {
        participantId: 'p-2',
        studentId: 'st-2',
        displayName: 'Trần Thị Bích',
        groupId: 'g-1',
        groupName: 'Nhóm 1',
        isLeader: false,
        selfScore: 8.0,
        teamMemberScore: 8.5,
        crossTeamScore: 8.5,
        teacherScore: 8.5,
        finalScore: 8.45,
        rank: 2,
        feedbackComments: ['Cần tích cực hơn'],
      },
    ];

    const buf = excelService.exportProjectGradingBuffer(mockResults, mockConfig, 'Lớp 10A1');
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(0);

    const wb = XLSX.read(buf, { type: 'buffer' });
    expect(wb.SheetNames).toContain('BangDiemDuAn');

    const sheet = wb.Sheets['BangDiemDuAn']!;
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
    // Dòng 1: Tiêu đề
    expect(rows[0]?.[0]).toBe('BÁO CÁO KẾT QUẢ ĐÁNH GIÁ DỰ ÁN ĐA CHIỀU');
    // Dòng 2: Phụ đề & cấu hình trọng số
    expect(rows[1]?.[0]).toContain('Báo cáo Dự án STEM');
    expect(rows[1]?.[1]).toContain('Lớp học: Lớp 10A1');
    // Dòng 4: Tiêu đề bảng
    expect(rows[3]).toContain('ĐIỂM TỔNG KẾT');
  });
});

