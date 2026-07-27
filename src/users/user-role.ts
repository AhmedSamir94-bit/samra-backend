export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  GUEST = 'guest',
}

export const ALL_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.GUEST,
] as const;

export const STAFF_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN] as const;

export function isStaffRole(role: UserRole | string): boolean {
  return role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN;
}
