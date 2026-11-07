import type { Request, Response, NextFunction } from 'express';

const OVERRIDABLE = new Set(['PATCH']);

/**
 * 微信小程序 wx.request 不支持 PATCH method：miniapp 以 POST + 本头改写。
 * 仅白名单方法可改写；无头时零行为变化，对外契约不受影响。
 */
export function methodOverrideMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const override = req.header('x-http-method-override');
  if (override && OVERRIDABLE.has(override.toUpperCase())) {
    req.method = override.toUpperCase();
  }
  next();
}
