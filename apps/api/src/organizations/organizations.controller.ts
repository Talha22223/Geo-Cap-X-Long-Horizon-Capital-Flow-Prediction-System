/**
 * ============================================================================
 * ORGANIZATIONS CONTROLLER (OrganizationsController) - MULTI-TENANCY ENGINE
 * ============================================================================
 * WHAT:
 *   Manages multi-tenant workgroup boundaries, memberships, and role assignments:
 *   - POST   /api/v1/organizations: Creates new organization with user as OWNER
 *   - GET    /api/v1/organizations: Lists all organizations where user is a member
 *   - GET    /api/v1/organizations/:id: Retrieves organization details and member roster
 *   - PUT    /api/v1/organizations/:id: Updates organization name (requires OWNER/ADMIN)
 *   - DELETE /api/v1/organizations/:id: Soft-deletes organization tenant
 *   - POST   /api/v1/organizations/:id/members: Directly adds a user by email
 *   - DELETE /api/v1/organizations/:id/members/:userId: Removes member or leaves org
 *   - POST   /api/v1/organizations/:id/invitations: Issues email invitation token
 *   - POST   /api/v1/organizations/invitations/accept: Joins organization using token
 *   - POST   /api/v1/organizations/:id/transfer-ownership: Transfers OWNER role
 *
 * WHY:
 *   Provides organizational isolation where data, subscription billing, and API keys
 *   are partitioned per tenant.
 * ============================================================================
 */

import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { OrganizationsService } from './organizations.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, IsEnum } from 'class-validator';
import { OrgRole } from '@prisma/client';

export class CreateOrgDto {
  @IsString()
  @IsNotEmpty({ message: 'Organization name cannot be empty' })
  name!: string;
}

export class AddMemberDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email!: string;

  @IsEnum(OrgRole, { message: 'Invalid organization member role' })
  role!: OrgRole;
}

export class InviteMemberDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email!: string;

  @IsEnum(OrgRole, { message: 'Invalid organization member role' })
  role!: OrgRole;
}

export class AcceptInviteDto {
  @IsString()
  @IsNotEmpty({ message: 'Token is required to accept invitation' })
  token!: string;
}

export class TransferOwnershipDto {
  @IsString()
  @IsNotEmpty({ message: 'Target user ID is required to transfer ownership' })
  targetUserId!: string;
}

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'organizations', version: '1' })
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new multi-tenant organization' })
  async create(@Req() req: any, @Body() dto: CreateOrgDto) {
    return this.orgsService.createOrganization(req.user.id, dto.name);
  }

  @Get()
  @ApiOperation({ summary: 'List all organizations where the user is a member' })
  async list(@Req() req: any) {
    return this.orgsService.listUserOrganizations(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details and members of a specific organization' })
  async get(@Req() req: any, @Param('id') orgId: string) {
    return this.orgsService.getOrganization(req.user.id, orgId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update organization name' })
  async update(@Req() req: any, @Param('id') orgId: string, @Body() dto: CreateOrgDto) {
    return this.orgsService.updateOrganization(req.user.id, orgId, dto.name);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete an organization' })
  async delete(@Req() req: any, @Param('id') orgId: string) {
    return this.orgsService.deleteOrganization(req.user.id, orgId);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add a user as a member to an organization' })
  async addMember(@Req() req: any, @Param('id') orgId: string, @Body() dto: AddMemberDto) {
    return this.orgsService.addMember(req.user.id, orgId, dto.email, dto.role);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove a member from an organization (or leave)' })
  async removeMember(
    @Req() req: any,
    @Param('id') orgId: string,
    @Param('userId') targetUserId: string
  ) {
    return this.orgsService.removeMember(req.user.id, orgId, targetUserId);
  }

  @Post(':id/invitations')
  @ApiOperation({ summary: 'Invite a user to join an organization' })
  async invite(
    @Req() req: any,
    @Param('id') orgId: string,
    @Body() dto: InviteMemberDto
  ) {
    return this.orgsService.createInvitation(req.user.id, orgId, dto.email, dto.role);
  }

  @Get(':id/invitations')
  @ApiOperation({ summary: 'List pending organization invitations' })
  async listInvitations(@Req() req: any, @Param('id') orgId: string) {
    return this.orgsService.listInvitations(req.user.id, orgId);
  }

  @Post('invitations/accept')
  @ApiOperation({ summary: 'Accept a pending organization invitation' })
  async accept(@Req() req: any, @Body() dto: AcceptInviteDto) {
    return this.orgsService.acceptInvitation(req.user.id, dto.token);
  }

  @Post(':id/transfer-ownership')
  @ApiOperation({ summary: 'Transfer ownership of an organization' })
  async transfer(
    @Req() req: any,
    @Param('id') orgId: string,
    @Body() dto: TransferOwnershipDto
  ) {
    return this.orgsService.transferOwnership(req.user.id, orgId, dto.targetUserId);
  }
}


