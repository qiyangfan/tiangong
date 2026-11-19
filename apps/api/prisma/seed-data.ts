// 种子数据单源：权限点、菜单树、字典、系统参数；seed.ts 负责幂等落库。

/** 权限点定义：resource:action → 展示名。 */
export const PERMISSIONS: Array<[string, string, string]> = [
  ['system:user', 'list', '用户列表'],
  ['system:user', 'detail', '用户详情'],
  ['system:user', 'create', '新增用户'],
  ['system:user', 'update', '修改用户'],
  ['system:user', 'delete', '删除用户'],
  ['system:user', 'reset-password', '重置用户密码'],
  ['system:user', 'enable', '启停用户'],
  ['system:role', 'list', '角色列表'],
  ['system:role', 'detail', '角色详情'],
  ['system:role', 'create', '新增角色'],
  ['system:role', 'update', '修改角色'],
  ['system:role', 'delete', '删除角色'],
  ['system:menu', 'list', '菜单列表'],
  ['system:menu', 'create', '新增菜单'],
  ['system:menu', 'update', '修改菜单'],
  ['system:menu', 'delete', '删除菜单'],
  ['system:permission', 'list', '权限列表'],
  ['system:permission', 'create', '新增权限'],
  ['system:permission', 'update', '修改权限'],
  ['system:permission', 'delete', '删除权限'],
  ['system:dict', 'list', '字典列表'],
  ['system:dict', 'create', '新增字典'],
  ['system:dict', 'update', '修改字典'],
  ['system:dict', 'delete', '删除字典'],
  ['system:setting', 'list', '参数列表'],
  ['system:setting', 'create', '新增参数'],
  ['system:setting', 'update', '修改参数'],
  ['system:setting', 'delete', '删除参数'],
  ['audit:oper', 'list', '操作日志查询'],
  ['audit:login', 'list', '登录日志查询'],
  ['files', 'list', '文件列表'],
  ['files', 'upload', '上传文件'],
  ['files', 'delete', '删除文件'],
  ['sample', 'list', '示例数据列表'],
  ['sample', 'detail', '示例数据详情'],
  ['sample', 'create', '新增示例数据'],
  ['sample', 'update', '修改示例数据'],
  ['sample', 'delete', '删除示例数据'],
  ['gen', 'list', '生成器定义列表'],
  ['gen', 'detail', '生成器定义详情'],
  ['gen', 'create', '新增生成器定义'],
  ['gen', 'update', '修改生成器定义'],
  ['gen', 'delete', '删除生成器定义'],
  ['gen', 'preview', '生成器预览'],
];

export interface MenuSeed {
  key: string;
  parent?: string;
  name: string;
  menuType: 'M' | 'C' | 'F';
  path?: string;
  component?: string;
  perms?: string;
  icon?: string;
  sort: number;
}

