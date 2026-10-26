import { z } from 'zod';

export const UploadAssetRequestSchema = z.object({
  base64: z.string().min(1, 'Dữ liệu ảnh base64 không được để trống'),
  mime: z.string().optional(),
  filename: z.string().optional(),
});

export type UploadAssetRequest = z.infer<typeof UploadAssetRequestSchema>;

export const AssetDtoSchema = z.object({
  id: z.string(),
  sha256: z.string().length(64, 'Mã băm SHA-256 phải gồm 64 ký tự hex'),
  mime: z.string(),
  size: z.number().int().nonnegative(),
  url: z.string(),
});

export type AssetDto = z.infer<typeof AssetDtoSchema>;
