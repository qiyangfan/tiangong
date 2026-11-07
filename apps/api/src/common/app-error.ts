import { errorMeta, type ErrorCode } from '@tiangong/contracts';

/**
 * 业务错误：携带契约错误码；异常过滤器据此生成统一错误 envelope。
 * message 缺省时取错误码默认英文文案。
 */
export class AppError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message?: string) {
    super(message ?? errorMeta(code).message);
    this.code = code;
    this.name = 'AppError';
  }
}
