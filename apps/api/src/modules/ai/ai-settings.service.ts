import { Injectable, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppError } from '../../common/app-error';
import { loadSystemPrompt } from './prompts/system-prompt';

/** AI 开关与启动前置：关闭时不加载 provider 资产，开启时缺提示词即失败。 */
@Injectable()
export class AiSettingsService implements OnModuleInit {
  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    if (this.isEnabled()) {
      loadSystemPrompt();
    }
  }

  isEnabled(): boolean {
    return this.config.get<boolean>('AI_ENABLED') === true;
  }

  assertEnabled(): void {
    if (!this.isEnabled()) {
      throw new AppError('AI_DISABLED');
    }
  }
}
