import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { SystemRole } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // 1. User Management: Paginated List with search and filtering
  async listUsers(page = 1, limit = 10, search?: string, roleFilter?: SystemRole) {
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { profile: { firstName: { contains: search, mode: 'insensitive' } } },
        { profile: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (roleFilter) {
      where.role = roleFilter;
    }

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          createdAt: true,
          profile: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 2. Role Management: Update user role
  async updateUserRole(callerRole: SystemRole, targetUserId: string, newRole: SystemRole) {
    // Only SUPER_ADMIN can make someone SUPER_ADMIN or modify a SUPER_ADMIN
    const targetUser = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (targetUser.role === SystemRole.SUPER_ADMIN && callerRole !== SystemRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only a Super Admin can modify other Super Admins');
    }

    if (newRole === SystemRole.SUPER_ADMIN && callerRole !== SystemRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only a Super Admin can assign the Super Admin role');
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
    });
  }

  // 3. User Management: Suspension/Activation
  async updateUserStatus(callerRole: SystemRole, targetUserId: string, isActive: boolean) {
    const targetUser = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (targetUser.role === SystemRole.SUPER_ADMIN && callerRole !== SystemRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only a Super Admin can suspend other Super Admins');
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { isActive },
    });
  }

  // 4. Audit Logs: Read system logs
  async listAuditLogs(page = 1, limit = 20, action?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (action) {
      where.action = action;
    }

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 5. Feature Flags Management
  async listFeatureFlags() {
    return this.prisma.featureFlag.findMany();
  }

  async updateFeatureFlag(id: string, isEnabled: boolean) {
    const flag = await this.prisma.featureFlag.findUnique({ where: { id } });
    if (!flag) {
      throw new NotFoundException('Feature flag not found');
    }

    return this.prisma.featureFlag.update({
      where: { id },
      data: { isEnabled },
    });
  }

  // 6. System Settings Management
  async listSystemSettings() {
    return this.prisma.systemSetting.findMany();
  }

  async updateSystemSetting(id: string, value: string) {
    const setting = await this.prisma.systemSetting.findUnique({ where: { id } });
    if (!setting) {
      throw new NotFoundException('System setting not found');
    }

    return this.prisma.systemSetting.update({
      where: { id },
      data: { value },
    });
  }

  async getAdminTelemetry() {
    const totalUsers = await this.prisma.user.count({ where: { deletedAt: null } });
    const activeSubs = await this.prisma.subscription.count({ where: { status: 'ACTIVE' } });
    
    // Revenue sum from payments
    const payments = await this.prisma.payment.findMany({ where: { status: 'succeeded' } });
    const totalRevenue = payments.reduce((acc, p) => acc + Number(p.amount), 0);

    // Group subscriptions by plan
    const subsByPlan = await this.prisma.subscription.groupBy({
      by: ['planId'],
      _count: { id: true }
    });

    const planStats = [];
    for (const item of subsByPlan) {
      const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: item.planId } });
      if (plan) {
        planStats.push({ name: plan.name, count: item._count.id });
      }
    }

    // Active announcements
    const totalAnnouncements = await this.prisma.announcement.count();

    // Tickets
    const totalTickets = await this.prisma.supportTicket.count();
    const openTickets = await this.prisma.supportTicket.count({ where: { status: 'OPEN' } });

    // Job queues (fetched via REST API from Python AI service)
    let pendingJobs = 0;
    let runningJobs = 0;
    let failedJobs = 0;

    try {
      const aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
      const res = await fetch(`${aiUrl}/api/v1/jobs/stats`);
      if (res.ok) {
        const body = await res.json() as any;
        if (body.success && body.data) {
          pendingJobs = body.data.pending || 0;
          runningJobs = body.data.running || 0;
          failedJobs = body.data.failed || 0;
        }
      }
    } catch (error) {
      // AI service is offline or unreachable
    }

    return {
      totalUsers,
      activeSubs,
      totalRevenue,
      planStats,
      totalAnnouncements,
      tickets: { total: totalTickets, open: openTickets },
      jobs: { pending: pendingJobs, running: runningJobs, failed: failedJobs }
    };
  }

  async resetMfa(targetUserId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        mfaSecret: null,
        isMfaEnabled: false,
      },
    });
  }

  async listTickets() {
    return this.prisma.supportTicket.findMany({
      include: {
        user: {
          select: { email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateTicketStatus(id: string, status: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }
    return this.prisma.supportTicket.update({
      where: { id },
      data: { status }
    });
  }

  async listAnnouncements() {
    return this.prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createAnnouncement(title: string, content: string, target = 'ALL') {
    return this.prisma.announcement.create({
      data: { title, content, target }
    });
  }

  async deleteAnnouncement(id: string) {
    const ann = await this.prisma.announcement.findUnique({ where: { id } });
    if (!ann) {
      throw new NotFoundException('Announcement not found');
    }
    await this.prisma.announcement.delete({ where: { id } });
    return { success: true };
  }
}
