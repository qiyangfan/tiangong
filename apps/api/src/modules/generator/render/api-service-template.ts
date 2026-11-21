import { type GenRenderInput, convertedFields, pascalCase, searchableFields } from './naming';
import { orderedImports } from './ordered-imports';

/** Prisma Decimal/DateTime 字段的写入转换行。 */
function writeConvertLines(def: GenRenderInput): string {
  return convertedFields(def.fields)
    .map((f) =>
      f.type === 'decimal'
        ? `        ...(body.${f.name} === undefined ? {} : { ${f.name}: new Prisma.Decimal(body.${f.name}) }),`
        : `        ...(body.${f.name} === undefined ? {} : { ${f.name}: new Date(body.${f.name}) }),`,
    )
    .join('\n');
}

/** 更新时的解构剔除与转换（沿用 SampleRecord 的显式转换模式）。 */
function updateConvertLines(def: GenRenderInput): string {
  const converted = convertedFields(def.fields);
  if (converted.length === 0) {
    return '        ...body,';
  }
  const omit = converted.map((f) => f.name).join(', ');
  const lines = converted.map((f) =>
    f.type === 'decimal'
      ? `        ...(body.${f.name} === undefined ? {} : { ${f.name}: new Prisma.Decimal(body.${f.name}) }),`
      : `        ...(body.${f.name} === undefined ? {} : { ${f.name}: new Date(body.${f.name}) }),`,
  );
  return `        ...(({ ${omit}: _omit, ...rest }) => rest)(body),\n${lines.join('\n')}`;
}

/** 输出转换行（item 映射）。 */
function outputConvertLines(def: GenRenderInput): string {
  return convertedFields(def.fields)
    .map((f) =>
      f.type === 'decimal'
        ? `    ${f.name}: row.${f.name} ? row.${f.name}.toFixed(2) : null,`
        : `    ${f.name}: row.${f.name} ? row.${f.name}.toISOString() : null,`,
    )
    .join('\n');
}

function plainOutputLines(def: GenRenderInput): string {
  return def.fields
    .filter((f) => f.type !== 'decimal' && f.type !== 'datetime')
    .map((f) => `    ${f.name}: row.${f.name},`)
    .join('\n');
}

/** create data 中无需转换的透传行。 */
function plainCreateLines(def: GenRenderInput): string {
  return def.fields
    .filter((f) => f.type !== 'decimal' && f.type !== 'datetime')
    .map((f) => `        ${f.name}: body.${f.name},`)
    .join('\n');
}

function whereLines(def: GenRenderInput): string {
  const search = searchableFields(def.fields);
  if (search.length === 0) {
    return '    const where: Prisma.' + pascalCase(def.name) + 'WhereInput = {};';
  }
  const orLines = search
    .map((f) => `              { ${f.name}: { contains: query.keyword, mode: 'insensitive' } },`)
    .join('\n');
  return `    const where: Prisma.${pascalCase(def.name)}WhereInput = {
      ...(query.keyword
        ? {
            OR: [
${orLines}
            ],
          }
        : {}),
    };`;
}

/** service 产物 import（只含 service 用到的类型，防产物 lint 未用告警）。 */
function serviceImports(def: GenRenderInput): string {
  const imports = [
    `type Create${pascalCase(def.name)}Request`,
    'type PageResult',
    `type ${pascalCase(def.name)}Item`,
    `type ${pascalCase(def.name)}Query`,
    `type Update${pascalCase(def.name)}Request`,
  ];
  return orderedImports(imports);
}

function serviceHead(def: GenRenderInput, pascal: string): string {
  return `import {
  ${serviceImports(def)},
} from '@tiangong/contracts';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppError } from '../../common/app-error';
import { pageBounds, pageResult } from '../../common/pagination';
import { PrismaService } from '../../prisma/prisma.service';

/** ${def.displayName}：代码生成器产物（参照 SampleRecord 形态）。 */
@Injectable()
export class ${pascal}Service {
  constructor(private readonly prisma: PrismaService) {}

`;
}

function serviceList(def: GenRenderInput, pascal: string, table: string): string {
  return `  async list(query: ${pascal}Query): Promise<PageResult<${pascal}Item>> {
${whereLines(def)}
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.${table}.findMany({
        where,
        orderBy: { id: 'desc' },
        ...pageBounds(query),
      }),
      this.prisma.${table}.count({ where }),
    ]);
    return pageResult(rows.map(toItem), total, query);
  }

`;
}

function serviceDetail(def: GenRenderInput, pascal: string, table: string): string {
  return `  async detail(id: number): Promise<${pascal}Item> {
    const row = await this.prisma.${table}.findUnique({ where: { id } });
    if (!row) {
      throw new AppError('NOT_FOUND', '${def.displayName} not found');
    }
    return toItem(row);
  }

`;
}

function serviceCreate(def: GenRenderInput, pascal: string, table: string): string {
  return `  async create(body: Create${pascal}Request, userId: number): Promise<${pascal}Item> {
    const row = await this.prisma.${table}.create({
      data: {
${writeConvertLines(def)}
${plainCreateLines(def)}
        createdBy: userId,
      },
    });
    return toItem(row);
  }

`;
}

function serviceUpdate(def: GenRenderInput, pascal: string, table: string): string {
  return `  async update(id: number, body: Update${pascal}Request, userId: number): Promise<${pascal}Item> {
    await this.assertExists(id);
    const row = await this.prisma.${table}.update({
      where: { id },
      data: {
${updateConvertLines(def)}
        updatedBy: userId,
      },
    });
    return toItem(row);
  }

`;
}

function serviceRemove(def: GenRenderInput, pascal: string, table: string): string {
  return `  async remove(id: number): Promise<void> {
    await this.assertExists(id);
    await this.prisma.${table}.delete({ where: { id } });
  }

  private async assertExists(id: number): Promise<void> {
    const exists = await this.prisma.${table}.findUnique({ where: { id } });
    if (!exists) {
      throw new AppError('NOT_FOUND', '${def.displayName} not found');
    }
  }
}

`;
}

function serviceToItem(def: GenRenderInput, pascal: string): string {
  return `function toItem(row: ${pascal}): ${pascal}Item {
  return {
    id: row.id,
${plainOutputLines(def)}
${outputConvertLines(def)}
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
`;
}

/** NestJS service 产物。 */
export function renderService(def: GenRenderInput): string {
  const pascal = pascalCase(def.name);
  const table = def.name.replace(/-/g, '_');
  return [
    serviceHead(def, pascal),
    serviceList(def, pascal, table),
    serviceDetail(def, pascal, table),
    serviceCreate(def, pascal, table),
    serviceUpdate(def, pascal, table),
    serviceRemove(def, pascal, table),
    serviceToItem(def, pascal),
  ].join('');
}
