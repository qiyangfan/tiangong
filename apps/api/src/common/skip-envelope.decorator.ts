import { SetMetadata } from '@nestjs/common';

export const SKIP_ENVELOPE_METADATA = 'tiangong:skipEnvelope';

/** 跳过成功 envelope：仅用于自行写响应的端点（如 SSE）。 */
export const SkipEnvelope = () => SetMetadata(SKIP_ENVELOPE_METADATA, true);
