import React from 'react';

/**
 * Bảng màu và tokens phong cách Cờ Vua Cổ Điển (Classic Chess Theme)
 */
export const CHESS_COLORS = {
  // Gỗ mun & Gỗ sồi trầm hoàng gia
  boardDark: '#22150c',
  boardMid: '#341f12',
  boardLight: '#4d2e1b',
  squareDark: '#8a5a36',
  squareLight: '#dfc09f',

  // Viền vàng kim cổ điển & Giấy da ngà
  gold: '#d4af37',
  goldHover: '#f3ca52',
  goldDark: '#997a15',
  parchment: '#f8f4e9',
  parchmentDark: '#ebdcb9',

  // Quân cờ Trắng và Đen
  whitePiece: '#f5f0eb',
  blackPiece: '#1a1816',

  // Trạng thái
  win: '#2e7d32',
  draw: '#d97706',
  loss: '#c62828',
};

export const CHESS_PIECES = {
  whiteKing: '♔',
  whiteQueen: '♕',
  whiteRook: '♖',
  whiteBishop: '♗',
  whiteKnight: '♘',
  whitePawn: '♙',

  blackKing: '♚',
  blackQueen: '♛',
  blackRook: '♜',
  blackBishop: '♝',
  blackKnight: '♞',
  blackPawn: '♟',
};

/**
 * Hiển thị huy hiệu cờ vua theo chuỗi thắng / thành tích
 */
export function getChessTitleBadge(tournamentPoints: number, streak: number): { title: string; icon: string } {
  if (tournamentPoints >= 10 || streak >= 4) {
    return { title: 'Đại Kiện Tướng', icon: '♔' };
  }
  if (tournamentPoints >= 6 || streak >= 2) {
    return { title: 'Kiện Tướng', icon: '♕' };
  }
  if (tournamentPoints >= 3) {
    return { title: 'Kỳ Thủ', icon: '♘' };
  }
  return { title: 'Tân Thủ', icon: '♙' };
}

/**
 * Render công thức toán học LaTeX an toàn
 */
export function renderLatexInText(text: string): string {
  if (!text) return '';
  return text.replace(/\$([^$]+)\$/g, '<code class="font-serif px-1.5 py-0.5 rounded bg-black/20 text-amber-200">$1</code>');
}

/**
 * Khung chứa giả lập vân gỗ cổ điển
 */
