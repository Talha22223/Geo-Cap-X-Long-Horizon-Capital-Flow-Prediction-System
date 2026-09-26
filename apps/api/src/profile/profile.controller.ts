/**
 * ============================================================================
 * USER PROFILE & SETTINGS CONTROLLER (ProfileController)
 * ============================================================================
 * WHAT:
 *   Endpoints managing user account details, sessions, and notifications:
 *   - GET    /api/v1/profile: Retrieves profile, settings, and active session count
 *   - PUT    /api/v1/profile: Updates name, avatar, and phone
 *   - PUT    /api/v1/profile/settings: Updates timezone, language, and theme
 *   - GET    /api/v1/profile/sessions: Lists active user login sessions
 *   - DELETE /api/v1/profile/sessions/:id: Revokes a specific login session
 *   - GET    /api/v1/profile/notifications: Paginated user notifications
 *   - PUT    /api/v1/profile/notifications/:id/read: Marks alert as read
 *   - PUT    /api/v1/profile/notifications/read-all: Marks all alerts as read
 *
 * WHY:
 *   Enables personalized client experiences, multi-device session management,
 *   and user notification centers.
 * ============================================================================
 */

import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ProfileService } from './profile.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  marketingNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  securityAlerts?: boolean;
}

export class QueryActivityDto {
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
}

export class VerifyMfaDto {
  @IsString()
  code!: string;
}

@ApiTags('User Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'profile', version: '1' })
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve authenticated user profile and preference settings' })
  async getProfile(@Req() req: any) {
    return this.profileService.getProfile(req.user.id);
  }

  @Put()
  @ApiOperation({ summary: 'Update profile details (name, avatar, phone)' })
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.profileService.updateProfile(req.user.id, dto);
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update timezone, language, and notification choices' })
  async updateSettings(@Req() req: any, @Body() dto: UpdateSettingsDto) {
    return this.profileService.updateSettings(req.user.id, dto);
  }

  @Get('devices')
  @ApiOperation({ summary: 'List active login sessions (connected devices)' })
  async getConnectedDevices(@Req() req: any) {
    return this.profileService.getConnectedDevices(req.user.id);
  }

  @Delete('devices/:id')
  @ApiOperation({ summary: 'Terminate/revoke a specific login session' })
  async revokeDevice(@Req() req: any, @Param('id') sessionId: string) {
    return this.profileService.revokeDevice(req.user.id, sessionId);
  }

  @Get('activity')
  @ApiOperation({ summary: 'Retrieve paginated user audit log activity history' })
  async getActivityHistory(@Req() req: any, @Query() query: QueryActivityDto) {
    return this.profileService.getActivityHistory(req.user.id, query.page, query.limit);
  }

  @Post('mfa/setup')
  @ApiOperation({ summary: 'Initiate MFA secret and generate QR Auth URI' })
  async setupMfa(@Req() req: any) {
    return this.profileService.setupMfa(req.user.id);
  }

  @Post('mfa/verify')
  @ApiOperation({ summary: 'Verify code and enable MFA' })
  async verifyMfa(@Req() req: any, @Body() dto: VerifyMfaDto) {
    return this.profileService.verifyAndEnableMfa(req.user.id, dto.code);
  }

  @Delete('mfa')
  @ApiOperation({ summary: 'Disable MFA' })
  async disableMfa(@Req() req: any) {
    return this.profileService.disableMfa(req.user.id);
  }
}


