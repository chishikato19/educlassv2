import { DB_MODULE_NAME } from '@educlass/db';
import { QUESTION_KIT_VERSION } from '@educlass/question-kit';

export * from './app.js';
export * from './auth/admin-service.js';
export * from './auth/auth-error.js';
export * from './auth/auth-service.js';
export * from './auth/owner-guard.js';
export * from './auth/password-hasher.js';
export * from './auth/plugin.js';
export * from './auth/token-service.js';
export * from './routes/admin.js';
export * from './routes/assets.js';
export * from './routes/auth.js';
export * from './routes/classes.js';
export * from './routes/health.js';
export * from './routes/question-sets.js';
export * from './routes/students.js';
export * from './routes/sessions.js';
export * from './routes/activities.js';
export * from './activity/registry.js';
export * from './activity/engine.js';
export * from './registry.js';
export * from './services/excel-service.js';
export * from './services/qr-service.js';
export * from './services/beacon-service.js';
export * from './static/serve-ui.js';
export * from './ws/gateway.js';

import { APP_VERSION } from '@educlass/protocol';

export const SERVER_NAME = 'educlass-server';

export function getServerStatus(): {
  server: string;
  db: string;
  qkVersion: number;
  version: string;
} {
  return {
    server: SERVER_NAME,
    db: DB_MODULE_NAME,
    qkVersion: QUESTION_KIT_VERSION,
    version: APP_VERSION,
  };
}
