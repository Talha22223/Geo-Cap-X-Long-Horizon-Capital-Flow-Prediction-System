/**
 * ============================================================================
 * FINE-GRAINED PERMISSIONS GUARD (PermissionsGuard)
 * ============================================================================
 * WHAT:
 *   Verifies that the authenticated user holds specific fine-grained granular
 *   permissions (e.g., READ_ANALYTICS, WRITE_ANALYTICS, MANAGE_USERS) defined via
 *   `@RequirePermissions(...)`.
 *
 * WHY:
 *   Enables flexible, granular capability-based access control beyond broad roles.
 *   Provides automatic bypass for SYSTEM_ADMIN permissions or ADMIN role.
 * ============================================================================
 */

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserPermission } from '@geocap-x/shared';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<UserPermission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );
    if (!requiredPermissions) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.permissions) {
      return false;
    }
    // Admin has system level master bypass
    if (user.role === 'ADMIN' || user.permissions.includes(UserPermission.SYSTEM_ADMIN)) {
      return true;
    }
    return requiredPermissions.every((permission) => user.permissions.includes(permission));
  }
}
