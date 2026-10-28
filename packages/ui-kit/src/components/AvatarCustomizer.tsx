import React, { useState, useRef } from 'react';
import type {
  AvatarConfig,
  AvatarBaseType,
  HeadwearType,
  GlassesType,
  OutfitType,
  WingsType,
  HeldType,
} from '@educlass/protocol';
import { StudentAvatar } from './StudentAvatar.js';
import { Button } from './Button.js';
import { UI_TYPOGRAPHY } from '../tokens/index.js';

export interface AvatarCustomizerProps {
  /** Cấu hình avatar hiện tại */
  currentConfig?: Partial<AvatarConfig> | undefined;
  /** Cấp độ hiện tại của học sinh */
  studentLevel?: number | undefined;
  /** Danh sách mã danh hiệu học sinh đã mở khóa */
  unlockedTitleKeys?: string[] | undefined;
  /** Hàm callback khi học sinh nhấn Lưu */
  onSave?: ((config: AvatarConfig) => void) | undefined;
  /** Hàm callback khi học sinh nhấn Hủy / Đóng */
  onCancel?: (() => void) | undefined;
  /** Trạng thái đang lưu dữ liệu */
  isSaving?: boolean | undefined;
  className?: string | undefined;
}

interface ItemOption<T> {
  id: T;
  label: string;
  icon?: string | undefined;
  unlockLevel: number;
  unlockTitleKey?: string | undefined;
}

// Mở khóa toàn bộ cho học sinh (unlockLevel: 1)
const BASES: ItemOption<AvatarBaseType>[] = [
  { id: 'cat', label: 'Mèo con', icon: '🐱', unlockLevel: 1 },
  { id: 'bear', label: 'Gấu nâu', icon: '🐻', unlockLevel: 1 },
  { id: 'rabbit', label: 'Thỏ tuyết', icon: '🐰', unlockLevel: 1 },
  { id: 'fox', label: 'Cáo nhỏ', icon: '🦊', unlockLevel: 1 },
  { id: 'owl', label: 'Cú vọ', icon: '🦉', unlockLevel: 1 },
  { id: 'robot', label: 'Robot AI', icon: '🤖', unlockLevel: 1 },
  { id: 'penguin', label: 'Cánh cụt', icon: '🐧', unlockLevel: 1 },
  { id: 'dragon', label: 'Rồng thần', icon: '🐲', unlockLevel: 5 },
];

const COLORS = [
  { hex: '#4F8CFF', label: 'Xanh lam' },
  { hex: '#FFB020', label: 'Cam vàng' },
  { hex: '#2ECC8F', label: 'Xanh lục' },
  { hex: '#FF6B6B', label: 'Đỏ san hô' },
  { hex: '#9B6BFF', label: 'Tím hoa cà' },
  { hex: '#FF8AB3', label: 'Hồng phấn' },
  { hex: '#0EA5E9', label: 'Xanh da trời' },
  { hex: '#64748B', label: 'Xám titan' },
];

const HEADWEARS: ItemOption<HeadwearType>[] = [
  { id: 'none', label: 'Không đội', icon: '🚫', unlockLevel: 1 },
  { id: 'straw', label: 'Nón lá', icon: '👒', unlockLevel: 1 },
  { id: 'cap', label: 'Mũ lưỡi trai', icon: '🧢', unlockLevel: 1 },
  { id: 'crown', label: 'Vương miện', icon: '👑', unlockLevel: 1 },
  { id: 'headphones', label: 'Tai nghe', icon: '🎧', unlockLevel: 1 },
  { id: 'grad_cap', label: 'Mũ cử nhân', icon: '🎓', unlockLevel: 1 },
  { id: 'headband', label: 'Băng đô', icon: '🎀', unlockLevel: 1 },
];

const OUTFITS: ItemOption<OutfitType>[] = [
  { id: 'default', label: 'Mặc định', icon: '👕', unlockLevel: 1 },
  { id: 'school_uniform', label: 'Đồng phục', icon: '👔', unlockLevel: 1 },
  { id: 'hoodie', label: 'Áo Hoodie', icon: '🧥', unlockLevel: 1 },
  { id: 'jersey', label: 'Áo bóng rổ', icon: '🎽', unlockLevel: 1 },
  { id: 'wizard_robe', label: 'Áo phù thủy', icon: '🧙', unlockLevel: 1 },
];

const WINGS: ItemOption<WingsType>[] = [
  { id: 'none', label: 'Không cánh', icon: '🚫', unlockLevel: 1 },
  { id: 'angel', label: 'Thiên thần', icon: '🕊️', unlockLevel: 1 },
  { id: 'bat', label: 'Tiểu quỷ', icon: '🦇', unlockLevel: 1 },
];

