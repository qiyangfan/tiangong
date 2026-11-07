/**
 * 错误码单一来源：字符串错误码 + HTTP 状态映射 + 默认英文文案。
 * 规则（API_CONTRACT）：错误码稳定不变；message 为英文默认文案，展示层可按需本地化。
 * 命名：域名_原因，全大写蛇形。
 */

export const ERROR_CODES = {
  // 通用
  VALIDATION_ERROR: { status: 400, message: 'Request validation failed' },
  NOT_FOUND: { status: 404, message: 'Resource not found' },
  CONFLICT: { status: 409, message: 'Resource conflict' },
  INTERNAL_ERROR: { status: 500, message: 'Internal server error' },
  NOT_IMPLEMENTED: { status: 501, message: 'Not implemented' },

  // 认证
  AUTH_INVALID_CREDENTIALS: { status: 401, message: 'Invalid username or password' },
  AUTH_UNAUTHENTICATED: { status: 401, message: 'Authentication required' },
  AUTH_TOKEN_INVALID: { status: 401, message: 'Token is invalid' },
  AUTH_TOKEN_EXPIRED: { status: 401, message: 'Token has expired' },
  AUTH_REFRESH_INVALID: { status: 401, message: 'Refresh token is invalid or revoked' },
  AUTH_FORBIDDEN: { status: 403, message: 'Permission denied' },
  AUTH_ACCOUNT_DISABLED: { status: 403, message: 'Account is disabled' },
  AUTH_ACCOUNT_LOCKED: { status: 423, message: 'Account is locked due to repeated failed logins' },
  AUTH_RATE_LIMITED: { status: 429, message: 'Too many requests, please retry later' },
  AUTH_PASSWORD_WEAK: { status: 400, message: 'Password does not meet complexity requirements' },
  AUTH_PASSWORD_MISMATCH: { status: 400, message: 'Current password is incorrect' },
  AUTH_PASSWORD_SAME: { status: 400, message: 'New password must differ from the current one' },

  // 用户
  USER_NOT_FOUND: { status: 404, message: 'User not found' },
  USER_USERNAME_TAKEN: { status: 409, message: 'Username already exists' },
  USER_EMAIL_TAKEN: { status: 409, message: 'Email already exists' },

  // 角色
  ROLE_NOT_FOUND: { status: 404, message: 'Role not found' },
  ROLE_KEY_TAKEN: { status: 409, message: 'Role key already exists' },
  ROLE_BUILTIN_UNASSIGNABLE: { status: 400, message: 'Built-in role cannot be modified this way' },

  // 权限
  PERMISSION_NOT_FOUND: { status: 404, message: 'Permission not found' },
  PERMISSION_TAKEN: { status: 409, message: 'Permission already exists' },

  // 菜单
  MENU_NOT_FOUND: { status: 404, message: 'Menu not found' },
  MENU_CYCLE: { status: 400, message: 'Menu parent would create a cycle' },

  // 字典
  DICT_TYPE_NOT_FOUND: { status: 404, message: 'Dict type not found' },
  DICT_KEY_TAKEN: { status: 409, message: 'Dict key already exists' },
  DICT_ITEM_NOT_FOUND: { status: 404, message: 'Dict item not found' },
  DICT_VALUE_TAKEN: { status: 409, message: 'Dict value already exists in this type' },

  // 参数
  SETTING_NOT_FOUND: { status: 404, message: 'Setting not found' },
  SETTING_KEY_TAKEN: { status: 409, message: 'Setting key already exists' },
  SETTING_IMMUTABLE: { status: 400, message: 'Built-in setting cannot be modified this way' },

  // 文件
  FILE_NOT_FOUND: { status: 404, message: 'File not found' },
  FILE_TOO_LARGE: { status: 413, message: 'File exceeds the size limit' },
  FILE_TYPE_REJECTED: { status: 415, message: 'File type is not allowed' },

  // 示例实体
  SAMPLE_NOT_FOUND: { status: 404, message: 'Sample record not found' },

  // 代码生成器
  GEN_DEFINITION_NOT_FOUND: { status: 404, message: 'Generator definition not found' },
  GEN_NAME_TAKEN: { status: 409, message: 'Generator definition name already exists' },
  GEN_NAME_INVALID: { status: 400, message: 'Module name must be kebab-case' },
  GEN_FIELD_INVALID: { status: 400, message: 'Field definition is invalid' },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

/** 错误码元信息（HTTP 状态 + 默认文案）。 */
export interface ErrorCodeMeta {
  status: number;
  message: string;
}

/** 由错误码取元信息；未知码回落 INTERNAL_ERROR。 */
export function errorMeta(code: string): ErrorCodeMeta {
  const meta = ERROR_CODES[code as ErrorCode];
  return meta ?? ERROR_CODES.INTERNAL_ERROR;
}
