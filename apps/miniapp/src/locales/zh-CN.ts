/** zh-CN 为默认语言；en 键结构须与本文件一致（类型约束在 en.ts）。 */
const zhCN = {
  nav: {
    login: '登录',
    sample: '示例数据',
    mine: '我的',
  },
  common: {
    opSuccess: '操作成功',
    requestFailed: '请求失败',
    unexpectedError: '出错了，请稍后重试',
    confirmDelete: '确认删除该记录？删除后不可恢复。',
    tip: '提示',
    cancel: '取消',
    save: '保存',
    delete: '删除',
    loading: '加载中…',
    noData: '暂无数据',
    enabled: '启用',
    disabled: '停用',
  },
  session: {
    // 终局 401 的两类提示（与 web 层同措辞）：凭据丢失/刷新失败引导重登；账号被停用明示联系管理员
    expired: '登录状态已过期，请重新登录',
    disabled: '账号已被停用，请联系管理员',
  },
  /**
   * 错误码 → 用户文案：键 = 契约错误码 ∪ 客户端自有码（NETWORK_ERROR 由本端 request 层生成，
   * 不在服务端注册表）；未收录码回落服务端 message。展示文案归客户端所有，不与 web 共用键。
   * 终局 401 码（AUTH_UNAUTHENTICATED/AUTH_TOKEN_*）不进本组：提示按终局位置区分，见 session 组。
   */
  errors: {
    VALIDATION_ERROR: '输入内容不符合要求',
    NOT_FOUND: '数据不存在',
    CONFLICT: '数据冲突，请刷新后重试',
    INTERNAL_ERROR: '服务异常，请稍后重试',
    AUTH_INVALID_CREDENTIALS: '账号或密码错误',
    AUTH_FORBIDDEN: '没有执行该操作的权限',
    AUTH_ACCOUNT_DISABLED: '账号已被停用，请联系管理员',
    AUTH_ACCOUNT_LOCKED: '失败次数过多，账号已临时锁定，请稍后再试',
    AUTH_RATE_LIMITED: '请求过于频繁，请稍后再试',
    SAMPLE_NOT_FOUND: '示例数据不存在',
    NETWORK_ERROR: '网络不可用，请稍后重试',
  },
  login: {
    title: '天工',
    subtitle: '通用后台脚手架 · 移动端',
    usernamePlaceholder: '账号',
    passwordPlaceholder: '密码',
    loginBtn: '登录',
    loggingIn: '登录中…',
    loginFailed: '登录失败',
  },
  sample: {
    loadMore: '加载更多',
    create: '新增记录',
    edit: '修改记录',
    namePlaceholder: '名称（必填）',
    amountPlaceholder: '金额（可选，如 12.30）',
    amountLabel: '金额',
    enabledLabel: '启用',
    invalidAmount: '金额格式不正确',
    nameRequired: '请输入名称',
  },
  mine: {
    language: '语言',
    email: '邮箱',
    createdAt: '注册时间',
    lastLoginAt: '最近登录',
    logout: '退出登录',
  },
};

export default zhCN;
