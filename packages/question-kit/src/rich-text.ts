import { z } from 'zod';

/**
 * Định dạng RichText chuẩn cho nội dung câu hỏi và các phương án
 * Hỗ trợ công thức toán học LaTeX trong $...$ hoặc $$...$$ và danh sách ảnh đính kèm
 */
export const RichTextSchema = z.object({
  /** Nội dung văn bản (có thể chứa LaTeX: $x^2 + y^2 = r^2$) */
  text: z.string(),
  /** Danh sách mã hash / assetId của ảnh minh họa đính kèm */
  images: z.array(z.string().min(1)).optional().default([]),
});

export type RichText = z.infer<typeof RichTextSchema>;

/**
 * Chuyển đổi linh hoạt từ chuỗi thường hoặc RichText thành RichText chuẩn
 */
export function toRichText(input: string | RichText | null | undefined): RichText {
  if (!input) {
    return { text: '', images: [] };
  }
  if (typeof input === 'string') {
    return { text: input, images: [] };
  }
  return {
    text: input.text ?? '',
    images: Array.isArray(input.images) ? [...input.images] : [],
  };
}

/**
 * Trích xuất chuỗi thô từ RichText
 */
export function richTextToString(input: RichText | string | null | undefined): string {
  if (!input) return '';
  if (typeof input === 'string') return input;
  return input.text ?? '';
}

/**
 * Kiểm tra xem nội dung văn bản có chứa công thức LaTeX hay không
 * Nhận diện cú pháp: $...$, $$...$$, \(...\), \[...\]
 */
export function hasLatexFormula(input: RichText | string | null | undefined): boolean {
  const text = richTextToString(input);
  if (!text) return false;
  // Cú pháp inline $...$ hoặc block $$...$$, hoặc \(...\), \[...\]
  const latexRegex = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\(.+?\\\)|\\\[[\s\S]+?\\\])/;
  return latexRegex.test(text);
}

/**
 * Chuẩn hóa URL hình ảnh đính kèm:
 * - Nếu là chuỗi hash SHA-256 (hoặc asset ID thuần túy), tự động gắn tiền tố `/api/assets/${src}`
 * - Nếu đã là Data URL, URL tuyệt đối (http/https), blob hoặc đường dẫn tương đối bắt đầu bằng `/`, giữ nguyên
 */
export function resolveAssetUrl(src: string | null | undefined): string {
  if (!src) return '';
  const trimmed = src.trim();
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }
  return `/api/assets/${trimmed}`;
}
