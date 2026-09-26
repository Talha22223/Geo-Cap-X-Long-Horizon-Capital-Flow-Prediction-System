import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ApiKeysService } from './apikeys.service.js';
import { UserPermission } from '@geocap-x/shared';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new UnauthorizedException('API Key header (X-API-KEY) is missing');
    }

    const keyRecord = await this.apiKeysService.validateKey(apiKey);
    if (!keyRecord) {
      throw new UnauthorizedException('Invalid or expired API Key');
    }

    const rolePermissions: Record<string, UserPermission[]> = {
      SUPER_ADMIN: [
        UserPermission.SYSTEM_ADMIN,
        UserPermission.MANAGE_USERS,
        UserPermission.VIEW_AUDIT_LOGS,
        UserPermission.READ_ANALYTICS,
        UserPermission.WRITE_ANALYTICS,
        UserPermission.READ_MARKET_DATA,
      ],
      ADMIN: [
        UserPermission.MANAGE_USERS,
        UserPermission.VIEW_AUDIT_LOGS,
        UserPermission.READ_ANALYTICS,
        UserPermission.WRITE_ANALYTICS,
        UserPermission.READ_MARKET_DATA,
      ],
      ANALYST: [
        UserPermission.READ_ANALYTICS,
        UserPermission.WRITE_ANALYTICS,
        UserPermission.READ_MARKET_DATA,
      ],
      ENTERPRISE: [
        UserPermission.READ_ANALYTICS,
        UserPermission.READ_MARKET_DATA,
      ],
      USER: [
        UserPermission.READ_ANALYTICS,
        UserPermission.READ_MARKET_DATA,
      ],
    };

    // Attach user information to request
    request.user = {
      id: keyRecord.userId,
      email: keyRecord.user.email,
      role: keyRecord.user.role,
      permissions: rolePermissions[keyRecord.user.role] || [],
      organizationId: keyRecord.organizationId,
    };

    return true;
  }
}
