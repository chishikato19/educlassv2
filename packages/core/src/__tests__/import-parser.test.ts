import { describe, expect, it } from 'vitest';
import {
  normalizeVietnameseString,
  parseClipboardText,
  validateAndPreviewStudents,
} from '../students/import-parser.js';

describe('Students Import Parser & Preview (packages/core)', () => {
  it('normalizes Vietnamese strings and whitespace', () => {
    expect(normalizeVietnameseString('   Nguyễn   Văn   An   ')).toBe('Nguyễn Văn An');
  });

  describe('parseClipboardText', () => {
    it('parses tab-separated text with header row', () => {
      const raw = `STT\tHọ và tên\tMã HS\tMã PIN
1\tNguyễn Văn An\tHS001\t1234
2\tTrần Thị Bích\tHS002\t5678`;

      const rows = parseClipboardText(raw);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual({
        fullName: 'Nguyễn Văn An',
        code: 'HS001',
        pin: '1234',
      });
      expect(rows[1]).toEqual({
        fullName: 'Trần Thị Bích',
        code: 'HS002',
        pin: '5678',
      });
    });

    it('merges Họ đệm and Tên when separate columns exist', () => {
      const raw = `STT\tHọ đệm\tTên\tMã học sinh
1\tLê Thị\tCẩm Tú\tHS003
2\tPhạm Văn\tĐạt\tHS004`;

      const rows = parseClipboardText(raw);
      expect(rows).toHaveLength(2);
      expect(rows[0]?.fullName).toBe('Lê Thị Cẩm Tú');
      expect(rows[0]?.code).toBe('HS003');
      expect(rows[1]?.fullName).toBe('Phạm Văn Đạt');
      expect(rows[1]?.code).toBe('HS004');
    });

    it('parses text without headers using heuristics', () => {
      const raw = `1\tHoàng Minh Khang\tHS005
2\tĐỗ Mỹ Linh\tHS006`;

      const rows = parseClipboardText(raw);
      expect(rows).toHaveLength(2);
      expect(rows[0]?.fullName).toBe('Hoàng Minh Khang');
      expect(rows[0]?.code).toBe('HS005');
      expect(rows[1]?.fullName).toBe('Đỗ Mỹ Linh');
      expect(rows[1]?.code).toBe('HS006');
    });

    it('handles empty text gracefully', () => {
      expect(parseClipboardText('')).toEqual([]);
      expect(parseClipboardText('   \n\n  ')).toEqual([]);
    });
  });

  describe('validateAndPreviewStudents', () => {
    it('flags missing names as errors and duplicates as warnings', () => {
      const rows = [
        { fullName: 'Nguyễn Văn An', code: 'HS001' },
        { fullName: '', code: 'HS002' }, // Thiếu tên -> error
        { fullName: 'Trần Thị Bích', code: 'HS003' },
        { fullName: 'Trần Thị Bích', code: 'HS004' }, // Trùng tên trong file -> warning
        { fullName: 'Lê Văn Cường', code: 'HS099' }, // Đã có sẵn trong lớp -> warning
      ];

      const existingStudents = [
        { fullName: 'Lê Văn Cường', code: 'HS099' },
      ];

      const preview = validateAndPreviewStudents(rows, existingStudents);

      expect(preview.total).toBe(5);
      expect(preview.errorCount).toBe(1);
      expect(preview.warningCount).toBe(3);
      expect(preview.validCount).toBe(1);

      // Dòng 1: Hợp lệ
      expect(preview.items[0]?.status).toBe('valid');

      // Dòng 2: Lỗi thiếu tên
      expect(preview.items[1]?.status).toBe('error');
      expect(preview.items[1]?.errors).toContain('Thiếu họ và tên học sinh.');

      // Dòng 3 & 4: Cảnh báo trùng tên trong file
      expect(preview.items[2]?.status).toBe('warning');
      expect(preview.items[3]?.status).toBe('warning');

      // Dòng 5: Cảnh báo đã có sẵn trong lớp
      expect(preview.items[4]?.status).toBe('warning');
      expect(preview.items[4]?.warnings).toContain('Học sinh cùng tên đã có trong danh sách lớp.');
      expect(preview.items[4]?.warnings).toContain('Mã học sinh đã tồn tại trong danh sách lớp.');
    });
  });
});
