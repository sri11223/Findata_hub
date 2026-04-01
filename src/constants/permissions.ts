import { Role } from '@prisma/client';

/**
 * Granular permission flags used throughout the RBAC system.
 * Each permission maps to a specific action on a resource.
 */
export enum Permission {
  // ── Financial Records ──────────────────────────────────────────────────
  READ_OWN_RECORDS   = 'READ_OWN_RECORDS',
  READ_ALL_RECORDS   = 'READ_ALL_RECORDS',
  CREATE_RECORD      = 'CREATE_RECORD',
  UPDATE_OWN_RECORD  = 'UPDATE_OWN_RECORD',
  UPDATE_ANY_RECORD  = 'UPDATE_ANY_RECORD',
  DELETE_RECORD      = 'DELETE_RECORD',

  // ── Dashboard & Analytics ──────────────────────────────────────────────
  READ_DASHBOARD     = 'READ_DASHBOARD',
  READ_ANALYTICS     = 'READ_ANALYTICS',

  // ── Categories ─────────────────────────────────────────────────────────
  READ_CATEGORIES    = 'READ_CATEGORIES',
  MANAGE_CATEGORIES  = 'MANAGE_CATEGORIES',

  // ── User Management ────────────────────────────────────────────────────
  READ_OWN_PROFILE   = 'READ_OWN_PROFILE',
  READ_ALL_USERS     = 'READ_ALL_USERS',
  CREATE_USER        = 'CREATE_USER',
  UPDATE_USER        = 'UPDATE_USER',
  UPDATE_USER_STATUS = 'UPDATE_USER_STATUS',
  CHANGE_USER_ROLE   = 'CHANGE_USER_ROLE',
  DELETE_USER        = 'DELETE_USER',
}

/**
 * Defines which permissions are granted to each role.
 * Higher roles inherit all lower-role permissions.
 */
export const ROLE_PERMISSIONS: Record<Role, Set<Permission>> = {
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

/** Returns true if the given role has been granted the specified permission. */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

/** Numeric weight for each role — used to compare role seniority. */
export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.VIEWER]:      1,
  [Role.ANALYST]:     2,
  [Role.ADMIN]:       3,
  [Role.SUPER_ADMIN]: 4,
};

/** Returns true if userRole is equal to or above requiredRole in the hierarchy. */
export function hasMinimumRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
