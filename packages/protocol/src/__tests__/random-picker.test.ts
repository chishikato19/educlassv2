import { describe, expect, it } from 'vitest';
import {
  pickStudentFromCandidates,
  type PickerStudent,
  RandomPickerSettingsSchema,
} from '../random-picker.js';

describe('Random Picker Protocol & Logic', () => {
  const mockStudents: PickerStudent[] = [
    { id: '1', name: 'Nguyễn Văn An', academicPerformance: 'tot', alreadyCalled: false },
    { id: '2', name: 'Trần Thị Bình', academicPerformance: 'kha', alreadyCalled: false },
    { id: '3', name: 'Lê Hoàng Cường', academicPerformance: 'dat', alreadyCalled: false },
    { id: '4', name: 'Phạm Minh Đức', academicPerformance: 'chua_dat', alreadyCalled: false },
    { id: '5', name: 'Vũ Ngọc Hân', academicPerformance: 'tot', alreadyCalled: true },
  ];

  it('chọn ngẫu nhiên một học sinh hợp lệ ở chế độ normal', () => {
    const picked = pickStudentFromCandidates(mockStudents, 'normal', true);
    expect(picked).not.toBeNull();
    // Vì '5' alreadyCalled = true, picked phải là 1, 2, 3 hoặc 4
    expect(['1', '2', '3', '4']).toContain(picked?.id);
  });

  it('chọn chính xác học sinh học lực tốt ở chế độ bias_good (tính năng ẩn)', () => {
    // Chỉ có '1' là học lực 'tot' chưa gọi
    const picked = pickStudentFromCandidates(mockStudents, 'bias_good', true);
    expect(picked).not.toBeNull();
    expect(picked?.id).toBe('1');
    expect(picked?.academicPerformance).toBe('tot');
  });

  it('fallback sang khá hoặc danh sách còn lại nếu không còn học sinh giỏi chưa gọi', () => {
    const noGoodPool: PickerStudent[] = [
      { id: '2', name: 'Trần Thị Bình', academicPerformance: 'kha', alreadyCalled: false },
      { id: '3', name: 'Lê Hoàng Cường', academicPerformance: 'dat', alreadyCalled: false },
    ];
    const picked = pickStudentFromCandidates(noGoodPool, 'bias_good', true);
    expect(picked).not.toBeNull();
    expect(picked?.id).toBe('2'); // Ưu tiên 'kha'
  });

  it('trả về null nếu danh sách rỗng', () => {
    expect(pickStudentFromCandidates([], 'normal')).toBeNull();
  });

  it('validate cấu hình RandomPickerSettings mặc định chính xác', () => {
    const parsed = RandomPickerSettingsSchema.parse({});
    expect(parsed.mode).toBe('random_mode');
    expect(parsed.correctExp).toBe(10);
    expect(parsed.excludeCalled).toBe(true);
  });

  it('hỗ trợ chế độ random_mode và elimination_grid trong settings schema', () => {
    expect(RandomPickerSettingsSchema.parse({ mode: 'random_mode' }).mode).toBe('random_mode');
    expect(RandomPickerSettingsSchema.parse({ mode: 'elimination_grid' }).mode).toBe(
      'elimination_grid'
    );
  });
});
