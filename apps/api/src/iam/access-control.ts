export type DataScopeType = 'GLOBAL' | 'ASSIGNED_STORES' | 'SELF';

export interface StaffAccessContext {
  staffUserId: string;
  permissions: ReadonlySet<string>;
  dataScopes: readonly DataScopeType[];
  storeIds: ReadonlySet<string>;
}

export interface ResourceScope {
  ownerStaffUserId?: string;
  storeId?: string;
}

export function hasPermission(
  context: StaffAccessContext,
  permissionCode: string,
): boolean {
  return context.permissions.has(permissionCode);
}

export function canAccessResource(
  context: StaffAccessContext,
  scope: ResourceScope,
): boolean {
  if (context.dataScopes.includes('GLOBAL')) {
    return true;
  }

  if (
    context.dataScopes.includes('ASSIGNED_STORES') &&
    scope.storeId !== undefined &&
    context.storeIds.has(scope.storeId)
  ) {
    return true;
  }

  if (
    context.dataScopes.includes('SELF') &&
    scope.ownerStaffUserId !== undefined &&
    scope.ownerStaffUserId === context.staffUserId
  ) {
    return true;
  }

  return false;
}

export function authorize(
  context: StaffAccessContext,
  permissionCode: string,
  scope: ResourceScope,
): boolean {
  return hasPermission(context, permissionCode) && canAccessResource(context, scope);
}
