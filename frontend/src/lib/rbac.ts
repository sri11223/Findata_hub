import { Role } from './types';

// ── Permission constants (mirrors backend) ────────────────────────────────────

export const Permission = {
  READ_OWN_RECORDS: 'READ_OWN_RECORDS',
  READ_ALL_RECORDS: 'READ_ALL_RECORDS',
  CREATE_RECORD: 'CREATE_RECORD',
  UPDATE_OWN_RECORD: 'UPDATE_OWN_RECORD',
  UPDATE_ANY_RECORD: 'UPDATE_ANY_RECORD',
  DELETE_RECORD: 'DELETE_RECORD',
  READ_DASHBOARD: 'READ_DASHBOARD',
  READ_ANALYTICS: 'READ_ANALYTICS',
  READ_CATEGORIES: 'READ_CATEGORIES',
  MANAGE_CATEGORIES: 'MANAGE_CATEGORIES',
  READ_OWN_PROFILE: 'READ_OWN_PROFILE',
  READ_ALL_USERS: 'READ_ALL_USERS',
  CREATE_USER: 'CREATE_USER',
  UPDATE_USER: 'UPDATE_USER',
  UPDATE_USER_STATUS: 'UPDATE_USER_STATUS',
  CHANGE_USER_ROLE: 'CHANGE_USER_ROLE',
  DELETE_USER: 'DELETE_USER',
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];

// ── Role → Permissions mapping ────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<string, Set<string>> = {
  [Role.VIEWER]: new Set([
    Permission.READ_OWN_RECORDS,
    Permission.READ_DASHBOARD,
    Permission.READ_CATEGORIES,
    Permission.READ_OWN_PROFILE,
  ]),
  [Role.ANALYST]: new Set([
    Permission.READ_OWN_RECORDS,
    Permission.READ_ALL_RECORDS,
    Permission.CREATE_RECORD,
    Permission.UPDATE_OWN_RECORD,
    Permission.READ_DASHBOARD,
    Permission.READ_ANALYTICS,
    Permission.READ_CATEGORIES,
    Permission.READ_OWN_PROFILE,
  ]),
  [Role.ADMIN]: new Set([
    Permission.READ_OWN_RECORDS,
    Permission.READ_ALL_RECORDS,
    Permission.CREATE_RECORD,
    Permission.UPDATE_OWN_RECORD,
    Permission.UPDATE_ANY_RECORD,
    Permission.DELETE_RECORD,
    Permission.READ_DASHBOARD,
    Permission.READ_ANALYTICS,
    Permission.READ_CATEGORIES,
    Permission.MANAGE_CATEGORIES,
    Permission.READ_OWN_PROFILE,
    Permission.READ_ALL_USERS,
    Permission.CREATE_USER,
    Permission.UPDATE_USER,
    Permission.UPDATE_USER_STATUS,
  ]),
  [Role.SUPER_ADMIN]: new Set([
    Permission.READ_OWN_RECORDS,
    Permission.READ_ALL_RECORDS,
    Permission.CREATE_RECORD,
    Permission.UPDATE_OWN_RECORD,
    Permission.UPDATE_ANY_RECORD,
    Permission.DELETE_RECORD,
    Permission.READ_DASHBOARD,
    Permission.READ_ANALYTICS,
    Permission.READ_CATEGORIES,
    Permission.MANAGE_CATEGORIES,
    Permission.READ_OWN_PROFILE,
    Permission.READ_ALL_USERS,
    Permission.CREATE_USER,
    Permission.UPDATE_USER,
    Permission.UPDATE_USER_STATUS,
    Permission.CHANGE_USER_ROLE,
    Permission.DELETE_USER,
  ]),
};

export const ROLE_HIERARCHY: Record<string, number> = {
  [Role.VIEWER]: 1,
  [Role.ANALYST]: 2,
  [Role.ADMIN]: 3,
  [Role.SUPER_ADMIN]: 4,
};

export function hasPermission(role: string, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

export function hasMinimumRole(userRole: string, requiredRole: string): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
}

// ── Helper: format role display ───────────────────────────────────────────────

export function formatRole(role: string): string {
  return role.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getRoleBadgeClass(role: string): string {
  const map: Record<string, string> = {
    [Role.VIEWER]: 'badge-viewer',
    [Role.ANALYST]: 'badge-analyst',
    [Role.ADMIN]: 'badge-admin',
    [Role.SUPER_ADMIN]: 'badge-super-admin',
  };
  return map[role] || 'badge';
}

export function getStatusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'badge-active',
    INACTIVE: 'badge-inactive',
    SUSPENDED: 'badge-suspended',
  };
  return map[status] || 'badge';
}