const HELDS: ItemOption<HeldType>[] = [
  { id: 'none', label: 'Tay không', icon: '🚫', unlockLevel: 1 },
  { id: 'pencil', label: 'Bút chì to', icon: '✏️', unlockLevel: 1 },
  { id: 'wand', label: 'Đũa thần', icon: '⭐', unlockLevel: 1 },
];

const GLASSES: ItemOption<GlassesType>[] = [
  { id: 'none', label: 'Không đeo', icon: '🚫', unlockLevel: 1 },
  { id: 'glasses', label: 'Kính cận', icon: '👓', unlockLevel: 1 },
  { id: 'sunglasses', label: 'Kính râm', icon: '🕶️', unlockLevel: 1 },
  { id: 'blush_star', label: 'Má sao', icon: '⭐', unlockLevel: 1 },
];

type CustomTab = 'base' | 'headwear' | 'outfit' | 'wings' | 'held' | 'glasses' | 'color';

/**
 * Component Tùy biến Avatar và Trang phục học sinh
 * Hỗ trợ giao diện chọn trực quan trên cả điện thoại (1 cột) và máy tính (2 cột)
 */
export const AvatarCustomizer: React.FC<AvatarCustomizerProps> = ({
  currentConfig,
  studentLevel = 1,
  onSave,
  onCancel,
  isSaving = false,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<CustomTab>('base');
  const [draftConfig, setDraftConfig] = useState<AvatarConfig>({
    base: currentConfig?.base || 'cat',
    color: currentConfig?.color || '#4F8CFF',
    headwear: currentConfig?.headwear || 'none',
    glasses: currentConfig?.glasses || 'none',
    outfit: currentConfig?.outfit || 'default',
    wings: currentConfig?.wings || 'none',
    held: currentConfig?.held || 'none',
  });

  const handleRandomize = () => {
    const randomPick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!;
    setDraftConfig({
      base: randomPick(BASES).id,
      color: randomPick(COLORS).hex,
      headwear: randomPick(HEADWEARS).id,
      outfit: randomPick(OUTFITS).id,
      wings: randomPick(WINGS).id,
      held: randomPick(HELDS).id,
      glasses: randomPick(GLASSES).id,
    });
  };

  const tabsRef = useRef<HTMLDivElement>(null);
  const handleScrollTabs = (amount: number) => {
    tabsRef.current?.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const handleSave = () => {
    if (onSave) {
      onSave(draftConfig);
    }
  };

  return (
    <div
      className={`educlass-avatar-customizer flex flex-col md:flex-row gap-5 max-w-2xl mx-auto p-4 bg-white rounded-2xl shadow-md ${className}`}
      style={{ fontFamily: UI_TYPOGRAPHY.fontFamily }}
    >
      {/* CỘT TRÁI: Khung Preview Avatar & Nút ngẫu nhiên */}
      <div className="flex flex-col items-center justify-center p-5 bg-amber-50/60 rounded-2xl border border-amber-100 shrink-0 md:w-56">
        <div className="relative group">
          <StudentAvatar config={draftConfig} size="2xl" showBorder />
        </div>
        <span className="mt-2 text-xs font-bold text-slate-600">Xem trước diện mạo</span>

        <button
          type="button"
          onClick={handleRandomize}
          className="mt-3 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-amber-200 text-amber-800 text-xs font-bold rounded-full shadow-xs hover:bg-amber-100/50 active:scale-95 transition-all cursor-pointer"
        >
          <span>🎲</span>
          <span>Đổi ngẫu nhiên</span>
        </button>
      </div>

      {/* CỘT PHẢI: Tabs + Lưới chọn đồ + Nút hành động */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Thanh chuyển đổi danh mục Tab (Vùng chạm >= 48px) */}
        <div className="flex items-center gap-1 mb-1">
          <button
            type="button"
            onClick={() => handleScrollTabs(-120)}
            className="w-7 h-7 shrink-0 rounded-full bg-white border border-slate-300 text-slate-600 text-xs font-bold flex items-center justify-center hover:bg-slate-100 hover:text-blue-600 cursor-pointer shadow-xs transition-all active:scale-95"
            aria-label="Cuộn trái"
            title="Xem danh mục trước"
          >
            ❮
          </button>
          <div
            ref={tabsRef}
            className="flex-1 flex overflow-x-auto gap-1.5 p-1 bg-slate-100 rounded-xl no-scrollbar scroll-smooth"
          >
            {(
              [
                { id: 'base', label: 'Nhân vật', icon: '🐻' },
                { id: 'headwear', label: 'Mũ nón', icon: '🧢' },
                { id: 'outfit', label: 'Trang phục', icon: '👕' },
                { id: 'wings', label: 'Đôi cánh', icon: '🕊️' },
                { id: 'held', label: 'Cầm tay', icon: '✨' },
                { id: 'glasses', label: 'Kính mắt', icon: '👓' },
                { id: 'color', label: 'Màu sắc', icon: '🎨' },
              ] as const
            ).map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-h-[44px] px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1 shrink-0 ${
                    isActive
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => handleScrollTabs(120)}
            className="w-7 h-7 shrink-0 rounded-full bg-white border border-slate-300 text-slate-600 text-xs font-bold flex items-center justify-center hover:bg-slate-100 hover:text-blue-600 cursor-pointer shadow-xs transition-all active:scale-95"
            aria-label="Cuộn phải"
            title="Xem danh mục tiếp theo"
          >
            ❯
          </button>
        </div>

        {/* Nội dung danh mục được chọn */}
        <div className="flex-1 min-h-[170px] max-h-[220px] overflow-y-auto py-2.5 px-0.5">
          {/* TAB 1: NHÂN VẬT */}
          {activeTab === 'base' && (
            <div className="grid grid-cols-4 gap-2">
              {BASES.map(item => {
                const isSelected = draftConfig.base === item.id;
                const isLocked = studentLevel < item.unlockLevel;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isLocked}
                    title={isLocked ? `Cần đạt Cấp độ ${item.unlockLevel}` : item.label}
                    onClick={() =>
                      !isLocked && setDraftConfig(prev => ({ ...prev, base: item.id }))
                    }
                    className={`min-h-[56px] flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all ${
                      isLocked ? 'opacity-40 cursor-not-allowed bg-slate-100' : 'cursor-pointer'
                    } ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-400'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xl mb-0.5">{item.icon}</span>
                    <span className="text-[11px] font-bold text-slate-800">{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 2: MŨ NÓN */}
          {activeTab === 'headwear' && (
            <div className="grid grid-cols-3 gap-2">
              {HEADWEARS.map(item => {
                const isSelected = draftConfig.headwear === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDraftConfig(prev => ({ ...prev, headwear: item.id }))}
                    className={`min-h-[50px] flex items-center justify-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-400'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-xs font-bold text-slate-800">{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 3: TRANG PHỤC */}
          {activeTab === 'outfit' && (
            <div className="grid grid-cols-3 gap-2">
              {OUTFITS.map(item => {
                const isSelected = draftConfig.outfit === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDraftConfig(prev => ({ ...prev, outfit: item.id }))}
                    className={`min-h-[50px] flex items-center justify-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-400'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-xs font-bold text-slate-800">{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 4: ĐÔI CÁNH */}
          {activeTab === 'wings' && (
            <div className="grid grid-cols-3 gap-2">
              {WINGS.map(item => {
                const isSelected = draftConfig.wings === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDraftConfig(prev => ({ ...prev, wings: item.id }))}
                    className={`min-h-[50px] flex items-center justify-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-400'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-xs font-bold text-slate-800">{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 5: ĐẠO CỤ CẦM TAY */}
          {activeTab === 'held' && (
            <div className="grid grid-cols-3 gap-2">
              {HELDS.map(item => {
                const isSelected = draftConfig.held === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDraftConfig(prev => ({ ...prev, held: item.id }))}
                    className={`min-h-[50px] flex items-center justify-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-400'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-xs font-bold text-slate-800">{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 6: KÍNH MẮT */}
          {activeTab === 'glasses' && (
            <div className="grid grid-cols-2 gap-2">
              {GLASSES.map(item => {
                const isSelected = draftConfig.glasses === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDraftConfig(prev => ({ ...prev, glasses: item.id }))}
                    className={`min-h-[48px] flex items-center justify-center gap-2 p-2 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-400'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-xs font-bold text-slate-800">{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 7: MÀU NỀN */}
          {activeTab === 'color' && (
            <div className="grid grid-cols-4 gap-2.5">
              {COLORS.map(col => {
                const isSelected = draftConfig.color === col.hex;
                return (
                  <button
                    key={col.hex}
                    type="button"
                    onClick={() => setDraftConfig(prev => ({ ...prev, color: col.hex }))}
                    className={`min-h-[44px] flex items-center justify-center gap-1.5 p-1.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-blue-500 border-transparent shadow-xs'
                        : 'border-slate-200'
                    }`}
                    style={{ backgroundColor: `${col.hex}15` }}
                  >
                    <div
                      className="w-4 h-4 rounded-full border border-white shadow-xs shrink-0"
                      style={{ backgroundColor: col.hex }}
                    />
                    <span className="text-[11px] font-semibold text-slate-700">{col.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Nút hành động Lưu & Đóng */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 mt-auto">
          {onCancel && (
            <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
              Đóng
            </Button>
          )}
          <Button variant="primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Đang lưu...' : 'Lưu diện mạo'}
          </Button>
        </div>
      </div>
    </div>
  );
};
