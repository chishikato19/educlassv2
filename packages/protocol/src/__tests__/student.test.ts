import { describe, expect, it } from 'vitest';
import {
  CommitStudentImportRequestSchema,
  CreateStudentRequestSchema,
  PreviewPasteRequestSchema,
  SetStudentPinRequestSchema,
  StudentDtoSchema,
  StudentImportPreviewResponseSchema,
  UpdateStudentRequestSchema,
} from '../student.js';

describe('Student Protocol Schemas', () => {
  it('validates StudentDto properly', () => {
    const valid = {
      id: '01HR0000000000000000000020',
      classId: '01HR0000000000000000000010',
      fullName: 'Nguyễn Văn An',
      code: 'HS001',
      hasPin: true,
      exp: 150,
      level: 2,
      createdAt: 1710000000000,
    };
    const parsed = StudentDtoSchema.parse(valid);
    expect(parsed.fullName).toBe('Nguyễn Văn An');
    expect(parsed.hasPin).toBe(true);

    expect(() =>
      StudentDtoSchema.parse({
        ...valid,
        fullName: '', // Không cho phép tên rỗng
      })
    ).toThrow();
  });

  it('validates CreateStudentRequest with trimmed inputs', () => {
    const parsed = CreateStudentRequestSchema.parse({
      fullName: '  Trần Thị Bích  ',
      code: '  HS002  ',
      pin: '1234',
    });
    expect(parsed.fullName).toBe('Trần Thị Bích');
    expect(parsed.code).toBe('HS002');
    expect(parsed.pin).toBe('1234');

    expect(() => CreateStudentRequestSchema.parse({ fullName: '' })).toThrow();
    // PIN ngắn hơn 4 ký tự
    expect(() => CreateStudentRequestSchema.parse({ fullName: 'An', pin: '12' })).toThrow();
  });

  it('validates UpdateStudentRequest and SetStudentPinRequest', () => {
    expect(UpdateStudentRequestSchema.parse({ fullName: 'Lê Văn C' })).toEqual({
      fullName: 'Lê Văn C',
    });
    // Set PIN
    expect(SetStudentPinRequestSchema.parse({ pin: '5678' })).toEqual({ pin: '5678' });
    // Reset/Xóa PIN
    expect(SetStudentPinRequestSchema.parse({ pin: null })).toEqual({ pin: null });
  });

  it('validates PreviewPasteRequest and CommitStudentImportRequest', () => {
    expect(PreviewPasteRequestSchema.parse({ text: 'Nguyễn An\tHS001\nTrần Bình\tHS002' })).toEqual(
      {
        text: 'Nguyễn An\tHS001\nTrần Bình\tHS002',
      }
    );

    const commitPayload = {
      students: [
        { fullName: 'Nguyễn An', code: 'HS001' },
        { fullName: 'Trần Bình', code: 'HS002' },
      ],
      skipDuplicates: true,
    };
    expect(CommitStudentImportRequestSchema.parse(commitPayload)).toEqual(commitPayload);
  });

  it('validates StudentImportPreviewResponse schema', () => {
    const previewData = {
      total: 2,
      validCount: 1,
      warningCount: 1,
      errorCount: 0,
      items: [
        {
          rowIndex: 1,
          fullName: 'Nguyễn An',
          code: 'HS001',
          status: 'valid' as const,
          errors: [],
          warnings: [],
        },
        {
          rowIndex: 2,
          fullName: 'Trần Bình',
          code: 'HS001',
          status: 'warning' as const,
          errors: [],
          warnings: ['Trùng mã học sinh'],
        },
      ],
    };
    expect(StudentImportPreviewResponseSchema.parse(previewData)).toEqual(previewData);
  });
});
