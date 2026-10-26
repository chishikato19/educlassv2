/**
 * EduClass v2 — Student Mascot & Avatar Customizer Module
 * Hệ thống nhân vật hoạt hình SVG thuần túy (Layered SVG Component)
 * Hoạt động 100% Offline LAN, responsive trên cả Điện thoại (Mobile) và Máy tính (Desktop).
 * Mở khóa 100% trang phục cho toàn bộ học sinh.
 */

import { state } from './state.js';

export const DEFAULT_AVATAR = {
  base: 'cat',
  color: '#4F8CFF',
  headwear: 'straw', // Nón lá đáng yêu
  glasses: 'none',
  outfit: 'school_uniform',
  wings: 'none',
  held: 'pencil',
};

// Danh mục toàn bộ các món đồ trang phục (100% ĐÃ MỞ KHÓA)
export const AVATAR_CATALOG = {
  base: {
    title: '🐾 Mascot',
    items: [
      { id: 'cat', name: 'Mèo Vàng', icon: '🐱' },
      { id: 'fox', name: 'Cáo Thông Thái', icon: '🦊' },
      { id: 'bear', name: 'Gấu Nâu', icon: '🐻' },
      { id: 'owl', name: 'Cú Mèo', icon: '🦉' },
      { id: 'rabbit', name: 'Thỏ Ngọc', icon: '🐰' },
      { id: 'penguin', name: 'Cánh Cụt', icon: '🐧' },
      { id: 'robot', name: 'Robot AI', icon: '🤖' },
      { id: 'dragon', name: 'Rồng Con', icon: '🐲' },
    ],
  },
  headwear: {
    title: '👒 Mũ Nón',
    items: [
      { id: 'none', name: 'Không đội', icon: '🚫' },
      { id: 'straw', name: 'Nón Lá VN', icon: '👒' },
      { id: 'cap', name: 'Lưỡi Trai', icon: '🧢' },
      { id: 'headphones', name: 'Tai Nghe DJ', icon: '🎧' },
      { id: 'grad_cap', name: 'Mũ Cử Nhân', icon: '🎓' },
      { id: 'crown', name: 'Vương Miện', icon: '👑' },
      { id: 'headband', name: 'Băng Quyết Tâm', icon: '🥊' },
    ],
  },
  outfit: {
    title: '👕 Trang Phục',
    items: [
      { id: 'default', name: 'Cơ bản', icon: '⚪' },
      { id: 'school_uniform', name: 'Đồng Phục', icon: '👔' },
      { id: 'hoodie', name: 'Áo Hoodie', icon: '🧥' },
      { id: 'jersey', name: 'Áo Số 10', icon: '🎽' },
      { id: 'wizard_robe', name: 'Pháp Sư', icon: '🧙' },
    ],
  },
  wings: {
    title: '🕊️ Đôi Cánh',
    items: [
      { id: 'none', name: 'Không cánh', icon: '🚫' },
      { id: 'angel', name: 'Thiên Thần', icon: '🕊️' },
      { id: 'bat', name: 'Tiểu Quỷ', icon: '🦇' },
    ],
  },
  held: {
    title: '✨ Cầm Tay',
    items: [
      { id: 'none', name: 'Tay không', icon: '🚫' },
      { id: 'pencil', name: 'Bút Chì Khổng Lồ', icon: '✏️' },
      { id: 'wand', name: 'Đũa Phép Thuật', icon: '⭐' },
    ],
  },
  glasses: {
    title: '👓 Kính Mắt',
    items: [
      { id: 'none', name: 'Không đeo', icon: '🚫' },
      { id: 'glasses', name: 'Kính Cận Tròn', icon: '👓' },
      { id: 'sunglasses', name: 'Kính Râm Ngầu', icon: '🕶️' },
      { id: 'blush_star', name: 'Má Ngôi Sao', icon: '⭐' },
    ],
  },
  color: {
    title: '🎨 Màu Nền',
    items: [
      { id: '#4F8CFF', name: 'Xanh Dương', icon: '🔵' },
      { id: '#FFB020', name: 'Vàng Nắng', icon: '🟡' },
      { id: '#2ECC8F', name: 'Xanh Lá', icon: '🟢' },
      { id: '#FF6B6B', name: 'Đỏ San Hô', icon: '🔴' },
      { id: '#9B6BFF', name: 'Tím Mộng Mơ', icon: '🟣' },
      { id: '#EC4899', name: 'Hồng Phấn', icon: '🌸' },
      { id: '#0EA5E9', name: 'Lam Biển', icon: '🌊' },
      { id: '#1E293B', name: 'Đen Vũ Trụ', icon: '🌑' },
    ],
  },
};

