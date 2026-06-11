import { defaultRoles } from '../data/foundation';
import type { AppUser } from '../types/domain';

export const currentUser: AppUser = { id: 'local-owner', name: 'Owner', email: 'owner@example.com', role: 'Owner' };

export function permissionsForRole(roleName: string) {
  return defaultRoles.find((role) => role.name === roleName)?.permissions ?? [];
}

export function can(user: AppUser, permission: string) {
  return [...permissionsForRole(user.role), ...(user.permissions ?? [])].includes(permission);
}
