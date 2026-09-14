import { describe, expect, it } from 'vitest';
import { authorize, canAccessResource, hasPermission, type StaffAccessContext } from './access-control';

function context(overrides: Partial<StaffAccessContext> = {}): StaffAccessContext {
  return {
    staffUserId: '10',
    permissions: new Set(['inventory.read']),
    dataScopes: ['SELF'],
    storeIds: new Set(),
    ...overrides,
  };
}

describe('access control', () => {
  it('requires an explicit permission', () => {
    expect(hasPermission(context(), 'inventory.read')).toBe(true);
    expect(hasPermission(context(), 'inventory.write')).toBe(false);
  });

  it('allows global data scope', () => {
    expect(canAccessResource(context({ dataScopes: ['GLOBAL'] }), { storeId: '99' })).toBe(true);
  });

  it('restricts assigned-store scope to assigned stores', () => {
    const staff = context({
      dataScopes: ['ASSIGNED_STORES'],
      storeIds: new Set(['1', '2']),
    });

    expect(canAccessResource(staff, { storeId: '2' })).toBe(true);
    expect(canAccessResource(staff, { storeId: '3' })).toBe(false);
  });

  it('restricts self scope to owned resources', () => {
    expect(canAccessResource(context(), { ownerStaffUserId: '10' })).toBe(true);
    expect(canAccessResource(context(), { ownerStaffUserId: '11' })).toBe(false);
  });

  it('requires both permission and data scope', () => {
    expect(authorize(context(), 'inventory.read', { ownerStaffUserId: '10' })).toBe(true);
    expect(authorize(context(), 'inventory.write', { ownerStaffUserId: '10' })).toBe(false);
  });
});