let editingAvatar = { ...DEFAULT_AVATAR };
let activeAvatarCategory = 'base';

/**
 * Trả về cấu hình Avatar hiện tại đang lưu
 */
export function getSavedAvatar() {
  try {
    const raw = localStorage.getItem('educlass_avatar');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...DEFAULT_AVATAR, ...parsed };
      }
    }
  } catch {
    // fallback
  }
  return { ...DEFAULT_AVATAR };
}

/**
 * Tạo chuỗi mã SVG thuần túy từ cấu hình avatar
 */
export function renderAvatarSvg(cfg, size = 120) {
  const config = { ...DEFAULT_AVATAR, ...cfg };
  const base = config.base || 'cat';
  const color = config.color || '#4F8CFF';
  const headwear = config.headwear || 'none';
  const glasses = config.glasses || 'none';
  const outfit = config.outfit || 'default';
  const wings = config.wings || 'none';
  const held = config.held || 'none';

  return `
    <svg viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" style="border-radius: 50%; background-color: ${color}; display: block; overflow: hidden; box-shadow: 0 8px 20px -4px rgba(0,0,0,0.15);">
      <circle cx="50" cy="50" r="46" fill="white" fill-opacity="0.16" />

      <!-- 0. CÁNH SAU LƯNG -->
      ${
        wings === 'angel'
          ? `<g id="wings-angel" fill="#F0F9FF" stroke="#38BDF8" stroke-width="1.5" opacity="0.95">
               <path d="M30 65 C12 50 8 68 14 78 C18 84 26 82 32 74 Z" />
               <path d="M70 65 C88 50 92 68 86 78 C82 84 74 82 68 74 Z" />
             </g>`
          : wings === 'bat'
          ? `<g id="wings-bat" fill="#7C3AED" stroke="#5B21B6" stroke-width="1.5">
               <path d="M30 65 C14 52 8 64 6 70 C14 74 20 74 22 80 C26 76 28 74 30 72 Z" />
               <path d="M70 65 C86 52 92 64 94 70 C86 74 80 74 78 80 C74 76 72 74 70 72 Z" />
             </g>`
          : ''
      }

      <!-- 1. PHẦN THÂN VÀ ÁO -->
      <g id="outfit">
        <path d="M26 86 C26 70 36 64 50 64 C64 64 74 70 74 86 C74 95 26 95 26 86 Z"
              fill="${outfit === 'jersey' ? '#EF4444' : outfit === 'wizard_robe' ? '#7C3AED' : '#FFFFFF'}" />
        ${
          outfit === 'school_uniform'
            ? `<g>
                 <polygon points="44,64 50,74 56,64" fill="#3B82F6" />
                 <polygon points="48,74 52,74 53,88 50,91 47,88" fill="#1D4ED8" />
               </g>`
            : outfit === 'hoodie'
            ? `<g>
                 <path d="M38 66 C42 72 58 72 62 66" stroke="#4B5563" stroke-width="3" fill="none" />
                 <circle cx="45" cy="74" r="1.5" fill="#9CA3AF" />
                 <circle cx="55" cy="74" r="1.5" fill="#9CA3AF" />
               </g>`
            : outfit === 'jersey'
            ? `<text x="50" y="82" text-anchor="middle" fill="white" font-size="12" font-weight="bold">10</text>`
            : outfit === 'wizard_robe'
            ? `<polygon points="50,70 52,74 56,74 53,77 54,81 50,78 46,81 47,77 44,74 48,74" fill="#FBBF24" />`
            : ''
        }
      </g>

      <!-- 2. MASCOT NHÂN VẬT CHÍNH -->
      ${
        base === 'cat'
          ? `<g id="cat-base">
               <polygon points="26,38 34,16 46,30" fill="#F87171" />
               <polygon points="30,36 35,22 43,30" fill="#FECDD3" />
               <polygon points="74,38 66,16 54,30" fill="#F87171" />
               <polygon points="70,36 65,22 57,30" fill="#FECDD3" />
               <circle cx="50" cy="46" r="24" fill="#FFF1F2" />
               <ellipse cx="41" cy="45" rx="3.5" ry="4.5" fill="#1F2937" />
               <circle cx="39.5" cy="43.5" r="1.2" fill="white" />
               <ellipse cx="59" cy="45" rx="3.5" ry="4.5" fill="#1F2937" />
               <circle cx="57.5" cy="43.5" r="1.2" fill="white" />
               <polygon points="48,51 52,51 50,53" fill="#F43F5E" />
               <path d="M47 54 Q50 56 53 54" stroke="#4B5563" stroke-width="1.2" fill="none" />
               <line x1="28" y1="50" x2="36" y2="51" stroke="#9CA3AF" stroke-width="1.2" />
               <line x1="27" y1="54" x2="36" y2="53" stroke="#9CA3AF" stroke-width="1.2" />
               <line x1="72" y1="50" x2="64" y2="51" stroke="#9CA3AF" stroke-width="1.2" />
               <line x1="73" y1="54" x2="64" y2="53" stroke="#9CA3AF" stroke-width="1.2" />
             </g>`
          : base === 'fox'
          ? `<g id="fox-base">
               <polygon points="24,40 32,12 45,28" fill="#F97316" />
               <polygon points="28,24 32,12 37,20" fill="#1F2937" />
               <polygon points="76,40 68,12 55,28" fill="#F97316" />
               <polygon points="72,24 68,12 63,20" fill="#1F2937" />
               <circle cx="50" cy="46" r="24" fill="#F97316" />
               <path d="M28 50 Q36 60 50 62 Q64 60 72 50 Q66 66 50 68 Q34 66 28 50 Z" fill="#FFFFFF" />
               <ellipse cx="40" cy="44" rx="3" ry="4" fill="#1F2937" />
               <circle cx="39" cy="42" r="1" fill="white" />
               <ellipse cx="60" cy="44" rx="3" ry="4" fill="#1F2937" />
               <circle cx="59" cy="42" r="1" fill="white" />
               <circle cx="50" cy="56" r="2.5" fill="#1F2937" />
             </g>`
          : base === 'bear'
          ? `<g id="bear-base">
               <circle cx="32" cy="26" r="9" fill="#B45309" />
               <circle cx="32" cy="26" r="5" fill="#FDE68A" />
               <circle cx="68" cy="26" r="9" fill="#B45309" />
               <circle cx="68" cy="26" r="5" fill="#FDE68A" />
               <circle cx="50" cy="46" r="24" fill="#D97706" />
               <ellipse cx="50" cy="53" rx="10" ry="8" fill="#FEF3C7" />
               <circle cx="41" cy="43" r="3" fill="#1F2937" />
               <circle cx="40" cy="42" r="1" fill="white" />
               <circle cx="59" cy="43" r="3" fill="#1F2937" />
               <circle cx="58" cy="42" r="1" fill="white" />
               <ellipse cx="50" cy="51" rx="3.5" ry="2.5" fill="#1F2937" />
               <path d="M50 53.5 L50 56 M47 57 Q50 59 53 57" stroke="#1F2937" stroke-width="1" fill="none" />
             </g>`
          : base === 'owl'
          ? `<g id="owl-base">
               <polygon points="34,28 38,18 44,28" fill="#6B7280" />
               <polygon points="66,28 62,18 56,28" fill="#6B7280" />
               <circle cx="50" cy="46" r="24" fill="#9CA3AF" />
               <circle cx="39" cy="44" r="10" fill="#FFFFFF" />
               <circle cx="39" cy="44" r="5" fill="#F59E0B" />
               <circle cx="39" cy="44" r="3" fill="#1F2937" />
               <circle cx="38" cy="43" r="1" fill="white" />
               <circle cx="61" cy="44" r="10" fill="#FFFFFF" />
               <circle cx="61" cy="44" r="5" fill="#F59E0B" />
               <circle cx="61" cy="44" r="3" fill="#1F2937" />
               <circle cx="60" cy="43" r="1" fill="white" />
               <polygon points="48,48 52,48 50,56" fill="#F59E0B" />
             </g>`
          : base === 'rabbit'
          ? `<g id="rabbit-base">
               <ellipse cx="38" cy="18" rx="6" ry="16" fill="#FFFFFF" />
               <ellipse cx="38" cy="18" rx="3.5" ry="11" fill="#FBCFE8" />
               <ellipse cx="62" cy="18" rx="6" ry="16" fill="#FFFFFF" />
               <ellipse cx="62" cy="18" rx="3.5" ry="11" fill="#FBCFE8" />
               <circle cx="50" cy="48" r="23" fill="#FFFFFF" />
               <circle cx="41" cy="46" r="3.5" fill="#831843" />
               <circle cx="40" cy="44.5" r="1.2" fill="white" />
               <circle cx="59" cy="46" r="3.5" fill="#831843" />
               <circle cx="58" cy="44.5" r="1.2" fill="white" />
               <polygon points="48,52 52,52 50,54" fill="#F472B6" />
               <rect x="48.5" y="55" width="3" height="3" fill="#FFFFFF" stroke="#D1D5DB" stroke-width="0.5" />
             </g>`
          : base === 'penguin'
          ? `<g id="penguin-base">
               <circle cx="50" cy="46" r="24" fill="#1F2937" />
               <ellipse cx="42" cy="48" rx="10" ry="12" fill="#FFFFFF" />
               <ellipse cx="58" cy="48" rx="10" ry="12" fill="#FFFFFF" />
               <circle cx="43" cy="44" r="3" fill="#1F2937" />
               <circle cx="42" cy="43" r="1" fill="white" />
               <circle cx="57" cy="44" r="3" fill="#1F2937" />
               <circle cx="56" cy="43" r="1" fill="white" />
               <polygon points="46,50 54,50 50,57" fill="#F97316" />
               <circle cx="35" cy="50" r="3" fill="#FDA4AF" fill-opacity="0.7" />
               <circle cx="65" cy="50" r="3" fill="#FDA4AF" fill-opacity="0.7" />
             </g>`
          : base === 'robot'
          ? `<g id="robot-base">
               <line x1="50" y1="20" x2="50" y2="12" stroke="#64748B" stroke-width="3" />
               <circle cx="50" cy="11" r="3" fill="#EF4444" />
               <rect x="22" y="38" width="5" height="12" rx="2" fill="#64748B" />
               <rect x="73" y="38" width="5" height="12" rx="2" fill="#64748B" />
               <rect x="26" y="24" width="48" height="42" rx="12" fill="#94A3B8" />
               <rect x="32" y="32" width="36" height="24" rx="6" fill="#0F172A" />
               <rect x="37" y="39" width="8" height="6" rx="2" fill="#38BDF8" />
               <rect x="55" y="39" width="8" height="6" rx="2" fill="#38BDF8" />
               <line x1="42" y1="50" x2="58" y2="50" stroke="#38BDF8" stroke-width="1.5" stroke-dasharray="2 1" />
             </g>`
          : base === 'dragon'
          ? `<g id="dragon-base">
               <polygon points="34,30 26,14 40,24" fill="#FBBF24" />
               <polygon points="66,30 74,14 60,24" fill="#FBBF24" />
               <circle cx="50" cy="46" r="24" fill="#10B981" />
               <path d="M38 56 Q50 64 62 56 Q50 68 38 56" fill="#FDE68A" />
               <circle cx="40" cy="43" r="4" fill="#F59E0B" />
               <ellipse cx="40" cy="43" rx="1.5" ry="3.5" fill="#1F2937" />
               <circle cx="60" cy="43" r="4" fill="#F59E0B" />
               <ellipse cx="60" cy="43" rx="1.5" ry="3.5" fill="#1F2937" />
               <ellipse cx="46" cy="52" rx="1.2" ry="1" fill="#065F46" />
               <ellipse cx="54" cy="52" rx="1.2" ry="1" fill="#065F46" />
             </g>`
          : ''
      }

      <!-- 3. PHỤ KIỆN MẮT & KÍNH -->
      ${
        glasses === 'glasses'
          ? `<g id="glasses">
               <circle cx="39" cy="44" r="9" stroke="#1F2937" stroke-width="2.5" fill="none" />
               <circle cx="61" cy="44" r="9" stroke="#1F2937" stroke-width="2.5" fill="none" />
               <line x1="48" y1="44" x2="52" y2="44" stroke="#1F2937" stroke-width="2.5" />
             </g>`
          : glasses === 'sunglasses'
          ? `<g id="sunglasses">
               <path d="M30 40 L48 40 L45 52 L33 52 Z" fill="#0F172A" />
               <path d="M52 40 L70 40 L67 52 L55 52 Z" fill="#0F172A" />
               <line x1="47" y1="42" x2="53" y2="42" stroke="#0F172A" stroke-width="3" />
               <line x1="33" y1="43" x2="40" y2="49" stroke="#FFFFFF" stroke-width="1" stroke-opacity="0.6" />
               <line x1="55" y1="43" x2="62" y2="49" stroke="#FFFFFF" stroke-width="1" stroke-opacity="0.6" />
             </g>`
          : glasses === 'blush_star'
          ? `<g id="blush-star">
               <text x="29" y="54" fill="#F43F5E" font-size="9" text-anchor="middle">⭐</text>
               <text x="71" y="54" fill="#F43F5E" font-size="9" text-anchor="middle">⭐</text>
             </g>`
          : ''
      }

      <!-- 4. MŨ NÓN & PHỤ KIỆN ĐẦU -->
      ${
        headwear === 'straw'
          ? `<g id="straw-hat">
               <polygon points="50,14 20,34 80,34" fill="#FEF08A" stroke="#CA8A04" stroke-width="1" />
               <line x1="50" y1="14" x2="35" y2="34" stroke="#EAB308" stroke-width="0.8" opacity="0.7" />
               <line x1="50" y1="14" x2="50" y2="34" stroke="#EAB308" stroke-width="0.8" opacity="0.7" />
               <line x1="50" y1="14" x2="65" y2="34" stroke="#EAB308" stroke-width="0.8" opacity="0.7" />
               <path d="M30 34 Q36 48 50 50 Q64 48 70 34" stroke="#F43F5E" stroke-width="1.5" fill="none" />
             </g>`
          : headwear === 'cap'
          ? `<g id="cap">
               <path d="M30 28 C30 18 50 16 70 28 Z" fill="#EF4444" />
               <ellipse cx="64" cy="28" rx="14" ry="4" fill="#DC2626" />
               <circle cx="50" cy="18" r="2" fill="#B91C1C" />
             </g>`
          : headwear === 'headphones'
          ? `<g id="headphones">
               <path d="M24 44 C24 18 76 18 76 44" stroke="#1F2937" stroke-width="4" fill="none" />
               <rect x="20" y="36" width="7" height="15" rx="3.5" fill="#3B82F6" />
               <rect x="73" y="36" width="7" height="15" rx="3.5" fill="#3B82F6" />
             </g>`
          : headwear === 'grad_cap'
          ? `<g id="grad-cap">
               <polygon points="50,12 80,22 50,30 20,22" fill="#1F2937" />
               <rect x="36" y="26" width="28" height="8" rx="2" fill="#111827" />
               <circle cx="50" cy="21" r="2" fill="#F59E0B" />
               <path d="M50 21 Q62 23 66 32" stroke="#F59E0B" stroke-width="1.5" fill="none" />
               <circle cx="66" cy="33" r="2" fill="#F59E0B" />
             </g>`
          : headwear === 'crown'
          ? `<g id="crown">
               <polygon points="30,28 32,16 42,23 50,12 58,23 68,16 70,28" fill="#FBBF24" stroke="#D97706" stroke-width="1" />
               <circle cx="32" cy="16" r="2" fill="#EF4444" />
               <circle cx="50" cy="12" r="2.5" fill="#3B82F6" />
               <circle cx="68" cy="16" r="2" fill="#10B981" />
             </g>`
          : headwear === 'headband'
          ? `<g id="headband">
               <path d="M26 32 C34 26 66 26 74 32" stroke="#DC2626" stroke-width="4" fill="none" />
               <polygon points="50,26 44,22 46,30 50,28 54,30 56,22" fill="#EF4444" />
             </g>`
          : ''
      }

      <!-- 5. VẬT PHẨM CẦM TAY -->
      ${
        held === 'pencil'
          ? `<g id="held-pencil" transform="translate(68, 60) rotate(20)">
               <rect x="0" y="0" width="6" height="22" fill="#FACC15" stroke="#CA8A04" stroke-width="1" />
               <polygon points="0,0 6,0 3,-7" fill="#FDE68A" />
               <polygon points="2,-4 4,-4 3,-7" fill="#1E293B" />
               <rect x="0" y="17" width="6" height="5" fill="#F472B6" />
             </g>`
          : held === 'wand'
          ? `<g id="held-wand" transform="translate(68, 62) rotate(15)">
               <rect x="2" y="0" width="3" height="22" fill="#94A3B8" rx="1" />
               <polygon points="3.5,-4 5,1 10,1 6,5 7,10 3.5,7 0,10 1,5 -3,1 2,1" fill="#F59E0B" stroke="#D97706" stroke-width="1" />
               <circle cx="3.5" cy="3" r="1.5" fill="#FFFFFF" />
             </g>`
          : ''
      }
    </svg>
  `;
}

