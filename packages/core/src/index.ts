import { ProtocolVersionSchema } from '@educlass/protocol';

export * from './auth/policy.js';
export * from './students/import-parser.js';
export * from './session/session-fsm.js';
export * from './session/join-code.js';
export * from './identity/identity-resolver.js';
export * from './levels/levels.js';
export * from './rewards/grant.js';
export * from './rewards/rules.js';
export * from './activity/types.js';
export * from './activity/validator.js';
export * from './gamification/costumes.js';
export * from './gamification/title-evaluator.js';
export * from './powerups/index.js';

export function checkCoreProtocolCompatibility(version: unknown): boolean {
  const result = ProtocolVersionSchema.safeParse(version);
  return result.success;
}

