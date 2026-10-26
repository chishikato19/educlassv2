import { describe, expect, it } from 'vitest';
import {
  ClassDtoSchema,
  ClassListResponseSchema,
  CreateClassRequestSchema,
  UpdateClassRequestSchema,
} from '../class.js';

describe('Class Protocol Schemas', () => {
  it('validates ClassDto correctly', () => {
    const valid = {
      id: '01HR0000000000000000000010',
      ownerId: '01HR0000000000000000000001',
      name: '12A1',
      year: 2026,
      createdAt: 1710000000000,
    };
    const parsed = ClassDtoSchema.parse(valid);
    expect(parsed.name).toBe('12A1');
    expect(parsed.ownerId).toBe(valid.ownerId);

    expect(() =>
      ClassDtoSchema.parse({
        ...valid,
        name: '', // Empty name not allowed
      })
    ).toThrow();
  });

  it('validates CreateClassRequest with trimmed name and default year', () => {
    const parsed = CreateClassRequestSchema.parse({
      name: '  10A3  ',
    });
    expect(parsed.name).toBe('10A3');
    expect(parsed.year).toBe(new Date().getFullYear());

    expect(() => CreateClassRequestSchema.parse({ name: '' })).toThrow();
  });

  it('validates UpdateClassRequest with optional fields', () => {
    const parsed = UpdateClassRequestSchema.parse({
      name: '11B2 Mới',
      year: 2027,
    });
    expect(parsed.name).toBe('11B2 Mới');
    expect(parsed.year).toBe(2027);

    // Empty object is valid (no-op update)
    expect(UpdateClassRequestSchema.parse({})).toEqual({});
  });

  it('validates ClassListResponse', () => {
    const valid = {
      classes: [
        {
          id: '01HR0000000000000000000011',
          ownerId: '01HR0000000000000000000001',
          name: '9A1',
          year: 2026,
          createdAt: 1710000000000,
        },
      ],
    };
    expect(ClassListResponseSchema.parse(valid)).toEqual(valid);
  });
});