/**
 * Cập nhật hiển thị Mascot trên các vị trí của Cổng Học Sinh
 */
export function updateStudentMascotDisplays() {
  const current = getSavedAvatar();

  // 1. Cập nhật trên màn hình Join (Vào lớp)
  const joinContainer = document.getElementById('join-mascot-container');
  if (joinContainer) {
    joinContainer.innerHTML = renderAvatarSvg(current, 100);
  }

  // 2. Cập nhật trên màn hình Lobby (Phòng chờ)
  const lobbyContainer = document.getElementById('lobby-mascot-container');
  if (lobbyContainer) {
    lobbyContainer.innerHTML = renderAvatarSvg(current, 110);
  }
}

/**
 * Mở Modal Phòng Thay Đồ Mascot
 */
export function openAvatarModal() {
  editingAvatar = { ...getSavedAvatar() };
  activeAvatarCategory = 'base';

  const modal = document.getElementById('mascot-customizer-modal');
  if (!modal) return;

  modal.classList.remove('hidden');
  renderModalPreview();
  renderModalTabs();
  renderModalGrid();
}

/**
 * Đóng Modal Phòng Thay Đồ Mascot
 */
export function closeAvatarModal() {
  const modal = document.getElementById('mascot-customizer-modal');
  if (modal) modal.classList.add('hidden');
}

