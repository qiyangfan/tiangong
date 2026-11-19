import { camelCase, type GenRenderInput, pascalCase } from './naming';
import { orderedImports } from './ordered-imports';

/** controller 产物 import（schema 与 idParamSchema 只在 controller 使用）。 */
function controllerImports(def: GenRenderInput): string {
  const imports = [
    `type Create${pascalCase(def.name)}Request`,
    `create${pascalCase(def.name)}RequestSchema`,
    'idParamSchema',
    `type ${pascalCase(def.name)}Item`,
    `type ${pascalCase(def.name)}Query`,
    `${camelCase(def.name)}QuerySchema`,
    `type Update${pascalCase(def.name)}Request`,
    `update${pascalCase(def.name)}RequestSchema`,
  ];
  return orderedImports(imports);
}

function controllerHead(def: GenRenderInput, pascal: string): string {
  return `import {
  ${controllerImports(def)},
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

`;
}

function controllerDetail(def: GenRenderInput): string {
  return `  @Get(':id')
  @RequirePermissions('${def.name}:detail')
  @ApiOperation({ summary: '${def.displayName}详情' })
  async detail(@Param(new ZodValidationPipe(idParamSchema)) params: { id: number }) {
    return this.${def.name.replace(/-/g, '')}.detail(params.id);
  }

`;
}

function controllerCreate(def: GenRenderInput, pascal: string): string {
  return `  @Post()
  @RequirePermissions('${def.name}:create')
  @Audit('${def.displayName}', 'insert')
  @ApiOperation({ summary: '新增${def.displayName}' })
  async create(
    @Body(new ZodValidationPipe(create${pascal}RequestSchema)) body: Create${pascal}Request,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<${pascal}Item> {
    return this.${def.name.replace(/-/g, '')}.create(body, user.id);
  }

`;
}

function controllerUpdate(def: GenRenderInput, pascal: string): string {
  return `  @Put(':id')
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

`;
}

function controllerDelete(def: GenRenderInput): string {
  return `  @Delete(':id')
  @RequirePermissions('${def.name}:delete')
  @Audit('${def.displayName}', 'delete')
  @ApiOperation({ summary: '删除${def.displayName}' })
  async remove(@Param(new ZodValidationPipe(idParamSchema)) params: { id: number }): Promise<void> {
    await this.${def.name.replace(/-/g, '')}.remove(params.id);
  }
}
`;
}

/** NestJS controller 产物。 */
export function renderController(def: GenRenderInput): string {
  const pascal = pascalCase(def.name);
  return [
    controllerHead(def, pascal),
    controllerDetail(def),
    controllerCreate(def, pascal),
    controllerUpdate(def, pascal),
    controllerDelete(def),
  ].join('');
}

/** NestJS module 产物。 */
export function renderModule(def: GenRenderInput): string {
  const pascal = pascalCase(def.name);
  return `import { Module } from '@nestjs/common';
import { ${pascal}Controller } from './${def.name}.controller';
import { ${pascal}Service } from './${def.name}.service';

@Module({
  controllers: [${pascal}Controller],
  providers: [${pascal}Service],
})
export class ${pascal}Module {}
`;
}
