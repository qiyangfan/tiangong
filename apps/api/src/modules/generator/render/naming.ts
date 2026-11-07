import type { GenFieldDef, GenDefinitionRequest } from '@tiangong/contracts';

/** kebab-case 模块名 → PascalCase（Prisma model 名 / 组件名 / 类型前缀）。 */
export function pascalCase(kebab: string): string {
  return kebab
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/** kebab-case 模块名 → lowerCamelCase（schema 变量等合法标识符）。 */
export function camelCase(kebab: string): string {
  const camel = kebab.replace(/-([a-z0-9])/g, (_m, c: string) => c.toUpperCase());
  return camel;
}

/** 生成 contracts schema 的字段行（请求/查询侧，写入态）。 */
export function requestFieldLine(field: GenFieldDef): string {
  const optional = field.required ? '' : '.optional()';
  switch (field.type) {
    case 'string':
      return `  ${field.name}: z.string().min(1).max(100)${optional},`;
    case 'text':
      return `  ${field.name}: z.string().min(1).max(2000)${optional},`;
    case 'integer':
      return `  ${field.name}: z.coerce.number().int()${optional},`;
    case 'decimal':
      return `  ${field.name}: decimalStringSchema${optional},`;
    case 'boolean':
      return `  ${field.name}: z.boolean().default(true),`;
    case 'enum': {
      const options = field.enumOptions.map((o) => `'${o}'`).join(', ');
      return `  ${field.name}: z.enum([${options}])${optional},`;
    }
    case 'datetime':
      return `  ${field.name}: isoDateTimeSchema${optional},`;
  }
}

/** 生成 contracts item schema 的字段行（输出侧，含可空语义）。 */
export function itemFieldLine(field: GenFieldDef): string {
  const nullable = field.required ? '' : '.nullable()';
  switch (field.type) {
    case 'string':
    case 'text':
    case 'enum':
      return `  ${field.name}: z.string()${nullable},`;
    case 'integer':
      return `  ${field.name}: z.number().int()${nullable},`;
    case 'decimal':
      return `  ${field.name}: decimalStringSchema${nullable},`;
    case 'boolean':
      return `  ${field.name}: z.boolean(),`;
    case 'datetime':
      return `  ${field.name}: isoDateTimeSchema${nullable},`;
  }
}

/** query 侧可搜索字段行（仅 string/text/enum 参与 like，其余类型忽略）。 */
export function searchableFields(fields: GenFieldDef[]): GenFieldDef[] {
  return fields.filter((f) => f.searchable && ['string', 'text', 'enum'].includes(f.type));
}

/** Prisma model 字段行。 */
export function prismaFieldLine(field: GenFieldDef): string {
  const q = field.required ? '' : '?';
  switch (field.type) {
    case 'string':
      return `  ${field.name}  String${q} @db.VarChar(100)`;
    case 'text':
      return `  ${field.name}  String${q} @db.Text`;
    case 'integer':
      return `  ${field.name}  Int${q}`;
    case 'decimal':
      return `  ${field.name}  Decimal${q} @db.Decimal(12, 2)`;
    case 'boolean':
      return `  ${field.name}  Boolean @default(true)`;
    case 'enum':
      return `  ${field.name}  String${q} @db.VarChar(50)`;
    case 'datetime':
      return `  ${field.name}  DateTime${q}`;
  }
}

/** 服务端需要显式类型转换的字段（Decimal / DateTime）。 */
export function convertedFields(fields: GenFieldDef[]): GenFieldDef[] {
  return fields.filter((f) => f.type === 'decimal' || f.type === 'datetime');
}

export interface GenRenderInput {
  name: string;
  displayName: string;
  fields: GenFieldDef[];
}

export type { GenDefinitionRequest };
