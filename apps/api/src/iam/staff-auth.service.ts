import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { hashRefreshToken, issueRefreshToken, signAccessToken, verifyPassword } from './auth-crypto';

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type SessionMeta = { ipAddress?: string; userAgent?: string };

type StaffAccess = {
  permissions: string[];
  dataScopes: Array<'GLOBAL' | 'ASSIGNED_STORES' | 'SELF'>;
  assignedStoreIds: string[];
};

@Injectable()
export class StaffAuthService {
  constructor(private readonly prisma: PrismaService) {}

  private secrets() {
    const access = process.env.JWT_ACCESS_SECRET;
    const refresh = process.env.REFRESH_TOKEN_SECRET;
    if (!access || !refresh) throw new Error('AUTH_SECRETS_NOT_CONFIGURED');
    return { access, refresh };
  }

  private async loadAccess(staffUserId: bigint): Promise<StaffAccess> {
    const staff = await this.prisma.staffUser.findUnique({
      where: { id: staffUserId },
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
        storeScopes: true,
      },
    });
    if (!staff || staff.status !== 'ACTIVE') throw new UnauthorizedException('Account unavailable');

    const permissions = new Set<string>();
    const dataScopes = new Set<'GLOBAL' | 'ASSIGNED_STORES' | 'SELF'>();
    for (const assignment of staff.roles) {
      dataScopes.add(assignment.role.dataScopeType);
      for (const item of assignment.role.permissions) permissions.add(item.permission.code);
    }
    if (dataScopes.size === 0) dataScopes.add('SELF');
    return {
      permissions: [...permissions],
      dataScopes: [...dataScopes],
      assignedStoreIds: staff.storeScopes.map((item) => item.storeId.toString()),
    };
  }

  private async createSessionRecord(staffUserId: bigint, meta: SessionMeta, refreshToken: string, refreshSecret: string) {
    const refreshTokenHash = hashRefreshToken(refreshToken, refreshSecret);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
    await this.prisma.staffSession.create({
      data: { staffUserId, refreshTokenHash, expiresAt, ipAddress: meta.ipAddress, userAgent: meta.userAgent },
    });
    return expiresAt;
  }

  private async issueSession(staffUserId: bigint, meta: SessionMeta) {
    const { access, refresh } = this.secrets();
    const accessContext = await this.loadAccess(staffUserId);
    const refreshToken = issueRefreshToken();
    const expiresAt = await this.createSessionRecord(staffUserId, meta, refreshToken, refresh);
    const accessToken = signAccessToken({ sub: staffUserId.toString(), kind: 'staff', ...accessContext }, access, ACCESS_TTL_SECONDS);
    return { accessToken, refreshToken, expiresAt: expiresAt.toISOString() };
  }

  async login(username: string, password: string, meta: SessionMeta = {}) {
    const staff = await this.prisma.staffUser.findUnique({ where: { username } });
    if (!staff || staff.status !== 'ACTIVE' || !(await verifyPassword(password, staff.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    await this.prisma.staffUser.update({ where: { id: staff.id }, data: { lastLoginAt: new Date() } });
    return this.issueSession(staff.id, meta);
  }

  async refresh(refreshToken: string, meta: SessionMeta = {}) {
    const { access, refresh } = this.secrets();
    const tokenHash = hashRefreshToken(refreshToken, refresh);
    const session = await this.prisma.staffSession.findUnique({ where: { refreshTokenHash: tokenHash } });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) throw new UnauthorizedException('Invalid refresh token');

    const accessContext = await this.loadAccess(session.staffUserId);
    const nextRefreshToken = issueRefreshToken();
    const nextRefreshHash = hashRefreshToken(nextRefreshToken, refresh);
    const nextExpiresAt = new Date(Date.now() + REFRESH_TTL_MS);

    await this.prisma.$transaction([
      this.prisma.staffSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } }),
      this.prisma.staffSession.create({
        data: {
          staffUserId: session.staffUserId,
          refreshTokenHash: nextRefreshHash,
          expiresAt: nextExpiresAt,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        },
      }),
    ]);

    const accessToken = signAccessToken({ sub: session.staffUserId.toString(), kind: 'staff', ...accessContext }, access, ACCESS_TTL_SECONDS);
    return { accessToken, refreshToken: nextRefreshToken, expiresAt: nextExpiresAt.toISOString() };
  }

  async logout(refreshToken: string): Promise<void> {
    const { refresh } = this.secrets();
    const tokenHash = hashRefreshToken(refreshToken, refresh);
    await this.prisma.staffSession.updateMany({
      where: { refreshTokenHash: tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
