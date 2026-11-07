import {
  camelCase,
  type GenRenderInput,
  convertedFields,
  pascalCase,
  searchableFields,
} from './naming';

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

function whereLines(def: GenRenderInput): string {
  const search = searchableFields(def.fields);
  if (search.length === 0) {
    return '    const where: Prisma.' + pascalCase(def.name) + 'WhereInput = {};';
  }
  const orLines = search.map((f) => `              { ${f.name}: { contains: query.keyword } },`).join('\n');
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

function contractImports(def: GenRenderInput): string {
  const imports = new Set<string>([
    `type Create${pascalCase(def.name)}Request`,
    `create${pascalCase(def.name)}RequestSchema`,
    'idParamSchema',
    `type ${pascalCase(def.name)}Item`,
    `type ${pascalCase(def.name)}Query`,
    `${camelCase(def.name)}QuerySchema`,
    `type Update${pascalCase(def.name)}Request`,
    `update${pascalCase(def.name)}RequestSchema`,
    'type PageResult',
  ]);
  return [...imports].sort().join(',\n  ');
}

/** NestJS service / controller / module 三件产物。 */
export function renderApiFiles(def: GenRenderInput): Array<{ path: string; content: string }> {
  const pascal = pascalCase(def.name);
  const underscore = def.name.replace(/-/g, '_');
  const service = `import {
  ${contractImports(def)},
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

  async list(query: ${pascal}Query): Promise<PageResult<${pascal}Item>> {
${whereLines(def)}
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.${underscore}.findMany({
        where,
        orderBy: { id: 'desc' },
        ...pageBounds(query),
      }),
      this.prisma.${underscore}.count({ where }),
    ]);
    return pageResult(rows.map(toItem), total, query);
  }

  async detail(id: number): Promise<${pascal}Item> {
    const row = await this.prisma.${underscore}.findUnique({ where: { id } });
    if (!row) {
      throw new AppError('NOT_FOUND', '${def.displayName} not found');
    }
    return toItem(row);
  }

  async create(body: Create${pascal}Request, userId: number): Promise<${pascal}Item> {
    const row = await this.prisma.${underscore}.create({
      data: {
${writeConvertLines(def)}
${plainCreateLines(def)}
        createdBy: userId,
      },
    });
    return toItem(row);
  }

  async update(id: number, body: Update${pascal}Request, userId: number): Promise<${pascal}Item> {
    await this.assertExists(id);
    const row = await this.prisma.${underscore}.update({
      where: { id },
      data: {
${updateConvertLines(def)}
        updatedBy: userId,
      },
    });
    return toItem(row);
  }

  async remove(id: number, userId: number): Promise<void> {
    await this.assertExists(id);
    await this.prisma.${underscore}.delete({ where: { id } });
  }

  private async assertExists(id: number): Promise<void> {
    const exists = await this.prisma.${underscore}.findUnique({ where: { id } });
    if (!exists) {
      throw new AppError('NOT_FOUND', '${def.displayName} not found');
    }
  }
}

function toItem(row: ${pascal}): ${pascal}Item {
  return {
    id: row.id,
${plainOutputLines(def)}
${outputConvertLines(def)}
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
`;

  const controller = `import {
  ${contractImports(def)},
} from '@tiangong/contracts';
import { Body, Controller, Delete, Get, Param, Put, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import { Audit } from '../../common/audit/audit.decorator';
import { CurrentUser, type AuthenticatedUser } from '../../security/current-user.decorator';
import { RequirePermissions } from '../../security/require-permissions.decorator';
import { ${pascal}Service } from './${def.name}.service';

@ApiTags('${def.name}')
@ApiBearerAuth()
@Controller('${def.name}')
export class ${pascal}Controller {
  constructor(private readonly ${def.name.replace(/-/g, '')}: ${pascal}Service) {}

  @Get()
  @RequirePermissions('${def.name}:list')
  @ApiOperation({ summary: '${def.displayName}分页列表' })
  async list(@Query(new ZodValidationPipe(${camelCase(def.name)}QuerySchema)) query: ${pascal}Query) {
    return this.${def.name.replace(/-/g, '')}.list(query);
  }

  @Get(':id')
  @RequirePermissions('${def.name}:detail')
  @ApiOperation({ summary: '${def.displayName}详情' })
  async detail(@Param(new ZodValidationPipe(idParamSchema)) params: { id: number }) {
    return this.${def.name.replace(/-/g, '')}.detail(params.id);
  }

  @Post()
  @RequirePermissions('${def.name}:create')
  @Audit('${def.displayName}', 'insert')
  @ApiOperation({ summary: '新增${def.displayName}' })
  async create(
    @Body(new ZodValidationPipe(create${pascal}RequestSchema)) body: Create${pascal}Request,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<${pascal}Item> {
    return this.${def.name.replace(/-/g, '')}.create(body, user.id);
  }

  @Put(':id')
  @RequirePermissions('${def.name}:update')
  @Audit('${def.displayName}', 'update')
  @ApiOperation({ summary: '修改${def.displayName}' })
  async update(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: number },
    @Body(new ZodValidationPipe(update${pascal}RequestSchema)) body: Update${pascal}Request,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<${pascal}Item> {
    return this.${def.name.replace(/-/g, '')}.update(params.id, body, user.id);
  }

  @Delete(':id')
  @RequirePermissions('${def.name}:delete')
  @Audit('${def.displayName}', 'delete')
  @ApiOperation({ summary: '删除${def.displayName}' })
  async remove(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: number },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.${def.name.replace(/-/g, '')}.remove(params.id, user.id);
  }
}
`;

  const module = `import { Module } from '@nestjs/common';
import { ${pascal}Controller } from './${def.name}.controller';
import { ${pascal}Service } from './${def.name}.service';

@Module({
  controllers: [${pascal}Controller],
  providers: [${pascal}Service],
})
export class ${pascal}Module {}
`;

  return [
    { path: `apps/api/src/modules/${def.name}/${def.name}.service.ts`, content: service },
    { path: `apps/api/src/modules/${def.name}/${def.name}.controller.ts`, content: controller },
    { path: `apps/api/src/modules/${def.name}/${def.name}.module.ts`, content: module },
  ];
}

/** create data 中无需转换的透传行。 */
function plainCreateLines(def: GenRenderInput): string {
  return def.fields
    .filter((f) => f.type !== 'decimal' && f.type !== 'datetime')
    .map((f) => `        ${f.name}: body.${f.name},`)
    .join('\n');
}
