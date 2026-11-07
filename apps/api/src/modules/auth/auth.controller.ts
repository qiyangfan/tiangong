import {
  type ChangePasswordRequest,
  type LoginRequest,
  type LoginResponse,
  type Profile,
  type RefreshRequest,
  type RefreshResponse,
  type UpdateProfileRequest,
  type UserMenus,
  type UserPermissions,
  changePasswordRequestSchema,
  loginRequestSchema,
  refreshRequestSchema,
  updateProfileRequestSchema,
} from '@tiangong/contracts';
import { Body, Controller, Get, HttpCode, Patch, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import { Request, Response } from 'express';
import { AppError } from '../../common/app-error';
import { REFRESH_COOKIE } from '../../security/jwt.guard';
import { CurrentUser, type AuthenticatedUser } from '../../security/current-user.decorator';
import { Public } from '../../security/public.decorator';
import { MenusService } from '../menus/menus.service';
import { AuthService } from './auth.service';

const refreshCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/api/v1/auth',
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly menus: MenusService,
  ) {}

  /** 登录：Web 端 refresh 进 HttpOnly Cookie，小程序端经响应体返回。 */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: '账号密码登录' })
  async login(
    @Body(new ZodValidationPipe(loginRequestSchema)) body: LoginRequest,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const result = await this.auth.login(body, req.ip ?? '', req.header('x-request-id') ?? '-');
    if (body.client === 'web') {
      res.cookie(REFRESH_COOKIE, result.refreshToken, {
        ...refreshCookieOptions,
        maxAge: 7 * 24 * 3600 * 1000,
      });
      const { refreshToken: _omit, ...data } = result;
      return data;
    }
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: '刷新 access token（refresh 轮换）' })
  async refresh(
    @Body(new ZodValidationPipe(refreshRequestSchema)) body: RefreshRequest,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RefreshResponse> {
    const raw =
      body.client === 'web'
        ? (req.cookies?.[REFRESH_COOKIE] as string | undefined)
        : body.refreshToken;
    if (!raw) {
      throw new AppError('AUTH_REFRESH_INVALID');
    }
    const result = await this.auth.refresh(raw, body.client);
    if (body.client === 'web') {
      res.cookie(REFRESH_COOKIE, result.refreshToken, {
        ...refreshCookieOptions,
        maxAge: 7 * 24 * 3600 * 1000,
      });
      const { refreshToken: _omit, ...data } = result;
      return data;
    }
    return result;
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: '登出（吊销全部 refresh token）' })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    await this.auth.logout(raw ?? null, user.id);
    res.clearCookie(REFRESH_COOKIE, { path: refreshCookieOptions.path });
  }

  @Get('menus')
  @ApiBearerAuth()
  @ApiOperation({ summary: '当前用户导航菜单树（按权限过滤）' })
  async myMenus(@CurrentUser() user: AuthenticatedUser): Promise<UserMenus> {
    return this.menus.userMenuTree(user.permissions);
  }

  @Get('permissions')
  @ApiBearerAuth()
  @ApiOperation({ summary: '当前用户权限串集合（会话恢复后重建权限上下文）' })
  async myPermissions(@CurrentUser() user: AuthenticatedUser): Promise<UserPermissions> {
    return { permissions: user.permissions };
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: '个人中心' })
  async profile(@CurrentUser() user: AuthenticatedUser): Promise<Profile> {
    return this.auth.profile(user.id);
  }

  @Patch('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新个人资料' })
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateProfileRequestSchema))
    body: UpdateProfileRequest,
  ): Promise<Profile> {
    return this.auth.updateProfile(user.id, body);
  }

  @Post('change-password')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: '修改自己的密码（改密后全端下线）' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(changePasswordRequestSchema))
    body: ChangePasswordRequest,
  ): Promise<void> {
    await this.auth.changePassword(user.id, body);
  }
}
