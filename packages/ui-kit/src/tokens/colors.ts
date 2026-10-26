/**
 * Bảng màu Design Tokens chuẩn của EduClass v2 (theo PLAN.md mục 7.1)
 * Phong cách tươi sáng, thân thiện, tương phản >= 4.5:1
 */
export const UI_COLORS = {
  // Nền sáng thân thiện
  background: '#FFF9F0',
  surface: '#FFFFFF',

  // Màu thương hiệu chính
  primary: '#4F8CFF',
  primaryHover: '#3A77EC',

  // Màu phụ
  secondary: '#FFB020',
  secondaryHover: '#EAA015',

  // Trạng thái ngữ nghĩa
  success: '#2ECC8F',
  successHover: '#25B57C',
  error: '#FF6B6B',
  errorHover: '#E85555',
  warning: '#FFB020',
  warningHover: '#EAA015',
  info: '#4F8CFF',

  // Nhấn mở rộng
  purple: '#9B6BFF',
  pink: '#FF8AB3',

  // Chữ & Đường kẻ
  text: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
} as const;

/**
 * 4 màu đáp án trắc nghiệm Kahoot-style kèm biểu tượng hình khối
 * Bắt buộc đi kèm hình khối (▲◆●■) để hỗ trợ học sinh mù màu (PLAN 7.1)
 */
export const KAHOOT_SHAPES = {
  red: {
    color: '#FF6B6B',
    hover: '#E85555',
    symbol: '▲',
    label: 'Tam giác đỏ',
  },
  blue: {
    color: '#4F8CFF',
    hover: '#3A77EC',
    symbol: '◆',
    label: 'Thoi xanh dương',
  },
  yellow: {
    color: '#FFB020',
    hover: '#EAA015',
    symbol: '●',
    label: 'Tròn vàng',
  },
  green: {
    color: '#2ECC8F',
    hover: '#25B57C',
    symbol: '■',
    label: 'Vuông xanh lá',
  },
} as const;
