export const TERRITORY_COLORS = {
  blue: {
    base: '#2563eb',
    light: '#eff6ff',
    border: '#3b82f6',
    dark: '#1e40af',
    glow: 'rgba(37, 99, 235, 0.4)',
    text: '#ffffff',
  },
  red: {
    base: '#dc2626',
    light: '#fef2f2',
    border: '#ef4444',
    dark: '#991b1b',
    glow: 'rgba(220, 38, 38, 0.4)',
    text: '#ffffff',
  },
  neutral: {
    base: '#64748b',
    light: '#f8fafc',
    border: '#cbd5e1',
    dark: '#334155',
    text: '#475569',
  },
  gold: '#f59e0b',
  bronze: '#d97706',
};

export const TERRAIN_META: Record<
  string,
  { name: string; icon: string; points: number; maxHp: number; maxReinforce: number }
> = {
  big_castle: {
    name: 'Lâu Đài Lớn',
    icon: '🏰',
    points: 20,
    maxHp: 5,
    maxReinforce: 4,
  },
  small_castle: {
    name: 'Lâu Đài Nhỏ',
    icon: '🏯',
    points: 10,
    maxHp: 3,
    maxReinforce: 3,
  },
  watchtower: {
    name: 'Tháp Canh',
    icon: '🗼',
    points: 5,
    maxHp: 2,
    maxReinforce: 2,
  },
  plain: {
    name: 'Đất Thường',
    icon: '🟩',
    points: 1,
    maxHp: 1,
    maxReinforce: 1,
  },
  mountain: {
    name: 'Dãy Núi',
    icon: '⛰️',
    points: 0,
    maxHp: 999,
    maxReinforce: 0,
  },
  river: {
    name: 'Dòng Sông',
    icon: '🌊',
    points: 0,
    maxHp: 999,
    maxReinforce: 0,
  },
};
