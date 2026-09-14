import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsumerAuthService } from './consumer-auth.service';
import type { PrismaService } from './prisma.service';
import type { WechatLoginAdapter } from './wechat-login.adapter';
import { hashRefreshToken } from './auth-crypto';

describe('ConsumerAuthService sessions', () => {
  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = 'access-secret';
    process.env.REFRESH_TOKEN_SECRET = 'refresh-secret';
  });

  afterEach(() => {
    delete process.env.JWT_ACCESS_SECRET;
    delete process.env.REFRESH_TOKEN_SECRET;
  });

  it('rotates refresh sessions atomically', async () => {
    const oldToken = 'old-refresh-token-with-enough-length-123456';
    const oldHash = hashRefreshToken(oldToken, 'refresh-secret');
    const session = {
      id: 11n,
      consumerUserId: 7n,
      refreshTokenHash: oldHash,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    };

    const update = vi.fn().mockResolvedValue({});
    const create = vi.fn().mockResolvedValue({});
    const transaction = vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops));
    const prisma = {
      consumerSession: {
        findUnique: vi.fn().mockResolvedValue(session),
        update,
        create,
        updateMany: vi.fn(),
      },
      consumerUser: { findUnique: vi.fn().mockResolvedValue({ id: 7n, status: 'ACTIVE' }) },
      $transaction: transaction,
    } as unknown as PrismaService;

    const service = new ConsumerAuthService(prisma, {} as WechatLoginAdapter);
    const result = await service.refresh(oldToken, { ipAddress: '127.0.0.1' });

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).not.toBe(oldToken);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 11n } }));
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('revokes a refresh session on logout', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      consumerSession: { updateMany },
    } as unknown as PrismaService;

    const service = new ConsumerAuthService(prisma, {} as WechatLoginAdapter);
    await service.logout('logout-refresh-token-with-enough-length-123');

    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ revokedAt: null }),
    }));
  });
});
