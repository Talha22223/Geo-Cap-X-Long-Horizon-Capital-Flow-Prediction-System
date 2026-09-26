/**
 * ============================================================================
 * ROLE-BASED ACCESS CONTROL GUARD (RolesGuard)
 * ============================================================================
 * WHAT:
 *   Validates that the authenticated user possesses one of the required SystemRoles
 *   (e.g., SUPER_ADMIN, ADMIN, ANALYST, ENTERPRISE, USER) declared via `@Roles(...)`.
 *
 * WHY:
 *   Secures administrative endpoints, system settings, and user management routes
 *   against unauthorized horizontal and vertical privilege escalation.
 *
 * HOW IT CONNECTS:
 *   - Used with `@Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN)` on AdminController.
 * ============================================================================
 */

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SystemRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<SystemRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      return false;
    }
    return requiredRoles.includes(user.role);
  }
}
