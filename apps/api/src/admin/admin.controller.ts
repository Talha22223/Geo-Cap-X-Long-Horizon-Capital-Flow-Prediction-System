/**
 * ============================================================================
 * ADMIN PANEL CONTROLLER (AdminController)
 * ============================================================================
 * WHAT:
 *   Privileged administrative control surface protected by `@UseGuards(JwtAuthGuard, RolesGuard)`
 *   and `@Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN)`:
 *   - `/users`: Paginated search, status suspension, role assignment, MFA reset
 *   - `/audit-logs`: Enterprise audit trail inspection
 *   - `/feature-flags`: Dynamic runtime feature flag toggles
 *   - `/settings`: Global system configuration parameters
 *   - `/telemetry`: Aggregated user count, active subscriptions, and system health metrics
 *   - `/tickets`: Customer support ticket management
 *   - `/announcements`: Broadcast system notifications to users or specific tiers
 *
 * WHY:
 *   Provides platform operators and compliance auditors with complete governance
 *   over users, security logs, feature availability, and operational metrics.
 * ============================================================================
 */

import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/rbac.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { SystemRole } from '@prisma/client';

export class UpdateRoleDto {
  @IsEnum(SystemRole, { message: 'Invalid role selection' })
  role!: SystemRole;
}

export class UpdateStatusDto {
  @IsBoolean()
  isActive!: boolean;
}

export class UpdateFlagDto {
  @IsBoolean()
  isEnabled!: boolean;
}

export class UpdateSettingDto {
  @IsString()
  value!: string;
}

export class QueryUsersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(SystemRole)
  role?: SystemRole;
}

export class QueryLogsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  action?: string;
}

export class CreateAnnouncementDto {
  @IsString()
  title!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  target?: string = 'ALL';
}

export class UpdateTicketStatusDto {
  @IsString()
  status!: string;
}

@ApiTags('Admin Panel')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN)
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'Search and paginate all registered user accounts' })
  async listUsers(@Query() query: QueryUsersDto) {
    return this.adminService.listUsers(query.page, query.limit, query.search, query.role);
  }

  @Put('users/:id/role')
  @ApiOperation({ summary: 'Update user system role assignment' })
  async updateRole(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.adminService.updateUserRole(req.user.role, id, dto.role);
  }

  @Put('users/:id/status')
  @ApiOperation({ summary: 'Suspend or activate user login privileges' })
  async updateStatus(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.adminService.updateUserStatus(req.user.role, id, dto.isActive);
  }

  @Put('users/:id/reset-mfa')
  @ApiOperation({ summary: 'Reset a user\'s MFA secret' })
  async resetMfa(@Param('id') id: string) {
    return this.adminService.resetMfa(id);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Fetch and paginate system audit trail logs' })
  async listLogs(@Query() query: QueryLogsDto) {
    return this.adminService.listAuditLogs(query.page, query.limit, query.action);
  }

  @Get('feature-flags')
  @ApiOperation({ summary: 'List all application feature flags' })
  async listFlags() {
    return this.adminService.listFeatureFlags();
  }

  @Put('feature-flags/:id')
  @ApiOperation({ summary: 'Toggle active status of a feature flag' })
  async updateFlag(@Param('id') id: string, @Body() dto: UpdateFlagDto) {
    return this.adminService.updateFeatureFlag(id, dto.isEnabled);
  }

  @Get('settings')
  @ApiOperation({ summary: 'List all customizable global settings' })
  async listSettings() {
    return this.adminService.listSystemSettings();
  }

  @Put('settings/:id')
  @ApiOperation({ summary: 'Update the value of a system configuration setting' })
  async updateSetting(@Param('id') id: string, @Body() dto: UpdateSettingDto) {
    return this.adminService.updateSystemSetting(id, dto.value);
  }

  @Get('telemetry')
  @ApiOperation({ summary: 'Get SaaS dashboard telemetry summary' })
  async getTelemetry() {
    return this.adminService.getAdminTelemetry();
  }

  @Get('tickets')
  @ApiOperation({ summary: 'List all support tickets' })
  async listTickets() {
    return this.adminService.listTickets();
  }

  @Put('tickets/:id/status')
  @ApiOperation({ summary: 'Update status of support ticket' })
  async updateTicketStatus(@Param('id') id: string, @Body() dto: UpdateTicketStatusDto) {
    return this.adminService.updateTicketStatus(id, dto.status);
  }

  @Get('announcements')
  @ApiOperation({ summary: 'List announcements' })
  async listAnnouncements() {
    return this.adminService.listAnnouncements();
  }

  @Post('announcements')
  @ApiOperation({ summary: 'Create new announcement' })
  async createAnnouncement(@Body() dto: CreateAnnouncementDto) {
    return this.adminService.createAnnouncement(dto.title, dto.content, dto.target);
  }

  @Delete('announcements/:id')
  @ApiOperation({ summary: 'Delete announcement' })
  async deleteAnnouncement(@Param('id') id: string) {
    return this.adminService.deleteAnnouncement(id);
  }
}
