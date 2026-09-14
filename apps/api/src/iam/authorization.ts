import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verifyAccessToken, type AccessTokenClaims } from './auth-crypto';
import { canAccessResource, hasPermission, type StaffAccessContext } from './access-control';

const REQUIRED_PERMISSION = 'required_permission';
const RESOURCE_SCOPE = 'resource_scope';

export const RequirePermission = (permission: string) => SetMetadata(REQUIRED_PERMISSION, permission);
export const RequireResourceScope = (scope: { storeIdParam?: string; ownerIdParam?: string }) => SetMetadata(RESOURCE_SCOPE, scope);

export type AuthenticatedRequest = {
  headers: Record<string, string | string[] | undefined>;
  params?: Record<string, string | undefined>;
  auth?: AccessTokenClaims;
};

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const rawHeader = request.headers.authorization;
    const authHeader = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException('Missing bearer token');
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new UnauthorizedException('Authentication is not configured');

    let claims: AccessTokenClaims;
    try { claims = verifyAccessToken(authHeader.slice(7), secret); }
    catch { throw new UnauthorizedException('Invalid or expired access token'); }
    request.auth = claims;

    const requiredPermission = this.reflector.getAllAndOverride<string | undefined>(REQUIRED_PERMISSION, [context.getHandler(), context.getClass()]);
    if (!requiredPermission) return true;
    if (claims.kind !== 'staff') throw new ForbiddenException('Staff identity required');

    const authz: StaffAccessContext = {
      staffUserId: claims.sub,
      permissions: new Set(claims.permissions ?? []),
      dataScopes: claims.dataScopes ?? ['SELF'],
      storeIds: new Set(claims.assignedStoreIds ?? []),
    };
    if (!hasPermission(authz, requiredPermission)) throw new ForbiddenException('Permission denied');

    const resourceScope = this.reflector.getAllAndOverride<{ storeIdParam?: string; ownerIdParam?: string } | undefined>(RESOURCE_SCOPE, [context.getHandler(), context.getClass()]);
    if (!resourceScope) return true;
    const storeId = resourceScope.storeIdParam ? request.params?.[resourceScope.storeIdParam] : undefined;
    const ownerStaffUserId = resourceScope.ownerIdParam ? request.params?.[resourceScope.ownerIdParam] : undefined;
    if (!canAccessResource(authz, { storeId, ownerStaffUserId })) throw new ForbiddenException('Resource outside data scope');
    return true;
  }
}
