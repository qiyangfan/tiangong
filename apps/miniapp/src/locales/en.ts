import type zhCN from './zh-CN';

/** en 为骨架翻译；键结构必须与 zh-CN 完全一致（类型约束）。 */
const en: typeof zhCN = {
  nav: {
    login: 'Sign In',
    sample: 'Sample Data',
    mine: 'Mine',
  },
  common: {
    opSuccess: 'Operation succeeded',
    requestFailed: 'Request failed',
    unexpectedError: 'Something went wrong. Please try again later.',
    confirmDelete: 'Delete this record? This cannot be undone.',
    tip: 'Notice',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    loading: 'Loading…',
    noData: 'No data',
    enabled: 'Enabled',
    disabled: 'Disabled',
  },
  session: {
    expired: 'Session expired, please sign in again',
    disabled: 'Account is disabled, contact the administrator',
  },
  errors: {
    VALIDATION_ERROR: 'Invalid input',
    NOT_FOUND: 'Data not found',
    CONFLICT: 'Data conflict, please refresh and retry',
    INTERNAL_ERROR: 'Server error, please retry later',
    AUTH_INVALID_CREDENTIALS: 'Incorrect username or password',
    AUTH_FORBIDDEN: 'You do not have permission to perform this action',
    AUTH_ACCOUNT_DISABLED: 'Account is disabled, contact the administrator',
    AUTH_ACCOUNT_LOCKED: 'Too many failures, account temporarily locked. Try again later',
    AUTH_RATE_LIMITED: 'Too many requests, please retry later',
    SAMPLE_NOT_FOUND: 'Sample record not found',
    NETWORK_ERROR: 'Network unavailable, please retry later',
  },
  login: {
    title: 'Tiangong',
    subtitle: 'Universal admin starter · Mobile',
    usernamePlaceholder: 'Username',
    passwordPlaceholder: 'Password',
    loginBtn: 'Sign in',
    loggingIn: 'Signing in…',
    loginFailed: 'Sign in failed',
  },
  sample: {
    loadMore: 'Load more',
    create: 'Add Record',
    edit: 'Edit Record',
    namePlaceholder: 'Name (required)',
    amountPlaceholder: 'Amount (optional, e.g. 12.30)',
    amountLabel: 'Amount',
    enabledLabel: 'Enabled',
    invalidAmount: 'Invalid amount format',
    nameRequired: 'Please enter name',
  },
  mine: {
    language: 'Language',
    email: 'Email',
    createdAt: 'Created At',
    lastLoginAt: 'Last Login',
    logout: 'Sign out',
  },
};

export default en;
