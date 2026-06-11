import { defaultRoles } from '../data/foundation';
import type { AppUser } from '../types/domain';

export const currentUser: AppUser = { id: 'local-owner', name: 'Owner', email: 'owner@example.com', role: 'Owner' };

export function permissionsForRole(roleName: string) {
  return defaultRoles.find((role) => role.name.toLowerCase() === roleName.toLowerCase())?.permissions ?? [];
}

export function hasPermission(user: Pick<AppUser, 'role' | 'permissions'> | null | undefined, permission: string) {
  if (!user) return false;
  const roleName = user.role?.toLowerCase();
  if (roleName === 'owner') return true;
  const permissions = [...permissionsForRole(user.role), ...(user.permissions ?? [])];
  if (permissions.includes('*')) return true;
  if (permissions.includes(permission)) return true;
  return false;
}

export function can(user: AppUser, permission: string) {
  return hasPermission(user, permission);
}
