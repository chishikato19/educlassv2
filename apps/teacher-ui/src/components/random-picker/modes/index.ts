import type { RandomPickerModeId } from '@educlass/protocol';
import type { RandomPickerModeProps } from '../types.js';
import { BallEliminationMode } from './BallEliminationMode.js';
import { BalloonPopMode } from './BalloonPopMode.js';
import { CardFlipMode } from './CardFlipMode.js';
import { DuckHuntMode } from './DuckHuntMode.js';
import { DuckRaceMode } from './DuckRaceMode.js';
import { EliminationGridMode } from './EliminationGridMode.js';
import { MagicDeckMode } from './MagicDeckMode.js';
import { MysteryBoxMode } from './MysteryBoxMode.js';
import { NameRollerMode } from './NameRollerMode.js';
import { SlotMachineMode } from './SlotMachineMode.js';
import { MarbleRaceMode } from './MarbleRaceMode.js';
import { RandomWelcomeStage } from './RandomWelcomeStage.js';

export interface PickerModeDefinition {
  id: RandomPickerModeId;
  name: string;
  description: string;
  component: React.FC<RandomPickerModeProps>;
}

export const PICKER_MODES: Record<RandomPickerModeId, PickerModeDefinition> = {
  random_mode: {
    id: 'random_mode',
    name: '🎲 Ngẫu nhiên',
    description: 'Bốc ngẫu nhiên một chế độ trò chơi khác nhau trong mỗi lượt quay',
    component: RandomWelcomeStage,
  },
  card_flip: {
    id: 'card_flip',
    name: '🃏 Lật thẻ bài',
    description: '5 lá bài úp mặt bí ẩn, click lật lá bài bất ngờ để gọi tên học sinh',
    component: CardFlipMode,
  },
  mystery_box: {
    id: 'mystery_box',
    name: '🎁 Hộp quà bí mật',
    description: 'Chọn 1 trong 3 hộp quà bí mật, 2 hộp phụ mở trước, hộp trúng mở sau cùng',
    component: MysteryBoxMode,
  },
  slot_machine: {
    id: 'slot_machine',
    name: '🎰 Máy quay số',
    description: 'Quay số hai chữ số theo phong cách máy kéo số arcade, lướt chậm dần',
    component: SlotMachineMode,
  },
  name_roller: {
    id: 'name_roller',
    name: '📜 Cuộn họ tên',
    description: '1 ô cửa sổ cuộn dải họ tên học sinh, tốc độ nhanh rồi chậm dần đầy hồi hộp',
    component: NameRollerMode,
  },
  balloon_pop: {
    id: 'balloon_pop',
    name: '🎈 Bắn bóng bay',
    description: 'Đàn bóng bay bồng bềnh nhiều màu sắc, bấm chọn 1 quả nổ tung hiện tên học sinh',
    component: BalloonPopMode,
  },
  magic_deck: {
    id: 'magic_deck',
    name: '🔮 Bộ bài ma thuật',
    description: 'Xào bộ bài ma thuật huyền bí, chia 9 lá ra lưới 3x3, chọn 1 lá lật mở',
    component: MagicDeckMode,
  },
  duck_race: {
    id: 'duck_race',
    name: '🦆 Đua vịt',
    description: 'Đàn vịt cao su bơi rẽ sóng kịch tính, 3 kịch bản đua, vịt đè lên nhau chân thực',
    component: DuckRaceMode,
  },
  duck_hunt: {
    id: 'duck_hunt',
    name: '🎯 Bắn vịt',
    description:
      'Trường bắn vịt hội chợ: Tâm ngắm lướt qua 5-10 chú vịt kịch tính trước khi nổ súng chốt hạ',
    component: DuckHuntMode,
  },
  elimination_grid: {
    id: 'elimination_grid',
    name: '⚔️ Đấu trường sinh tồn',
    description:
      'Tất cả học sinh xuất hiện trên các ô chữ nhật. Các ô biến mất dần: còn 5 ô -> còn 3 ô -> còn 1 ô chiến thắng!',
    component: EliminationGridMode,
  },
  ball_elimination: {
    id: 'ball_elimination',
    name: '💥 Dãy bóng số',
    description:
      '1 dãy 10 quả bóng đánh số lộn xộn 0-9, nổ biến mất ngẫu nhiên từng quả, còn 2 hoặc 1 quả ghép thành số thứ tự học sinh',
    component: BallEliminationMode,
  },
  wheel: {
    id: 'wheel',
    name: '🎡 Vòng quay kỳ diệu',
    description: 'Vòng quay tròn chọn học sinh ngẫu nhiên',
    component: CardFlipMode,
  },
  marble_race: {
    id: 'marble_race',
    name: '⚪ Đua bi rơi Pinball',
    description:
      'Mỗi học sinh là một viên bi rơi liên hoàn qua rừng đinh cản, cánh quạt xoay và máng trượt nghẹt thở',
    component: MarbleRaceMode,
  },
};

export {
  BallEliminationMode,
  BalloonPopMode,
  CardFlipMode,
  DuckHuntMode,
  DuckRaceMode,
  EliminationGridMode,
  MagicDeckMode,
  MarbleRaceMode,
  MysteryBoxMode,
  NameRollerMode,
  RandomWelcomeStage,
  SlotMachineMode,
};
