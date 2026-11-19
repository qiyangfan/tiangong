import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { AppError } from '../../common/app-error';
import { PrismaService } from '../../prisma/prisma.service';

export interface IssuedTokens {
  accessToken: string;
  accessExpiresIn: number;
  refreshToken: string;
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** 双 token 签发、refresh 轮换与吊销。 */
@Injectable()
export class TokenService {
  private readonly accessTtl: number;
  private readonly refreshTtl: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.accessTtl = config.get<number>('ACCESS_TOKEN_TTL') ?? 900;
    this.refreshTtl = config.get<number>('REFRESH_TOKEN_TTL') ?? 604800;
  }

  async issue(userId: number, username: string, client: string): Promise<IssuedTokens> {
    const accessToken = await this.jwt.signAsync({ sub: userId, username, client });
    const refreshToken = randomBytes(32).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: sha256(refreshToken),
        userId,
        client,
        expiresAt: new Date(Date.now() + this.refreshTtl * 1000),
      },
    });
    return { accessToken, accessExpiresIn: this.accessTtl, refreshToken };
  }

  /** refresh 轮换：旧值吊销并登记替换。 */
  async rotate(rawToken: string, client: string): Promise<IssuedTokens> {
    const tokenHash = sha256(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt.getTime() < Date.now() ||
      !stored.user.enabled
    ) {
      throw new AppError('AUTH_REFRESH_INVALID');
    }
    const issued = await this.issue(stored.user.id, stored.user.username, client);
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), replacedByHash: sha256(issued.refreshToken) },
    });
    return issued;
  }

  /** 登出：吊销用户全部 refresh token；携带值额外按 hash 吊销。 */
  async revoke(rawToken: string | null, userId: number): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (rawToken) {
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: sha256(rawToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  }
}
