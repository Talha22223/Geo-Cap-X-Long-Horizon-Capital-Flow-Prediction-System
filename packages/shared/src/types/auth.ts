export enum UserRole {
  ADMIN = 'ADMIN',
  ANALYST = 'ANALYST',
  USER = 'USER',
}

export enum UserPermission {
  SYSTEM_ADMIN = 'system:admin',
  MANAGE_USERS = 'users:manage',
  VIEW_AUDIT_LOGS = 'audit_logs:view',
  READ_ANALYTICS = 'analytics:read',
  WRITE_ANALYTICS = 'analytics:write',
  READ_MARKET_DATA = 'market_data:read',
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  permissions: UserPermission[];
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  permissions: UserPermission[];
}
