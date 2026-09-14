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

    const { access, refresh } = this.secrets();
    const refreshToken = issueRefreshToken();
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
    await this.prisma.consumerSession.create({
      data: {
        consumerUserId: consumer.id,
        refreshTokenHash: hashRefreshToken(refreshToken, refresh),
        expiresAt,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });

    return {
      accessToken: signAccessToken({ sub: consumer.id.toString(), kind: 'consumer' }, access, ACCESS_TTL_SECONDS),
      refreshToken,
      expiresAt: expiresAt.toISOString(),
      consumer: { id: consumer.id.toString() },
    };
  }
}
