import { ConfigService } from '@nestjs/config';
import { AppError } from '../../../common/app-error';
import type { AiProvider, ProviderDelta } from './ai-provider';
import { FakeProvider } from './fake.provider';
import { OpenAiCompatibleProvider } from './openai-compatible.provider';

/** AI 关闭时仍可装配的占位 provider；实际调用由 settings 先行拦截，这里 fail-closed。 */
class DisabledProvider implements AiProvider {
  chat(): AsyncIterable<ProviderDelta> {
    throw new AppError('AI_DISABLED');
  }
}

/** provider 选择单源：关闭时不读取 provider 配置，避免默认配置无法启动。 */
export function createAiProvider(config: ConfigService): AiProvider {
  if (config.get<boolean>('AI_ENABLED') !== true) {
    return new DisabledProvider();
  }
  if (config.get<string>('AI_PROVIDER') === 'fake') {
    return new FakeProvider();
  }
  return new OpenAiCompatibleProvider({
    baseUrl: config.getOrThrow<string>('AI_PROVIDER_BASE_URL'),
    apiKey: config.getOrThrow<string>('AI_PROVIDER_API_KEY'),
    model: config.getOrThrow<string>('AI_MODEL'),
    maxTokens: config.get<number>('AI_MAX_TOKENS') ?? 2048,
    timeoutMs: config.get<number>('AI_PROVIDER_TIMEOUT_MS') ?? 60_000,
  });
}
