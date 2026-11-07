import {
  createMenuRequestSchema,
  type CreateMenuRequest,
  type MenuNodeWithMeta,
  type MenuTree,
  type UpdateMenuRequest,
  updateMenuRequestSchema,
} from '@tiangong/contracts';
import { Body, Controller, Delete, Get, Param, Put, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import { Audit } from '../../common/audit/audit.decorator';
import { idParamSchema } from '@tiangong/contracts';
import { CurrentUser, type AuthenticatedUser } from '../../security/current-user.decorator';
import { RequirePermissions } from '../../security/require-permissions.decorator';
import { MenusService } from './menus.service';

@ApiTags('menus')
@ApiBearerAuth()
@Controller('menus')
export class MenusController {
  constructor(private readonly menus: MenusService) {}

  @Get()
  @RequirePermissions('system:menu:list')
  @ApiOperation({ summary: '全量菜单树（管理）' })
  async tree(): Promise<MenuTree> {
    return this.menus.tree();
  }

  @Post()
  @RequirePermissions('system:menu:create')
  @Audit('菜单管理', 'insert')
  @ApiOperation({ summary: '新增菜单' })
  async create(
    @Body(new ZodValidationPipe(createMenuRequestSchema)) body: CreateMenuRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MenuNodeWithMeta> {
    return this.menus.create(body, user.id);
  }

  @Put(':id')
  @RequirePermissions('system:menu:update')
  @Audit('菜单管理', 'update')
  @ApiOperation({ summary: '修改菜单' })
  async update(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: number },
    @Body(new ZodValidationPipe(updateMenuRequestSchema)) body: UpdateMenuRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MenuNodeWithMeta> {
    return this.menus.update(params.id, body, user.id);
  }

  @Delete(':id')
  @RequirePermissions('system:menu:delete')
  @Audit('菜单管理', 'delete')
  @ApiOperation({ summary: '删除菜单（须无子节点）' })
  async remove(@Param(new ZodValidationPipe(idParamSchema)) params: { id: number }): Promise<void> {
    await this.menus.remove(params.id);
  }
}
