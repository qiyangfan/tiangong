import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiActionService } from './ai-action.service';
import { AiChatToolService } from './ai-chat-tool.service';
import { AiChatService } from './ai-chat.service';
import { AiConversationService } from './ai-conversation.service';
import { AiController } from './ai.controller';
import { AiServices, AiToolServices } from './ai-runtime';
import { AiSettingsService } from './ai-settings.service';
import { AiUserThrottleGuard } from './ai-user-throttle.guard';
import { ConfirmationService } from './confirmation/confirmation.service';
import { AI_PROVIDER } from './provider/ai-provider';
import { createAiProvider } from './provider/create-provider';
import { ToolCatalogService } from './tools/tool-catalog.service';
import { ToolExecutorService } from './tools/tool-executor.service';

@Module({
  controllers: [AiController],
  providers: [
    AiActionService,
    AiChatService,
    AiChatToolService,
    AiConversationService,
    AiServices,
    AiSettingsService,
    AiToolServices,
    AiUserThrottleGuard,
    ConfirmationService,
    ToolCatalogService,
    ToolExecutorService,
    {
      provide: AI_PROVIDER,
      inject: [ConfigService],
      useFactory: createAiProvider,
    },
  ],
  exports: [ToolCatalogService],
})
export class AiModule {}