export const ChessWoodCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  variant?: 'dark' | 'light' | 'parchment';
  style?: React.CSSProperties;
}> = ({ children, className = '', variant = 'dark', style }) => {
  if (variant === 'parchment') {
    return (
      <div
        className={`rounded-2xl border-2 border-[#c5a880] bg-[#fbf6ec] shadow-xl text-[#2d1b0d] ${className}`}
        style={{
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), inset 0 0 15px rgba(181, 136, 99, 0.2)',
          ...style,
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border-2 border-[#805333] shadow-2xl ${
        variant === 'dark' ? 'bg-[#1e130b] text-[#f4ecd8]' : 'bg-[#2f1c0f] text-[#f4ecd8]'
      } ${className}`}
      style={{
        boxShadow: '0 15px 35px -5px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(212, 175, 55, 0.3)',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export type BoardScale = 'xl' | 'lg' | 'md' | 'sm' | 'xs' | '2xs';

export interface BoardGridLayout {
  cols: number;
  rows: number;
  gap: number;
  scale: BoardScale;
  minRowHeight: number;
}

export interface ScaleStyles {
  cardPadding: string;
  headerText: string;
  badgePadding: string;
  badgeText: string;
  pieceText: string;
  nameText: string;
  scoreText: string;
  footerText: string;
  showFooter: boolean;
  rowGap: string;
}

export const CHESS_SCALE_MAP: Record<BoardScale, ScaleStyles> = {
  xl: {
    cardPadding: 'p-3 md:p-4',
    headerText: 'text-sm md:text-base font-black',
    badgePadding: 'px-2.5 py-1',
    badgeText: 'text-xs font-bold',
    pieceText: 'text-lg md:text-xl',
    nameText: 'text-sm md:text-base font-bold',
    scoreText: 'text-base md:text-lg font-black',
    footerText: 'text-xs md:text-sm font-bold',
    showFooter: true,
    rowGap: 'gap-2',
  },
  lg: {
    cardPadding: 'p-2 md:p-3',
    headerText: 'text-xs md:text-sm font-bold',
    badgePadding: 'px-2 py-0.5',
    badgeText: 'text-[11px] font-bold',
    pieceText: 'text-base',
    nameText: 'text-xs md:text-sm font-semibold',
    scoreText: 'text-sm font-bold',
    footerText: 'text-xs font-bold',
    showFooter: true,
    rowGap: 'gap-1.5',
  },
  md: {
    cardPadding: 'p-1.5 md:p-2',
    headerText: 'text-xs font-bold',
    badgePadding: 'px-1.5 py-0.5',
    badgeText: 'text-[10px] font-bold',
    pieceText: 'text-sm',
    nameText: 'text-xs font-medium',
    scoreText: 'text-xs font-bold',
    footerText: 'text-[10px] font-bold',
    showFooter: true,
    rowGap: 'gap-1',
  },
  sm: {
    cardPadding: 'p-1.5',
    headerText: 'text-[11px] font-bold',
    badgePadding: 'px-1.5 py-0.5',
    badgeText: 'text-[9px] font-bold',
    pieceText: 'text-xs',
    nameText: 'text-[11px] font-medium',
    scoreText: 'text-[11px] font-bold',
    footerText: 'text-[9px] font-bold',
    showFooter: true,
    rowGap: 'gap-0.5',
  },
  xs: {
    cardPadding: 'p-1',
    headerText: 'text-[10px] font-bold',
    badgePadding: 'px-1 py-0.2',
    badgeText: 'text-[8px] font-bold',
    pieceText: 'text-[11px]',
    nameText: 'text-[10px] font-medium',
    scoreText: 'text-[10px] font-bold',
    footerText: 'text-[8px] font-bold',
    showFooter: false,
    rowGap: 'gap-0.5',
  },
  '2xs': {
    cardPadding: 'p-0.5 px-1',
    headerText: 'text-[9px] font-bold',
    badgePadding: 'px-1 py-0',
    badgeText: 'text-[7px] font-bold',
    pieceText: 'text-[10px]',
    nameText: 'text-[9px] font-medium',
    scoreText: 'text-[9px] font-bold',
    footerText: 'text-[7px] font-bold',
    showFooter: false,
    rowGap: 'gap-0.5',
  },
};

/**
 * Tính toán số cột và số hàng tối ưu cho lưới bàn cờ để:
 * 1. Toàn bộ các bàn cờ vừa vặn trong khung màn hình (không bị tràn).
 * 2. Tỉ lệ khung hình mỗi bàn cân đối (khoảng 1.2 - 2.2).
 * 3. Tự động chuyển font, padding, độ dày viền phù hợp theo kích thước bàn.
 */
export function calculateOptimalBoardGrid(
  count: number,
  containerWidth: number,
  containerHeight: number
): BoardGridLayout {
  if (count <= 0) {
    return { cols: 1, rows: 1, gap: 8, scale: 'md', minRowHeight: 80 };
  }

  // Nếu chưa đo được kích thước khung (SSR / trước khi mount), dùng cấu hình chuẩn theo số lượng bàn
  if (containerWidth <= 0 || containerHeight <= 0) {
    if (count <= 1) return { cols: 1, rows: 1, gap: 12, scale: 'xl', minRowHeight: 120 };
    if (count <= 2) return { cols: 2, rows: 1, gap: 12, scale: 'xl', minRowHeight: 110 };
    if (count <= 4) return { cols: 2, rows: 2, gap: 10, scale: 'lg', minRowHeight: 90 };
    if (count <= 6) return { cols: 3, rows: 2, gap: 8, scale: 'md', minRowHeight: 80 };
    if (count <= 8) return { cols: 4, rows: 2, gap: 8, scale: 'md', minRowHeight: 75 };
    if (count <= 12) return { cols: 4, rows: 3, gap: 6, scale: 'sm', minRowHeight: 68 };
    if (count <= 16) return { cols: 4, rows: 4, gap: 6, scale: 'xs', minRowHeight: 60 };
    if (count <= 20) return { cols: 5, rows: 4, gap: 5, scale: 'xs', minRowHeight: 56 };
    if (count <= 25) return { cols: 5, rows: 5, gap: 4, scale: '2xs', minRowHeight: 50 };
    if (count <= 30) return { cols: 6, rows: 5, gap: 4, scale: '2xs', minRowHeight: 46 };
    const cols = Math.min(8, Math.ceil(Math.sqrt(count * 1.5)));
    const rows = Math.ceil(count / cols);
    return { cols, rows, gap: 4, scale: '2xs', minRowHeight: 44 };
  }

  // Tìm số cột c tối ưu sao cho các bàn cờ vừa khít trong containerWidth x containerHeight
  const maxCols = Math.max(1, Math.min(count, Math.floor(containerWidth / 110), 10));
  let bestCols = 1;
  let bestRows = count;
  let bestScore = Number.POSITIVE_INFINITY;
  let bestScale: BoardScale = 'md';
  let bestMinRowHeight = 60;
  let bestGap = 8;

  for (let c = 1; c <= maxCols; c++) {
    const r = Math.ceil(count / c);
    const gap = c >= 6 ? 4 : c >= 4 ? 6 : 8;
    const cardW = (containerWidth - (c - 1) * gap) / c;
    const cardH = (containerHeight - (r - 1) * gap) / r;

    // Quá hẹp thì bỏ qua nếu không phải lựa chọn duy nhất
    if (cardW < 95 && c > 1) continue;

    const fitsInHeight = cardH >= 46;
    const aspect = cardW / Math.max(1, cardH);

    // Tính điểm ưu tiên: vừa chiều cao + tỉ lệ khung hình gần 1.7
    let score = 0;
    if (fitsInHeight) {
      score = Math.abs(aspect - 1.7) * 10;
      if (cardH < 65) score += (65 - cardH) * 0.5;
      score -= (cardW * cardH) / 25000;
    } else {
      score = 5000 + (r * 48 - containerHeight);
    }

    if (score < bestScore) {
      bestScore = score;
      bestCols = c;
      bestRows = r;
      bestGap = gap;

      if (cardH >= 160 && cardW >= 240) bestScale = 'xl';
      else if (cardH >= 120 && cardW >= 190) bestScale = 'lg';
      else if (cardH >= 95 && cardW >= 150) bestScale = 'md';
      else if (cardH >= 75 && cardW >= 125) bestScale = 'sm';
      else if (cardH >= 58) bestScale = 'xs';
      else bestScale = '2xs';

      bestMinRowHeight = Math.max(44, Math.min(cardH, 80));
    }
  }

  return {
    cols: bestCols,
    rows: bestRows,
    gap: bestGap,
    scale: bestScale,
    minRowHeight: bestMinRowHeight,
  };
}
