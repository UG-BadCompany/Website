import { defaultRoles, permissions as defaultPermissions } from '../data/foundation';

export type RoleOption = { id?: string; name: string; description?: string; systemRole?: boolean; permissionsCount?: number; userCount?: number; permissions?: string[]; archived?: boolean };
export type PermissionOption = { id?: string; key: string; group: string; description?: string; systemPermission?: boolean; dangerousPermission?: boolean; roles?: string[] };

export const roleTemplates = [
  { key: 'blank', label: 'Blank', roleName: '', permissions: [] },
  ...defaultRoles.filter((role) => role.name !== 'Owner').map((role) => ({ key: role.name.toLowerCase(), label: `Copy ${role.name}`, roleName: role.name, permissions: role.permissions })),
];

export function normalizeRole(row: Partial<RoleOption>): RoleOption {
  const fallback = defaultRoles.find((role) => role.name.toLowerCase() === String(row.name || '').toLowerCase());
  return {
    id: row.id || row.name,
    name: String(row.name || fallback?.name || ''),
    description: row.description || roleDescription(String(row.name || fallback?.name || '')),
    systemRole: Boolean(row.systemRole ?? defaultRoles.some((role) => role.name.toLowerCase() === String(row.name || '').toLowerCase())),
    permissionsCount: Number(row.permissionsCount ?? row.permissions?.length ?? fallback?.permissions.length ?? 0),
    userCount: Number(row.userCount ?? 0),
    permissions: row.permissions || fallback?.permissions || [],
    archived: Boolean(row.archived),
  };
}

export function roleDescription(roleName: string) {
  const descriptions: Record<string, string> = {
    Owner: 'All access, locked super admin role with the wildcard permission.',
    Admin: 'Administrative access except critical owner/license controls.',
    Office: 'Office manager access for clients, requests, quotes, invoices, and messages.',
    Dispatcher: 'Dispatch access for requests, jobs, messages, clients, and property visibility.',
    Technician: 'Field access for assigned jobs, work orders, assets, and messages.',
    Client: 'Client portal access to own requests, quotes, invoices, payments, and messages.',
    Vendor: 'External vendor access for assigned work and messages.',
  };
  return descriptions[roleName] || 'Custom role controlled by the Owner.';
}

export function fallbackRoleOptions() {
  return defaultRoles.map((role) => normalizeRole({ ...role, permissionsCount: role.permissions.length, systemRole: true }));
}

export function fallbackPermissionOptions(): PermissionOption[] {
  return defaultPermissions.map((permission) => ({
    ...permission,
    description: permission.description || permission.label,
    systemPermission: true,
    dangerousPermission: permission.key === '*' || permission.key.endsWith('.manage'),
    roles: defaultRoles.filter((role) => role.permissions.includes(permission.key) || role.permissions.includes('*')).map((role) => role.name),
  }));
}