export const MENUS: MenuSeed[] = [
  {
    key: 'dashboard',
    name: '仪表盘',
    menuType: 'C',
    path: '/dashboard',
    component: 'dashboard/index',
    icon: 'dashboard',
    sort: 0,
  },
  { key: 'system', name: '系统管理', menuType: 'M', path: '/system', icon: 'setting', sort: 10 },
  {
    key: 'system:user',
    parent: 'system',
    name: '用户管理',
    menuType: 'C',
    path: 'user',
    component: 'system/user/index',
    perms: 'system:user:list',
    sort: 1,
  },
  {
    key: 'system:user:add',
    parent: 'system:user',
    name: '用户新增',
    menuType: 'F',
    perms: 'system:user:create',
    sort: 1,
  },
  {
    key: 'system:user:edit',
    parent: 'system:user',
    name: '用户修改',
    menuType: 'F',
    perms: 'system:user:update',
    sort: 2,
  },
  {
    key: 'system:user:del',
    parent: 'system:user',
    name: '用户删除',
    menuType: 'F',
    perms: 'system:user:delete',
    sort: 3,
  },
  {
    key: 'system:role',
    parent: 'system',
    name: '角色管理',
    menuType: 'C',
    path: 'role',
    component: 'system/role/index',
    perms: 'system:role:list',
    sort: 2,
  },
  {
    key: 'system:menu',
    parent: 'system',
    name: '菜单管理',
    menuType: 'C',
    path: 'menu',
    component: 'system/menu/index',
    perms: 'system:menu:list',
    sort: 3,
  },
  {
    key: 'system:permission',
    parent: 'system',
    name: '权限管理',
    menuType: 'C',
    path: 'permission',
    component: 'system/permission/index',
    perms: 'system:permission:list',
    sort: 4,
  },
  {
    key: 'system:dict',
    parent: 'system',
    name: '字典管理',
    menuType: 'C',
    path: 'dict',
    component: 'system/dict/index',
    perms: 'system:dict:list',
    sort: 5,
  },
  {
    key: 'system:setting',
    parent: 'system',
    name: '系统参数',
    menuType: 'C',
    path: 'setting',
    component: 'system/setting/index',
    perms: 'system:setting:list',
    sort: 6,
  },
  {
    key: 'system:file',
    parent: 'system',
    name: '文件管理',
    menuType: 'C',
    path: 'file',
    component: 'system/file/index',
    perms: 'files:list',
    sort: 7,
  },
  { key: 'audit', name: '审计中心', menuType: 'M', path: '/audit', icon: 'log', sort: 20 },
  {
    key: 'audit:oper',
    parent: 'audit',
    name: '操作日志',
    menuType: 'C',
    path: 'oper-log',
    component: 'audit/oper-log/index',
    perms: 'audit:oper:list',
    sort: 1,
  },
  {
    key: 'audit:login',
    parent: 'audit',
    name: '登录日志',
    menuType: 'C',
    path: 'login-log',
    component: 'audit/login-log/index',
    perms: 'audit:login:list',
    sort: 2,
  },
  { key: 'dev', name: '开发工具', menuType: 'M', path: '/dev', icon: 'tool', sort: 30 },
  {
    key: 'dev:sample',
    parent: 'dev',
    name: '示例数据',
    menuType: 'C',
    path: 'sample',
    component: 'dev/sample/index',
    perms: 'sample:list',
    sort: 1,
  },
  {
    key: 'dev:gen',
    parent: 'dev',
    name: '代码生成',
    menuType: 'C',
    path: 'gen',
    component: 'dev/gen/index',
    perms: 'gen:list',
    sort: 2,
  },
];

export const DICTS: Array<{
  name: string;
  dictKey: string;
  items: Array<{
    label: string;
    value: string;
    tagType?: string;
    sort: number;
    isDefault?: boolean;
  }>;
}> = [
  {
    name: '用户性别',
    dictKey: 'sys_user_gender',
    items: [
      { label: '男', value: '0', tagType: 'primary', sort: 1, isDefault: true },
      { label: '女', value: '1', tagType: 'success', sort: 2 },
      { label: '未知', value: '2', tagType: 'info', sort: 3 },
    ],
  },
  {
    name: '是/否',
    dictKey: 'sys_yes_no',
    items: [
      { label: '是', value: 'true', tagType: 'primary', sort: 1, isDefault: true },
      { label: '否', value: 'false', tagType: 'info', sort: 2 },
    ],
  },
  {
    name: '操作业务类型',
    dictKey: 'sys_oper_type',
    items: [
      { label: '新增', value: 'insert', tagType: 'success', sort: 1 },
      { label: '修改', value: 'update', tagType: 'primary', sort: 2 },
      { label: '删除', value: 'delete', tagType: 'danger', sort: 3 },
      { label: '授权', value: 'grant', tagType: 'warning', sort: 4 },
      { label: '导出', value: 'export', tagType: 'info', sort: 5 },
      { label: '导入', value: 'import', tagType: 'info', sort: 6 },
      { label: '其他', value: 'other', tagType: 'info', sort: 9 },
    ],
  },
  {
    name: '示例分类',
    dictKey: 'sys_sample_category',
    items: [
      { label: '类别A', value: 'a', tagType: 'primary', sort: 1, isDefault: true },
      { label: '类别B', value: 'b', tagType: 'success', sort: 2 },
      { label: '类别C', value: 'c', tagType: 'warning', sort: 3 },
    ],
  },
];

export const SETTINGS: Array<{ name: string; settingKey: string; value: string; remark: string }> =
  [
    {
      name: '用户初始密码',
      settingKey: 'sys.user.initPassword',
      value: 'Init2026pw#dev',
      remark: '新建用户未指定密码时的初始密码（演示值，复用时必须修改）',
    },
    {
      name: '是否开启自注册',
      settingKey: 'sys.register.enabled',
      value: 'false',
      remark: '自注册默认关闭',
    },
    {
      name: '上传大小上限(MB)',
      settingKey: 'sys.file.maxSizeMb',
      value: '20',
      remark: '通用附件上传大小上限',
    },
    {
      name: '上传扩展名白名单',
      settingKey: 'sys.file.allowedExt',
      value: 'jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,zip,txt',
      remark: '逗号分隔，小写',
    },
  ];
