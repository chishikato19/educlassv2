import type {
  AvatarBaseType,
  GlassesType,
  HeadwearType,
  OutfitType,
} from '@educlass/protocol';

export interface CostumeItem<T extends string = string> {
  id: T;
  type: 'base' | 'headwear' | 'glasses' | 'outfit';
  name: string;
  icon: string;
  description: string;
  unlockLevel: number;
  unlockTitleKey?: string | undefined;
}

/**
 * Danh mục các loại nhân vật cơ bản
 */
export const BASE_AVATARS: ReadonlyArray<CostumeItem<AvatarBaseType>> = [
  { id: 'cat', type: 'base', name: 'Mèo Thông Thái', icon: '🐱', description: 'Nhanh nhẹn và tò mò', unlockLevel: 1 },
  { id: 'fox', type: 'base', name: 'Cáo Nhanh Trí', icon: '🦊', description: 'Thông minh và nhạy bén', unlockLevel: 1 },
  { id: 'bear', type: 'base', name: 'Gấu Cần Cù', icon: '🐻', description: 'Kiên trì và vững chãi', unlockLevel: 1 },
  { id: 'owl', type: 'base', name: 'Cú Uyên Bác', icon: '🦉', description: 'Hiểu biết sâu rộng', unlockLevel: 2 },
  { id: 'rabbit', type: 'base', name: 'Thỏ Năng Động', icon: '🐰', description: 'Hoạt bát và vui vẻ', unlockLevel: 3 },
  { id: 'penguin', type: 'base', name: 'Cánh Cụt Khám Phá', icon: '🐧', description: 'Thích phiêu lưu học hỏi', unlockLevel: 4 },
  { id: 'robot', type: 'base', name: 'Robot Công Nghệ', icon: '🤖', description: 'Tính toán siêu tốc', unlockLevel: 6 },
  { id: 'dragon', type: 'base', name: 'Rồng Dũng Cảm', icon: '🐲', description: 'Quyền năng và tự tin', unlockLevel: 8 },
];

/**
 * Danh mục mũ nón / phụ kiện đầu
 */
export const HEADWEAR_ITEMS: ReadonlyArray<CostumeItem<HeadwearType>> = [
  { id: 'none', type: 'headwear', name: 'Không đội mũ', icon: '🚫', description: 'Tự nhiên đơn giản', unlockLevel: 1 },
  { id: 'cap', type: 'headwear', name: 'Mũ Lưỡi Trai', icon: '🧢', description: 'Trẻ trung, năng động', unlockLevel: 2 },
  { id: 'headband', type: 'headwear', name: 'Băng Đô Thể Thao', icon: '🎀', description: 'Tập trung cao độ', unlockLevel: 3 },
  { id: 'headphones', type: 'headwear', name: 'Tai Nghe Gamer', icon: '🎧', description: 'Đắm chìm vào bài học', unlockLevel: 5 },
  { id: 'grad_cap', type: 'headwear', name: 'Mũ Cử Nhân', icon: '🎓', description: 'Biểu tượng của học vị', unlockLevel: 7 },
  { id: 'crown', type: 'headwear', name: 'Vương Miện Hoàng Gia', icon: '👑', description: 'Dành cho bậc đại sư', unlockLevel: 10, unlockTitleKey: 'dai_su' },
];

/**
 * Danh mục kính mắt / phụ kiện mặt
 */
export const GLASSES_ITEMS: ReadonlyArray<CostumeItem<GlassesType>> = [
  { id: 'none', type: 'glasses', name: 'Không đeo kính', icon: '🚫', description: 'Khuôn mặt mộc tự nhiên', unlockLevel: 1 },
  { id: 'glasses', type: 'glasses', name: 'Kính Cận Tri Thức', icon: '👓', description: 'Chăm chỉ đọc sách', unlockLevel: 2 },
  { id: 'blush_star', type: 'glasses', name: 'Má Hồng Ngôi Sao', icon: '⭐', description: 'Dễ thương tỏa sáng', unlockLevel: 4 },
  { id: 'sunglasses', type: 'glasses', name: 'Kính Râm Cực Ngầu', icon: '🕶️', description: 'Phong cách và tự tin', unlockLevel: 6 },
];

/**
 * Danh mục trang phục thân
 */
export const OUTFIT_ITEMS: ReadonlyArray<CostumeItem<OutfitType>> = [
  { id: 'default', type: 'outfit', name: 'Áo Phông Cơ Bản', icon: '👕', description: 'Thoải mái mỗi ngày', unlockLevel: 1 },
  { id: 'school_uniform', type: 'outfit', name: 'Đồng Phục Học Sinh', icon: '👔', description: 'Nề nếp và lịch sự', unlockLevel: 2 },
  { id: 'hoodie', type: 'outfit', name: 'Áo Hoodie Ấm Áp', icon: '🧥', description: 'Cá tính và thời trang', unlockLevel: 4 },
  { id: 'jersey', type: 'outfit', name: 'Áo Đấu Số 10', icon: '🎽', description: 'Tinh thần đồng đội', unlockLevel: 6 },
  { id: 'wizard_robe', type: 'outfit', name: 'Áo Choàng Pháp Sư', icon: '🧙', description: 'Huyền bí và thông thái', unlockLevel: 9 },
];

/**
 * Kiểm tra xem một vật phẩm trang phục có được mở khóa theo cấp độ/danh hiệu không
 */
export function isCostumeUnlocked(
  item: { unlockLevel: number; unlockTitleKey?: string | undefined },
  currentLevel: number,
  unlockedTitleKeys: ReadonlyArray<string> = []
): boolean {
  if (currentLevel >= item.unlockLevel) {
    return true;
  }
  if (item.unlockTitleKey && unlockedTitleKeys.includes(item.unlockTitleKey)) {
    return true;
  }
  return false;
}
