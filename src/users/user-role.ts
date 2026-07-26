export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
}

export const ALL_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN] as const;