/**
 * Hiển thị live preview trong Modal
 */
function renderModalPreview() {
  const previewBox = document.getElementById('modal-avatar-preview');
  if (previewBox) {
    previewBox.innerHTML = renderAvatarSvg(editingAvatar, 140);
  }
}

/**
 * Hiển thị danh sách tab danh mục
 */
function renderModalTabs() {
  const tabsBar = document.getElementById('modal-avatar-tabs');
  if (!tabsBar) return;

  tabsBar.innerHTML = '';
  Object.keys(AVATAR_CATALOG).forEach((catKey) => {
    const cat = AVATAR_CATALOG[catKey];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn-avatar-tab ${catKey === activeAvatarCategory ? 'active' : ''}`;
    btn.innerHTML = cat.title;
    btn.onclick = () => {
      activeAvatarCategory = catKey;
      renderModalTabs();
      renderModalGrid();
      // Tự động cuộn tab được chọn vào giữa tầm nhìn
      setTimeout(() => {
        const updatedBtn = tabsBar.querySelector(`.btn-avatar-tab.active`);
        if (updatedBtn) {
          updatedBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }, 50);
    };
    tabsBar.appendChild(btn);
  });

  // Hỗ trợ cuộn chuột lăn ngang tự nhiên
  if (!tabsBar.dataset.wheelBound) {
    tabsBar.dataset.wheelBound = 'true';
    tabsBar.addEventListener(
      'wheel',
      (e) => {
        if (e.deltaY !== 0) {
          e.preventDefault();
          tabsBar.scrollLeft += e.deltaY;
        }
      },
      { passive: false }
    );
  }
}

/**
 * Cuộn thanh danh mục Mascot sang trái/phải
 */
export function scrollMascotTabs(amount) {
  const tabsBar = document.getElementById('modal-avatar-tabs');
  if (tabsBar) {
    tabsBar.scrollBy({ left: amount, behavior: 'smooth' });
  }
}
if (typeof window !== 'undefined') {
  window.scrollMascotTabs = scrollMascotTabs;
}

/**
 * Hiển thị danh sách các món đồ trang phục theo tab
 */
function renderModalGrid() {
  const grid = document.getElementById('modal-avatar-grid');
  if (!grid) return;

  grid.innerHTML = '';
  const categoryData = AVATAR_CATALOG[activeAvatarCategory];
  if (!categoryData) return;

  categoryData.items.forEach((item) => {
    const isSelected = editingAvatar[activeAvatarCategory] === item.id;
    const card = document.createElement('div');
    card.className = `avatar-item-card ${isSelected ? 'active' : ''}`;

    if (activeAvatarCategory === 'color') {
      card.innerHTML = `
        <div style="width: 32px; height: 32px; border-radius: 50%; background-color: ${item.id}; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.2); margin-bottom: 4px;"></div>
        <div class="item-title">${item.name}</div>
      `;
    } else {
      card.innerHTML = `
        <div class="item-icon">${item.icon}</div>
        <div class="item-title">${item.name}</div>
      `;
    }

    card.onclick = () => {
      editingAvatar[activeAvatarCategory] = item.id;
      renderModalPreview();
      renderModalGrid();
    };

    grid.appendChild(card);
  });
}

/**
 * Đổi ngẫu nhiên diện mạo Mascot (Randomize)
 */
export function randomizeAvatar() {
  const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)].id;

  editingAvatar = {
    base: pickRandom(AVATAR_CATALOG.base.items),
    headwear: pickRandom(AVATAR_CATALOG.headwear.items),
    outfit: pickRandom(AVATAR_CATALOG.outfit.items),
    wings: pickRandom(AVATAR_CATALOG.wings.items),
    held: pickRandom(AVATAR_CATALOG.held.items),
    glasses: pickRandom(AVATAR_CATALOG.glasses.items),
    color: pickRandom(AVATAR_CATALOG.color.items),
  };

  renderModalPreview();
  renderModalGrid();
}

/**
 * Xác nhận lưu diện mạo mới
 */
export async function confirmAvatarSave() {
  try {
    localStorage.setItem('educlass_avatar', JSON.stringify(editingAvatar));
  } catch {
    // Ignore localStorage error
  }

  // Đồng bộ lên máy chủ nếu học sinh đã chọn danh tính trong lớp
  if (state.selectedStudent && state.selectedStudent.id) {
    try {
      await fetch(`/api/students/${state.selectedStudent.id}/avatar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: editingAvatar }),
      });
    } catch {
      // Bỏ qua lỗi mạng nếu đang offline
    }
  }

  updateStudentMascotDisplays();
  closeAvatarModal();

  // Hiển thị thông báo nhanh
  const toast = document.getElementById('avatar-toast');
  if (toast) {
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2500);
  }
}

/**
 * Khởi tạo Avatar khi tải trang
 */
export function initAvatar() {
  updateStudentMascotDisplays();
}
