import {
  aiConfirmRequestSchema,
  aiConversationCreateRequestSchema,
  aiMessageRequestSchema,
  type AiConfirmRequest,
  type AiConversationCreateRequest,
  type AiMessageRequest,
  idParamSchema,
} from '@tiangong/contracts';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiProduces, ApiTags } from '@nestjs/swagger';
import { type Request, type Response } from 'express';
import { ZodValidationPipe } from 'nestjs-zod';
import { SkipEnvelope } from '../../common/skip-envelope.decorator';
import { CurrentUser, type AuthenticatedUser } from '../../security/current-user.decorator';
import { RequirePermissions } from '../../security/require-permissions.decorator';
import { AiActionService } from './ai-action.service';
import { AiChatService } from './ai-chat.service';
import { AiServices } from './ai-runtime';
import { AI_CONFIRM_RATE_LIMIT, AI_MESSAGE_RATE_LIMIT } from './ai.constants';
import { AiThrottle } from './ai-user-throttle.guard';

type AiRequest = Request & { user?: AuthenticatedUser };

function accessTokenOf(req: Request): string {
  const header = req.headers.authorization;
  return header?.startsWith('Bearer ') === true ? header.slice('Bearer '.length) : '';
}

function userOf(req: AiRequest): AuthenticatedUser {
  if (!req.user) {
    throw new Error('AI route used outside authenticated context');
  }
  return req.user;
}

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(
    private readonly services: AiServices,
    private readonly chat: AiChatService,
    private readonly actions: AiActionService,
  ) {}

  @Get('status')
  @RequirePermissions('ai:chat')
  @ApiOperation({ summary: 'AI 入口开关状态' })
  status(): { enabled: boolean } {
    return { enabled: this.services.settings.isEnabled() };
  }

  @Post('conversations')
  @RequirePermissions('ai:chat')
  @ApiOperation({ summary: '创建 AI 会话' })
  createConversation(
    @Body(new ZodValidationPipe(aiConversationCreateRequestSchema))
    body: AiConversationCreateRequest,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.services.conversations.create(user.id, body.title);
  }

  @Get('conversations/:id')
  @RequirePermissions('ai:chat')
  @ApiOperation({ summary: '读取 AI 会话、消息与动作状态' })
  getConversation(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: number },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.services.conversations.get(params.id, user.id);
  }

  @Delete('conversations/:id')
  @RequirePermissions('ai:chat')
  @ApiOperation({ summary: '删除自己的 AI 会话及关联数据' })
  async removeConversation(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: number },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.services.conversations.delete(params.id, user.id);
  }

  @Post('conversations/:id/messages')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('ai:chat')
  @AiThrottle(AI_MESSAGE_RATE_LIMIT)
  @SkipEnvelope()
  @ApiProduces('text/event-stream')
  @ApiParam({ name: 'id', required: true, schema: { type: 'integer', minimum: 1 } })
  @ApiOperation({ summary: '发送消息，SSE 返回文本增量与动作草案' })
  async sendMessage(
    @Body(new ZodValidationPipe(aiMessageRequestSchema)) body: AiMessageRequest,
    @Req() req: AiRequest,
    @Res() res: Response,
  ): Promise<void> {
    const params = idParamSchema.parse(req.params);
    const prepared = await this.services.conversations.prepare(
      params.id,
      userOf(req).id,
      body.content,
    );
    const controller = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) {
        controller.abort();
      }
    });
    await this.chat.runMessage(prepared, {
      res,
      token: accessTokenOf(req),
      user: userOf(req),
      signal: controller.signal,
    });
  }

  @Post('actions/:id/confirm')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('ai:confirm')
  @AiThrottle(AI_CONFIRM_RATE_LIMIT)
  @ApiOperation({ summary: '凭一次性票据确认并执行非 GET 动作' })
  confirm(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: number },
    @Body(new ZodValidationPipe(aiConfirmRequestSchema)) body: AiConfirmRequest,
    @Req() req: AiRequest,
  ) {
    return this.actions.confirm({
      actionId: params.id,
      user: userOf(req),
      ticket: body.ticket,
      token: accessTokenOf(req),
    });
  }

  @Post('actions/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('ai:chat')
  @ApiOperation({ summary: '取消 AI 动作草案' })
  cancel(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: number },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.actions.cancel(params.id, user.id);
  }
}
