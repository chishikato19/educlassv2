import { z } from 'zod';

export const QuestionSetDtoSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  title: z.string().min(1),
  subject: z.string().min(1),
  grade: z.number().int().min(1).max(12),
  tags: z.array(z.string()).default([]),
  schemaVersion: z.number().int().default(1),
  questionCount: z.number().int().min(0).default(0),
  updatedAt: z.number(),
});
export type QuestionSetDto = z.infer<typeof QuestionSetDtoSchema>;

export const CreateQuestionSetRequestSchema = z.object({
  title: z.string().min(1).max(255),
  subject: z.string().min(1).max(100),
  grade: z.coerce.number().int().min(1).max(12),
  tags: z.array(z.string()).default([]),
  questions: z.array(z.record(z.string(), z.unknown())).optional(),
});
export type CreateQuestionSetRequest = z.infer<typeof CreateQuestionSetRequestSchema>;

export const UpdateQuestionSetRequestSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  subject: z.string().min(1).max(100).optional(),
  grade: z.coerce.number().int().min(1).max(12).optional(),
  tags: z.array(z.string()).optional(),
  questions: z.array(z.record(z.string(), z.unknown())).optional(),
});
export type UpdateQuestionSetRequest = z.infer<typeof UpdateQuestionSetRequestSchema>;

export const EduclassAssetPackageSchema = z.object({
  sha256: z.string(),
  mime: z.string(),
  base64: z.string(),
});
export type EduclassAssetPackage = z.infer<typeof EduclassAssetPackageSchema>;

export const EduclassPackageSchema = z.object({
  format: z.literal('educlass'),
  version: z.number().int().default(1),
  exportedAt: z.number().int(),
  questionSet: z.object({
    title: z.string().min(1),
    subject: z.string().min(1),
    grade: z.number().int().min(1).max(12),
    tags: z.array(z.string()).default([]),
  }),
  questions: z.array(z.record(z.string(), z.unknown())),
  assets: z.array(EduclassAssetPackageSchema).default([]),
});
export type EduclassPackage = z.infer<typeof EduclassPackageSchema>;
