import { ERROR_MESSAGES_VI, type ErrorCode } from '@educlass/protocol';

export class AuthError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message?: string,
    public readonly statusCode: number = 400
  ) {
    super(message ?? ERROR_MESSAGES_VI[code]);
    this.name = 'AuthError';
  }
}
