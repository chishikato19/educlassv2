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
export declare const PICKER_MODES: Record<RandomPickerModeId, PickerModeDefinition>;
export { BallEliminationMode, BalloonPopMode, CardFlipMode, DuckHuntMode, DuckRaceMode, EliminationGridMode, MagicDeckMode, MarbleRaceMode, MysteryBoxMode, NameRollerMode, RandomWelcomeStage, SlotMachineMode, };
//# sourceMappingURL=index.d.ts.map