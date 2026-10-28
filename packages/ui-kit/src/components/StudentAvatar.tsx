import React from 'react';
import type { AvatarConfig } from '@educlass/protocol';

export interface StudentAvatarProps {
  config?: Partial<AvatarConfig> | undefined;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | undefined;
  className?: string | undefined;
  showBorder?: boolean | undefined;
}

const sizeMap: Record<string, { px: number; className: string }> = {
  xs: { px: 28, className: 'w-7 h-7' },
  sm: { px: 36, className: 'w-9 h-9' },
  md: { px: 48, className: 'w-12 h-12' },
  lg: { px: 64, className: 'w-16 h-16' },
  xl: { px: 96, className: 'w-24 h-24' },
  '2xl': { px: 128, className: 'w-32 h-32' },
};

/**
 * Component hiển thị Avatar nhân vật học sinh dạng Vector SVG thuần túy
 * Hỗ trợ 8 loại nhân vật, phụ kiện mũ nón, kính mắt và trang phục
 */
export const StudentAvatar: React.FC<StudentAvatarProps> = ({
  config,
  size = 'md',
  className = '',
  showBorder = true,
}) => {
  const base = config?.base || 'cat';
  const color = config?.color || '#4F8CFF';
  const headwear = config?.headwear || 'none';
  const glasses = config?.glasses || 'none';
  const outfit = config?.outfit || 'default';
  const wings = config?.wings || 'none';
  const held = config?.held || 'none';

  const { className: sizeClass } = sizeMap[size] || sizeMap.md!;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full select-none overflow-hidden ${
        showBorder ? 'ring-2 ring-white shadow-xs' : ''
      } ${sizeClass} ${className}`}
      style={{ backgroundColor: color }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Nền mềm mại / bóng tròn */}
        <circle cx="50" cy="50" r="46" fill="white" fillOpacity="0.15" />

        {/* 0. Cánh sau lưng (Wings) */}
        {wings === 'angel' && (
          <g id="wings-angel" fill="#F0F9FF" stroke="#38BDF8" strokeWidth="1.5" opacity="0.95">
            <path d="M30 65 C12 50 8 68 14 78 C18 84 26 82 32 74 Z" />
            <path d="M70 65 C88 50 92 68 86 78 C82 84 74 82 68 74 Z" />
          </g>
        )}
        {wings === 'bat' && (
          <g id="wings-bat" fill="#7C3AED" stroke="#5B21B6" strokeWidth="1.5">
            <path d="M30 65 C14 52 8 64 6 70 C14 74 20 74 22 80 C26 76 28 74 30 72 Z" />
            <path d="M70 65 C86 52 92 64 94 70 C86 74 80 74 78 80 C74 76 72 74 70 72 Z" />
          </g>
        )}

        {/* 1. Phần Thân & Trang phục (Outfit) */}
        <g id="outfit">
          {/* Cổ và thân cơ bản */}
          <path
            d="M26 86 C26 70 36 64 50 64 C64 64 74 70 74 86 C74 95 26 95 26 86 Z"
            fill={
              outfit === 'jersey' ? '#EF4444' : outfit === 'wizard_robe' ? '#7C3AED' : '#FFFFFF'
            }
          />

          {outfit === 'school_uniform' && (
            <g>
              {/* Cổ áo sơ mi & cà vạt */}
              <polygon points="44,64 50,74 56,64" fill="#3B82F6" />
              <polygon points="48,74 52,74 53,88 50,91 47,88" fill="#1D4ED8" />
            </g>
          )}

          {outfit === 'hoodie' && (
            <g>
              {/* Mũ trùm hoodie quanh cổ */}
              <path d="M38 66 C42 72 58 72 62 66" stroke="#4B5563" strokeWidth="3" fill="none" />
              <circle cx="45" cy="74" r="1.5" fill="#9CA3AF" />
              <circle cx="55" cy="74" r="1.5" fill="#9CA3AF" />
            </g>
          )}

          {outfit === 'jersey' && (
            <text x="50" y="82" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
              10
            </text>
          )}

          {outfit === 'wizard_robe' && (
            <g>
              <polygon
                points="50,70 52,74 56,74 53,77 54,81 50,78 46,81 47,77 44,74 48,74"
                fill="#FBBF24"
              />
            </g>
          )}
        </g>

        {/* 2. Loại Nhân vật Cơ bản (Base Character) */}
        {base === 'cat' && (
          <g id="cat-base">
            {/* Tai mèo */}
            <polygon points="26,38 34,16 46,30" fill="#F87171" />
            <polygon points="30,36 35,22 43,30" fill="#FECDD3" />
            <polygon points="74,38 66,16 54,30" fill="#F87171" />
            <polygon points="70,36 65,22 57,30" fill="#FECDD3" />
            {/* Đầu */}
            <circle cx="50" cy="46" r="24" fill="#FFF1F2" />
            {/* Mắt mèo */}
            <ellipse cx="41" cy="45" rx="3.5" ry="4.5" fill="#1F2937" />
            <circle cx="39.5" cy="43.5" r="1.2" fill="white" />
            <ellipse cx="59" cy="45" rx="3.5" ry="4.5" fill="#1F2937" />
            <circle cx="57.5" cy="43.5" r="1.2" fill="white" />
            {/* Mũi & Miệng */}
            <polygon points="48,51 52,51 50,53" fill="#F43F5E" />
            <path d="M47 54 Q50 56 53 54" stroke="#4B5563" strokeWidth="1.2" fill="none" />
            {/* Ria mèo */}
            <line x1="28" y1="50" x2="36" y2="51" stroke="#9CA3AF" strokeWidth="1.2" />
            <line x1="27" y1="54" x2="36" y2="53" stroke="#9CA3AF" strokeWidth="1.2" />
            <line x1="72" y1="50" x2="64" y2="51" stroke="#9CA3AF" strokeWidth="1.2" />
            <line x1="73" y1="54" x2="64" y2="53" stroke="#9CA3AF" strokeWidth="1.2" />
          </g>
        )}

        {base === 'fox' && (
          <g id="fox-base">
            {/* Tai cáo */}
            <polygon points="24,40 32,12 45,28" fill="#F97316" />
            <polygon points="28,24 32,12 37,20" fill="#1F2937" />
            <polygon points="76,40 68,12 55,28" fill="#F97316" />
            <polygon points="72,24 68,12 63,20" fill="#1F2937" />
            {/* Đầu & má cáo */}
            <circle cx="50" cy="46" r="24" fill="#F97316" />
            <path d="M28 50 Q36 60 50 62 Q64 60 72 50 Q66 66 50 68 Q34 66 28 50 Z" fill="#FFFFFF" />
            {/* Mắt cáo */}
            <ellipse cx="40" cy="44" rx="3" ry="4" fill="#1F2937" />
            <circle cx="39" cy="42" r="1" fill="white" />
            <ellipse cx="60" cy="44" rx="3" ry="4" fill="#1F2937" />
            <circle cx="59" cy="42" r="1" fill="white" />
            {/* Mũi đen */}
            <circle cx="50" cy="56" r="2.5" fill="#1F2937" />
          </g>
        )}

        {base === 'bear' && (
          <g id="bear-base">
            {/* Tai gấu tròn */}
            <circle cx="32" cy="26" r="9" fill="#B45309" />
            <circle cx="32" cy="26" r="5" fill="#FDE68A" />
            <circle cx="68" cy="26" r="9" fill="#B45309" />
            <circle cx="68" cy="26" r="5" fill="#FDE68A" />
            {/* Đầu gấu */}
            <circle cx="50" cy="46" r="24" fill="#D97706" />
            {/* Khoang mõm gấu */}
            <ellipse cx="50" cy="53" rx="10" ry="8" fill="#FEF3C7" />
            {/* Mắt gấu */}
            <circle cx="41" cy="43" r="3" fill="#1F2937" />
            <circle cx="40" cy="42" r="1" fill="white" />
            <circle cx="59" cy="43" r="3" fill="#1F2937" />
            <circle cx="58" cy="42" r="1" fill="white" />
            {/* Mũi gấu */}
            <ellipse cx="50" cy="51" rx="3.5" ry="2.5" fill="#1F2937" />
            <path
              d="M50 53.5 L50 56 M47 57 Q50 59 53 57"
              stroke="#1F2937"
              strokeWidth="1"
              fill="none"
            />
          </g>
        )}

        {base === 'owl' && (
          <g id="owl-base">
            {/* Chùm lông tai cú */}
            <polygon points="34,28 38,18 44,28" fill="#6B7280" />
            <polygon points="66,28 62,18 56,28" fill="#6B7280" />
            {/* Đầu */}
            <circle cx="50" cy="46" r="24" fill="#9CA3AF" />
            {/* Vòng mắt cú to */}
            <circle cx="39" cy="44" r="10" fill="#FFFFFF" />
            <circle cx="39" cy="44" r="5" fill="#F59E0B" />
            <circle cx="39" cy="44" r="3" fill="#1F2937" />
            <circle cx="38" cy="43" r="1" fill="white" />
            <circle cx="61" cy="44" r="10" fill="#FFFFFF" />
            <circle cx="61" cy="44" r="5" fill="#F59E0B" />
            <circle cx="61" cy="44" r="3" fill="#1F2937" />
            <circle cx="60" cy="43" r="1" fill="white" />
            {/* Mỏ cú */}
            <polygon points="48,48 52,48 50,56" fill="#F59E0B" />
          </g>
        )}

        {base === 'rabbit' && (
          <g id="rabbit-base">
            {/* Tai thỏ dài */}
            <ellipse cx="38" cy="18" rx="6" ry="16" fill="#FFFFFF" />
            <ellipse cx="38" cy="18" rx="3.5" ry="11" fill="#FBCFE8" />
            <ellipse cx="62" cy="18" rx="6" ry="16" fill="#FFFFFF" />
            <ellipse cx="62" cy="18" rx="3.5" ry="11" fill="#FBCFE8" />
            {/* Đầu thỏ */}
            <circle cx="50" cy="48" r="23" fill="#FFFFFF" />
            {/* Mắt thỏ */}
            <circle cx="41" cy="46" r="3.5" fill="#831843" />
            <circle cx="40" cy="44.5" r="1.2" fill="white" />
            <circle cx="59" cy="46" r="3.5" fill="#831843" />
            <circle cx="58" cy="44.5" r="1.2" fill="white" />
            {/* Mũi & răng thỏ */}
            <polygon points="48,52 52,52 50,54" fill="#F472B6" />
            <rect
              x="48.5"
              y="55"
              width="3"
              height="3"
              fill="#FFFFFF"
              stroke="#D1D5DB"
              strokeWidth="0.5"
            />
          </g>
        )}

        {base === 'penguin' && (
          <g id="penguin-base">
            {/* Đầu chim cánh cụt */}
            <circle cx="50" cy="46" r="24" fill="#1F2937" />
            {/* Má trắng */}
            <ellipse cx="42" cy="48" rx="10" ry="12" fill="#FFFFFF" />
            <ellipse cx="58" cy="48" rx="10" ry="12" fill="#FFFFFF" />
            {/* Mắt */}
            <circle cx="43" cy="44" r="3" fill="#1F2937" />
            <circle cx="42" cy="43" r="1" fill="white" />
            <circle cx="57" cy="44" r="3" fill="#1F2937" />
            <circle cx="56" cy="43" r="1" fill="white" />
            {/* Mỏ chim cam */}
            <polygon points="46,50 54,50 50,57" fill="#F97316" />
            {/* Má hồng */}
            <circle cx="35" cy="50" r="3" fill="#FDA4AF" fillOpacity="0.7" />
            <circle cx="65" cy="50" r="3" fill="#FDA4AF" fillOpacity="0.7" />
          </g>
        )}

        {base === 'robot' && (
          <g id="robot-base">
            {/* Ăng ten */}
            <line x1="50" y1="20" x2="50" y2="12" stroke="#64748B" strokeWidth="3" />
            <circle cx="50" cy="11" r="3" fill="#EF4444" />
            {/* Tai ốc vít */}
            <rect x="22" y="38" width="5" height="12" rx="2" fill="#64748B" />
            <rect x="73" y="38" width="5" height="12" rx="2" fill="#64748B" />
            {/* Đầu hình vuông bo góc */}
            <rect x="26" y="24" width="48" height="42" rx="12" fill="#94A3B8" />
            {/* Kính màn hình LED */}
            <rect x="32" y="32" width="36" height="24" rx="6" fill="#0F172A" />
            {/* Mắt LED xanh */}
            <rect x="37" y="39" width="8" height="6" rx="2" fill="#38BDF8" />
            <rect x="55" y="39" width="8" height="6" rx="2" fill="#38BDF8" />
            {/* Miệng vạch sóng */}
            <line
              x1="42"
              y1="50"
              x2="58"
              y2="50"
              stroke="#38BDF8"
              strokeWidth="1.5"
              strokeDasharray="2 1"
            />
          </g>
        )}

        {base === 'dragon' && (
          <g id="dragon-base">
            {/* Sừng rồng vàng */}
            <polygon points="34,30 26,14 40,24" fill="#FBBF24" />
            <polygon points="66,30 74,14 60,24" fill="#FBBF24" />
            {/* Đầu rồng xanh ngọc */}
            <circle cx="50" cy="46" r="24" fill="#10B981" />
            {/* Bụng / cằm vảy */}
            <path d="M38 56 Q50 64 62 56 Q50 68 38 56" fill="#FDE68A" />
            {/* Mắt rồng */}
            <circle cx="40" cy="43" r="4" fill="#F59E0B" />
            <ellipse cx="40" cy="43" rx="1.5" ry="3.5" fill="#1F2937" />
            <circle cx="60" cy="43" r="4" fill="#F59E0B" />
            <ellipse cx="60" cy="43" rx="1.5" ry="3.5" fill="#1F2937" />
            {/* Lỗ mũi ngộ nghĩnh */}
            <ellipse cx="46" cy="52" rx="1.2" ry="1" fill="#065F46" />
            <ellipse cx="54" cy="52" rx="1.2" ry="1" fill="#065F46" />
          </g>
        )}

        {/* 3. Phụ kiện Mắt / Kính (Glasses) */}
        {glasses === 'glasses' && (
          <g id="glasses">
            <circle cx="39" cy="44" r="9" stroke="#1F2937" strokeWidth="2.5" fill="none" />
            <circle cx="61" cy="44" r="9" stroke="#1F2937" strokeWidth="2.5" fill="none" />
            <line x1="48" y1="44" x2="52" y2="44" stroke="#1F2937" strokeWidth="2.5" />
          </g>
        )}

        {glasses === 'sunglasses' && (
          <g id="sunglasses">
            <path d="M30 40 L48 40 L45 52 L33 52 Z" fill="#0F172A" />
            <path d="M52 40 L70 40 L67 52 L55 52 Z" fill="#0F172A" />
            <line x1="47" y1="42" x2="53" y2="42" stroke="#0F172A" strokeWidth="3" />
            {/* Vạch lóa sáng trên kính râm */}
            <line
              x1="33"
              y1="43"
              x2="40"
              y2="49"
              stroke="#FFFFFF"
              strokeWidth="1"
              strokeOpacity="0.6"
            />
            <line
              x1="55"
              y1="43"
              x2="62"
              y2="49"
              stroke="#FFFFFF"
              strokeWidth="1"
              strokeOpacity="0.6"
            />
          </g>
        )}

        {glasses === 'blush_star' && (
          <g id="blush-star">
            {/* Ngôi sao má hồng 2 bên */}
            <text x="29" y="54" fill="#F43F5E" fontSize="9" textAnchor="middle">
              ⭐
            </text>
            <text x="71" y="54" fill="#F43F5E" fontSize="9" textAnchor="middle">
              ⭐
            </text>
          </g>
        )}

        {headwear === 'straw' && (
          <g id="straw-hat">
            <polygon points="50,14 20,34 80,34" fill="#FEF08A" stroke="#CA8A04" strokeWidth="1" />
            <line
              x1="50"
              y1="14"
              x2="35"
              y2="34"
              stroke="#EAB308"
              strokeWidth="0.8"
              opacity="0.7"
            />
            <line
              x1="50"
              y1="14"
              x2="50"
              y2="34"
              stroke="#EAB308"
              strokeWidth="0.8"
              opacity="0.7"
            />
            <line
              x1="50"
              y1="14"
              x2="65"
              y2="34"
              stroke="#EAB308"
              strokeWidth="0.8"
              opacity="0.7"
            />
            <path
              d="M30 34 Q36 48 50 50 Q64 48 70 34"
              stroke="#F43F5E"
              strokeWidth="1.5"
              fill="none"
            />
          </g>
        )}

        {headwear === 'cap' && (
          <g id="cap">
            <path d="M30 28 C30 18 50 16 70 28 Z" fill="#EF4444" />
            <ellipse cx="64" cy="28" rx="14" ry="4" fill="#DC2626" />
            <circle cx="50" cy="18" r="2" fill="#B91C1C" />
          </g>
        )}

        {headwear === 'headphones' && (
          <g id="headphones">
            {/* Vòm tai nghe */}
            <path d="M24 44 C24 18 76 18 76 44" stroke="#1F2937" strokeWidth="4" fill="none" />
            {/* 2 ốp tai nghe */}
            <rect x="20" y="36" width="7" height="15" rx="3.5" fill="#3B82F6" />
            <rect x="73" y="36" width="7" height="15" rx="3.5" fill="#3B82F6" />
          </g>
        )}

        {headwear === 'grad_cap' && (
          <g id="grad-cap">
            {/* Mũ cử nhân */}
            <polygon points="50,12 80,22 50,30 20,22" fill="#1F2937" />
            <rect x="36" y="26" width="28" height="8" rx="2" fill="#111827" />
            {/* Nút đỉnh và tua vàng */}
            <circle cx="50" cy="21" r="2" fill="#F59E0B" />
            <path d="M50 21 Q62 23 66 32" stroke="#F59E0B" strokeWidth="1.5" fill="none" />
            <circle cx="66" cy="33" r="2" fill="#F59E0B" />
          </g>
        )}

        {headwear === 'crown' && (
          <g id="crown">
            <polygon
              points="30,28 32,16 42,23 50,12 58,23 68,16 70,28"
              fill="#FBBF24"
              stroke="#D97706"
              strokeWidth="1"
            />
            <circle cx="32" cy="16" r="2" fill="#EF4444" />
            <circle cx="50" cy="12" r="2.5" fill="#3B82F6" />
            <circle cx="68" cy="16" r="2" fill="#10B981" />
          </g>
        )}

        {headwear === 'headband' && (
          <g id="headband">
            <path d="M26 32 C34 26 66 26 74 32" stroke="#DC2626" strokeWidth="4" fill="none" />
            <polygon points="50,26 44,22 46,30 50,28 54,30 56,22" fill="#EF4444" />
          </g>
        )}

        {/* 5. Đạo cụ cầm tay (Held) */}
        {held === 'pencil' && (
          <g id="held-pencil" transform="translate(68, 60) rotate(20)">
            <rect
              x="0"
              y="0"
              width="6"
              height="22"
              fill="#FACC15"
              stroke="#CA8A04"
              strokeWidth="1"
            />
            <polygon points="0,0 6,0 3,-7" fill="#FDE68A" />
            <polygon points="2,-4 4,-4 3,-7" fill="#1E293B" />
            <rect x="0" y="17" width="6" height="5" fill="#F472B6" />
          </g>
        )}

        {held === 'wand' && (
          <g id="held-wand" transform="translate(68, 62) rotate(15)">
            <rect x="2" y="0" width="3" height="22" fill="#94A3B8" rx="1" />
            <polygon
              points="3.5,-4 5,1 10,1 6,5 7,10 3.5,7 0,10 1,5 -3,1 2,1"
              fill="#F59E0B"
              stroke="#D97706"
              strokeWidth="1"
            />
            <circle cx="3.5" cy="3" r="1.5" fill="#FFFFFF" />
          </g>
        )}
      </svg>
    </div>
  );
};
