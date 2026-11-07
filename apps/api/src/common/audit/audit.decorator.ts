import { BusinessType } from '@tiangong/contracts';
import { SetMetadata } from '@nestjs/common';

export const AUDIT_METADATA = 'tiangong:audit';

export interface AuditOptions {
  title: string;
  businessType: BusinessType;
}

/** 标注写操作以记录操作审计（参数/结果自动截断与脱敏）。 */
export const Audit = (title: string, businessType: BusinessType) =>
  SetMetadata(AUDIT_METADATA, { title, businessType });
