import type { PickerStudent } from '@educlass/protocol';

export type DuckRaceScenario =
  | 'comeback'
  | 'duel'
  | 'wire_to_wire'
  | 'chaos_pack'
  | 'triple_threat';

export interface DuckRaceScenarioInfo {
  id: DuckRaceScenario;
  name: string;
  description: string;
  badge: string;
}

export const DUCK_RACE_SCENARIOS: Record<DuckRaceScenario, DuckRaceScenarioInfo> = {
  comeback: {
    id: 'comeback',
    name: 'Cú lội ngược dòng thần thánh',
    description: 'Vịt chiến thắng xuất phát từ nhóm sau, bứt tốc thần sầu ở nửa cuối chặng đua!',
    badge: '⚡ Lội ngược dòng',
  },
  duel: {
    id: 'duel',
    name: 'Song mã tranh hùng (Photo Finish)',
    description: 'Hai chú vịt bứt tốp so kè sát nút từng centimet suốt chặng, cán đích trong gang tấc!',
    badge: '⚔️ Song mã tranh hùng',
  },
  wire_to_wire: {
    id: 'wire_to_wire',
    name: 'Ngôi sao cô độc — Bị bám đuổi gắt gao',
    description: 'Vịt chiến thắng dẫn đầu từ đầu và gồng mình bảo vệ ngôi vương trước đàn vịt bám đuổi!',
    badge: '🛡️ Bảo vệ ngôi đầu',
  },
  chaos_pack: {
    id: 'chaos_pack',
    name: 'Hỗn chiến bầy vịt (Chaos Sprint)',
    description: 'Cả đàn vịt chen chúc cuộn sóng xô đẩy nhau, chốt hạ chiến thắng ở những mét cuối!',
    badge: '🌪️ Hỗn chiến bầy vịt',
  },
  triple_threat: {
    id: 'triple_threat',
    name: 'Tam mã phân tranh (Triple Threat)',
    description: 'Ba chú vịt tạo thế chân vạc hoán đổi dẫn đầu liên tục, cán đích sát nút tích tắc!',
    badge: '🔱 Tam mã phân tranh',
  },
};

export interface DuckEntity {
  id: string;
  student: PickerStudent;
  displayName: string;
  isTarget: boolean;
  isRival: boolean;
  isRival2?: boolean;
  laneY: number;
  currentX: number;
  currentY: number;
  progress: number;
  speedMultiplier: number;
  bobPhase: number;
  bodyColor: number;
  wingColor: number;
  beakColor: number;
}

