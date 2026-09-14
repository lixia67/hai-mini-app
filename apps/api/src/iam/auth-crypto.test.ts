import { describe, expect, it } from 'vitest';
import { hashPassword, hashRefreshToken, issueRefreshToken, signAccessToken, verifyAccessToken, verifyPassword } from './auth-crypto';

describe('IAM crypto', () => {
  it('hashes and verifies passwords', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(hash).not.toContain('correct horse battery staple');
    await expect(verifyPassword('correct horse battery staple', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong', hash)).resolves.toBe(false);
  });

  it('issues opaque refresh tokens and stores only keyed hashes', () => {
    const token = issueRefreshToken();
    expect(token.length).toBeGreaterThan(30);
    expect(hashRefreshToken(token, 'refresh-secret')).not.toContain(token);
  });

  it('signs and verifies access tokens', () => {
    const token = signAccessToken({ sub: '42', kind: 'staff', permissions: ['inventory.read'], dataScopes: ['ASSIGNED_STORES'], assignedStoreIds: ['7'] }, 'jwt-secret', 60, 1000);
    const claims = verifyAccessToken(token, 'jwt-secret', 1010);
    expect(claims.sub).toBe('42');
    expect(claims.permissions).toContain('inventory.read');
    expect(claims.dataScopes).toContain('ASSIGNED_STORES');
  });

  it('rejects expired or tampered access tokens', () => {
    const token = signAccessToken({ sub: '1', kind: 'consumer' }, 'jwt-secret', 10, 1000);
    expect(() => verifyAccessToken(token, 'jwt-secret', 1011)).toThrow();
    expect(() => verifyAccessToken(`${token}x`, 'jwt-secret', 1001)).toThrow();
  });
});
