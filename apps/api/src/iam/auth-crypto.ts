import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const PASSWORD_KEY_LENGTH = 64;

export type AccessTokenClaims = {
  sub: string;
  kind: 'consumer' | 'staff';
  permissions?: string[];
  dataScopes?: Array<'GLOBAL' | 'ASSIGNED_STORES' | 'SELF'>;
  assignedStoreIds?: string[];
  iat: number;
  exp: number;
};

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, salt, expectedHex] = encoded.split('$');
  if (algorithm !== 'scrypt' || !salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function hashRefreshToken(token: string, secret: string): string {
  return createHmac('sha256', secret).update(token).digest('hex');
}

export function issueRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

export function signAccessToken(
  claims: Omit<AccessTokenClaims, 'iat' | 'exp'>,
  secret: string,
  ttlSeconds = 900,
  nowSeconds = Math.floor(Date.now() / 1000),
): string {
  const header = base64UrlJson({ alg: 'HS256', typ: 'JWT' });
  const payload = base64UrlJson({ ...claims, iat: nowSeconds, exp: nowSeconds + ttlSeconds });
  const body = `${header}.${payload}`;
  const signature = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

export function verifyAccessToken(token: string, secret: string, nowSeconds = Math.floor(Date.now() / 1000)): AccessTokenClaims {
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) throw new Error('INVALID_TOKEN');
  const body = `${header}.${payload}`;
  const expected = createHmac('sha256', secret).update(body).digest();
  const actual = Buffer.from(signature, 'base64url');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new Error('INVALID_TOKEN');
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AccessTokenClaims;
  if (!claims.sub || !claims.kind || !claims.exp || claims.exp <= nowSeconds) throw new Error('TOKEN_EXPIRED');
  return claims;
}
