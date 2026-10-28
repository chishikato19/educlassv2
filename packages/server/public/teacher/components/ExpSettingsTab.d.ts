import React from 'react';
import type { RewardRuleDto, RewardRuleItemInput } from '@educlass/protocol';
export interface ExpSettingsTabProps {
    globalRules?: RewardRuleDto[] | undefined;
    teacherRules?: RewardRuleDto[] | undefined;
    effectiveRules?: RewardRuleDto[] | undefined;
    sessionCap?: number | null | undefined;
    activityCaps?: Record<string, number> | undefined;
    isLoading?: boolean | undefined;
    onSaveRules: (rules: RewardRuleItemInput[]) => Promise<void> | void;
    onResetRules: () => Promise<void> | void;
}
export declare const ExpSettingsTab: React.FC<ExpSettingsTabProps>;
//# sourceMappingURL=ExpSettingsTab.d.ts.map