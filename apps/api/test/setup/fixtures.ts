/**
 * 集成测试夹具单源：账号、口令、角色与请求 body 集中于此，
 * 用例文件只引用常量与构造器，避免同一字面量在多处漂移。
 */
import { type GenDefinitionRequest, type SampleRecordItem } from '@tiangong/contracts';

export interface Credentials {
  username: string;
  password: string;
}

function credentials(username: string, password: string): Credentials {
  return { username, password };
}

export const ADMIN_USER = 'admin';
/** seed 读取 ADMIN_INITIAL_PASSWORD 生成超管口令；env 固定同一值后再被登录用例引用。 */
export const ADMIN_PASSWORD = 'TestAdmin1pw';
export const ADMIN_CREDENTIALS = credentials(ADMIN_USER, ADMIN_PASSWORD);

/** 零权限 fixture：角色/用户由 cleanup 整体删除。 */
export const NOPERM = {
  nickname: '无权限用户',
  roleKey: 'noperm_role',
} as const;
export const NOPERM_CREDENTIALS = credentials('noperm', 'Noperm123pw');

/** 错误密码用例的固定口令（与真实口令无关）。 */
export const WRONG_CREDENTIALS = credentials(ADMIN_USER, 'WrongPass1');

/** 审计用例写入的一次性角色。 */
export const AUDIT_ROLE_KEY = 'it_team';

/** 代码生成器用例的确定性定义（业务无关通用命名）。 */
export const EXECUTABLE_DEF: GenDefinitionRequest = {
  name: 'it-gen-item',
  displayName: '集成生成项',
  fields: [
    {
      name: 'title',
      label: '标题',
      type: 'string',
      required: true,
      enumOptions: [],
      inList: true,
      inForm: true,
      searchable: true,
    },
    {
      name: 'grade',
      label: '等级',
      type: 'enum',
      required: true,
      enumOptions: ['a', 'b'],
      inList: true,
      inForm: true,
      searchable: false,
    },
  ],
};

export const GEN_DEFINITION_NAME = EXECUTABLE_DEF.name;

/** 响应契约巡检的一次性探针键：cleanup 统一回收，保证失败后重跑幂等。 */
export const CONTRACT_PROBE = {
  dictKey: 'it_contract_probe',
  settingKey: 'it.contract.probe',
  genName: 'it-contract-probe',
  roleKey: 'it_contract_role',
} as const;

/** SampleRecord 生命周期用例的自有数据前缀，cleanup 按此前缀批量回收。 */
export const SAMPLE_SEED = 'it-';

/** SampleRecord 跨端闭环用例的独立前缀（与生命周期用例分开回收）。 */
export const SAMPLE_UX_SEED = 'ux-';

export const SAMPLE_CREATE_BODY: Pick<SampleRecordItem, 'category' | 'amount' | 'enabled'> = {
  category: 'a',
  amount: '12.30',
  enabled: true,
};

/** 已保存定义预览的产物路径定版（顺序即生成器输出顺序）。 */
export function expectedGenPaths(name: string): string[] {
  return [
    `packages/contracts/src/${name}.ts`,
    `apps/api/prisma/gen/${name}.model.prisma`,
    `apps/api/src/modules/${name}/${name}.service.ts`,
    `apps/api/src/modules/${name}/${name}.controller.ts`,
    `apps/api/src/modules/${name}/${name}.module.ts`,
    `apps/web/src/api/${name}.ts`,
    `apps/web/src/views/${name}/index.vue`,
  ];
}
