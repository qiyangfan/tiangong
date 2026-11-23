import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiConversationService } from './ai-conversation.service';
import { AiSettingsService } from './ai-settings.service';
import { ConfirmationService } from './confirmation/confirmation.service';
import { ToolCatalogService } from './tools/tool-catalog.service';
import { ToolExecutorService } from './tools/tool-executor.service';

/** AI 会话侧依赖聚合：把 3 个以上构造参数收敛为组合根，避免服务间互相持有长参数表。 */
@Injectable()
export class AiServices {
  constructor(
    readonly settings: AiSettingsService,
    readonly prisma: PrismaService,
    readonly conversations: AiConversationService,
  ) {}
}

/** 工具执行侧依赖聚合：目录、执行器与确认票据总是同时使用。 */
@Injectable()
export class AiToolServices {
  constructor(
    readonly catalog: ToolCatalogService,
    readonly executor: ToolExecutorService,
    readonly confirmation: ConfirmationService,
  ) {}
}
