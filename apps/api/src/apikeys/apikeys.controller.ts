/**
 * ============================================================================
 * DEVELOPER API KEYS CONTROLLER (ApiKeysController)
 * ============================================================================
 * WHAT:
 *   Endpoints for programmatic API access credential management:
 *   - POST   /api/v1/apikeys: Generates new SHA-256 hashed secret API key
 *   - GET    /api/v1/apikeys: Lists active API keys and usage timestamps
 *   - DELETE /api/v1/apikeys/:id: Revokes an active API key
 *
 * WHY:
 *   Permits quant developers and institutional trading bots to interact
 *   programmatically with GeoCap-X data feeds using cryptographically secure tokens.
 * ============================================================================
 */

import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiKeysService } from './apikeys.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @IsNotEmpty({ message: 'Key label name is required' })
  name!: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  expiresDays?: number;
}

@ApiTags('Developer API Keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'apikeys', version: '1' })
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @ApiOperation({ summary: 'Generate a new developer API key' })
  async create(@Req() req: any, @Body() dto: CreateApiKeyDto) {
    return this.apiKeysService.createKey(req.user.id, dto.name, dto.organizationId, dto.expiresDays);
  }

  @Get()
  @ApiOperation({ summary: 'List all active API keys metadata for the user' })
  async list(@Req() req: any) {
    return this.apiKeysService.listKeys(req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke and deactivate an API key' })
  async revoke(@Req() req: any, @Param('id') keyId: string) {
    return this.apiKeysService.revokeKey(req.user.id, keyId);
  }
}
