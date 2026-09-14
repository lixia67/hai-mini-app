import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { hashRefreshToken, issueRefreshToken, signAccessToken } from './auth-crypto';
import { WechatLoginAdapter } from './wechat-login.adapter';

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type SessionMeta = { ipAddress?: string; userAgent?: string };

@Injectable()
export class ConsumerAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wechatLogin: WechatLoginAdapter,
  ) {}

  private secrets() {
    const access = process.env.JWT_ACCESS_SECRET;
    const refresh = process.env.REFRESH_TOKEN_SECRET;
    if (!access || !refresh) throw new Error('AUTH_SECRETS_NOT_CONFIGURED');
    return { access, refresh };
  }

  private async issueSession(consumerUserId: bigint, meta: SessionMeta = {}) {
    const { access, refresh } = this.secrets();
    const refreshToken = issueRefreshToken();
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

    await this.prisma.consumerSession.create({
      data: {
        consumerUserId,
        refreshTokenHash: hashRefreshToken(refreshToken, refresh),
        expiresAt,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });

    return {
      accessToken: signAccessToken({ sub: consumerUserId.toString(), kind: 'consumer' }, access, ACCESS_TTL_SECONDS),
      refreshToken,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async loginWithWechatCode(code: string, meta: SessionMeta = {}) {
    const identity = await this.wechatLogin.exchangeCode(code);
    if (!identity.openid) throw new UnauthorizedException('WeChat identity unavailable');

    const consumer = await this.prisma.consumerUser.upsert({
      where: { wechatOpenId: identity.openid },
      update: {
        wechatUnionId: identity.unionid,
        lastLoginAt: new Date(),
      },
      create: {
        wechatOpenId: identity.openid,
        wechatUnionId: identity.unionid,
        lastLoginAt: new Date(),
      },
    });
    if (consumer.status !== 'ACTIVE') throw new UnauthorizedException('Account unavailable');

    const session = await this.issueSession(consumer.id, meta);
    return { ...session, consumer: { id: consumer.id.toString() } };
  }

  async refresh(refreshToken: string, meta: SessionMeta = {}) {
    const { access, refresh } = this.secrets();
    const tokenHash = hashRefreshToken(refreshToken, refresh);
    const session = await this.prisma.consumerSession.findUnique({ where: { refreshTokenHash: tokenHash } });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const consumer = await this.prisma.consumerUser.findUnique({ where: { id: session.consumerUserId } });
    if (!consumer || consumer.status !== 'ACTIVE') throw new UnauthorizedException('Account unavailable');

    const nextRefreshToken = issueRefreshToken();
    const nextRefreshHash = hashRefreshToken(nextRefreshToken, refresh);
    const nextExpiresAt = new Date(Date.now() + REFRESH_TTL_MS);

    await this.prisma.$transaction([
      this.prisma.consumerSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } }),
      this.prisma.consumerSession.create({
        data: {
          consumerUserId: session.consumerUserId,
          refreshTokenHash: nextRefreshHash,
          expiresAt: nextExpiresAt,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        },
      }),
    ]);

    return {
      accessToken: signAccessToken({ sub: session.consumerUserId.toString(), kind: 'consumer' }, access, ACCESS_TTL_SECONDS),
      refreshToken: nextRefreshToken,
      expiresAt: nextExpiresAt.toISOString(),
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const { refresh } = this.secrets();
    const tokenHash = hashRefreshToken(refreshToken, refresh);
    await this.prisma.consumerSession.updateMany({
      where: { refreshTokenHash: tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
