import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { OrgRole } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  // 1. Create Organization
  async createOrganization(userId: string, name: string) {
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${crypto.randomInt(1000, 9999)}`;

    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name, slug },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId,
          role: OrgRole.OWNER,
        },
      });

      return org;
    });
  }

  // 2. List Organizations where User is a Member
  async listUserOrganizations(userId: string) {
    return this.prisma.organization.findMany({
      where: {
        deletedAt: null,
        members: { some: { userId } },
      },
      include: {
        members: {
          select: {
            userId: true,
            role: true,
          },
        },
      },
    });
  }

  // 3. Get Organization Details
  async getOrganization(userId: string, orgId: string) {
    await this.checkMembership(userId, orgId);

    const org = await this.prisma.organization.findFirst({
      where: { id: orgId, deletedAt: null },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: true,
              },
            },
          },
        },
        subscriptions: {
          include: { plan: true },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  // 4. Update Organization
  async updateOrganization(userId: string, orgId: string, name: string) {
    await this.checkRole(userId, orgId, [OrgRole.OWNER, OrgRole.ADMIN]);

    return this.prisma.organization.update({
      where: { id: orgId },
      data: { name },
    });
  }

  // 5. Soft Delete Organization
  async deleteOrganization(userId: string, orgId: string) {
    await this.checkRole(userId, orgId, [OrgRole.OWNER]);

    await this.prisma.organization.update({
      where: { id: orgId },
      data: { deletedAt: new Date() },
    });

    return { success: true, message: 'Organization deleted successfully' };
  }

  // 6. Add Member to Organization
  async addMember(userId: string, orgId: string, memberEmail: string, role: OrgRole = OrgRole.MEMBER) {
    await this.checkRole(userId, orgId, [OrgRole.OWNER, OrgRole.ADMIN]);

    const targetUser = await this.prisma.user.findUnique({
      where: { email: memberEmail },
    });

    if (!targetUser) {
      throw new NotFoundException('User with specified email address does not exist');
    }

    const existingMember = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: targetUser.id,
        },
      },
    });

    if (existingMember) {
      throw new BadRequestException('User is already a member of this organization');
    }

    return this.prisma.organizationMember.create({
      data: {
        organizationId: orgId,
        userId: targetUser.id,
        role,
      },
    });
  }

  // 7. Remove Member
  async removeMember(userId: string, orgId: string, targetUserId: string) {
    // A member can leave, or an OWNER/ADMIN can remove a member
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: targetUserId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found in organization');
    }

    if (userId !== targetUserId) {
      await this.checkRole(userId, orgId, [OrgRole.OWNER, OrgRole.ADMIN]);
      // Admins cannot remove owners
      if (member.role === OrgRole.OWNER) {
        throw new ForbiddenException('Admins cannot remove the organization owner');
      }
    } else {
      // Owners cannot leave without transferring ownership
      if (member.role === OrgRole.OWNER) {
        throw new BadRequestException('Owners cannot leave without transferring ownership first');
      }
    }

    await this.prisma.organizationMember.delete({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: targetUserId,
        },
      },
    });

    return { success: true, message: 'Member removed successfully' };
  }

  // Membership & Authorization Helpers
  private async checkMembership(userId: string, orgId: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    return member;
  }

  private async checkRole(userId: string, orgId: string, allowedRoles: OrgRole[]) {
    const member = await this.checkMembership(userId, orgId);
    if (!allowedRoles.includes(member.role)) {
      throw new ForbiddenException('You do not have permission to execute this operation');
    }
  }

  async createInvitation(userId: string, orgId: string, email: string, role: OrgRole = OrgRole.MEMBER) {
    await this.checkRole(userId, orgId, [OrgRole.OWNER, OrgRole.ADMIN]);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiration

    return this.prisma.organizationInvitation.create({
      data: {
        organizationId: orgId,
        email,
        role,
        token,
        expiresAt,
      },
    });
  }

  async listInvitations(userId: string, orgId: string) {
    await this.checkMembership(userId, orgId);
    return this.prisma.organizationInvitation.findMany({
      where: { organizationId: orgId },
    });
  }

  async acceptInvitation(userId: string, token: string) {
    const invite = await this.prisma.organizationInvitation.findUnique({
      where: { token },
    });

    if (!invite || invite.expiresAt < new Date()) {
      throw new BadRequestException('Invitation is invalid or has expired');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.email !== invite.email) {
      throw new ForbiddenException('This invitation was sent to a different email address');
    }

    // Join organization
    const member = await this.prisma.$transaction(async (tx) => {
      const m = await tx.organizationMember.create({
        data: {
          organizationId: invite.organizationId,
          userId,
          role: invite.role,
        },
      });

      // Delete invite token
      await tx.organizationInvitation.delete({ where: { id: invite.id } });
      return m;
    });

    return member;
  }

  async transferOwnership(userId: string, orgId: string, targetUserId: string) {
    await this.checkRole(userId, orgId, [OrgRole.OWNER]);

    const targetMember = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: targetUserId,
        },
      },
    });

    if (!targetMember) {
      throw new BadRequestException('Target user is not a member of the organization');
    }

    return this.prisma.$transaction(async (tx) => {
      // Demote current owner to admin
      await tx.organizationMember.update({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId,
          },
        },
        data: { role: OrgRole.ADMIN },
      });

      // Promote target member to owner
      return tx.organizationMember.update({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId: targetUserId,
          },
        },
        data: { role: OrgRole.OWNER },
      });
    });
  }
}
