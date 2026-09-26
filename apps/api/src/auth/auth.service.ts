/**
 * ============================================================================
 * AUTHENTICATION SERVICE (AuthService) - CORE SECURITY ENGINE
 * ============================================================================
 * WHAT:
 *   Central provider for identity management, password hashing (Argon2),
 *   multi-tenant organization creation, JWT session signing, refresh token rotation,
 *   OAuth 2.0 Google federation, password recovery, and email verification.
 *
 * WHY:
 *   Ensures strict multi-tenant isolation, cryptographic password storage,
 *   server-side subscription gating (users register with UNPAID status and must
 *   select a plan before accessing institutional data), and comprehensive audit trails.
 *
 * BUSINESS RULES & RESTRICTIONS:
 *   - Onboarding Rule: New accounts are provisioned with an initial personal
 *     Organization and an UNPAID subscription. They are redirected to `/plans`.
 *   - Token Lifespans:
 *     - Access Token (JWT): Short-lived bearer token signed with HMAC-SHA256 (JWT_SECRET).
 *     - Refresh Token: 7 days by default; 30 days if `rememberMe` is enabled.
 *   - Token Rotation: Every /refresh call revokes the incoming refresh token and
 *     issues a brand new one to prevent token reuse attacks.
 *   - Super Admin: Users with role SUPER_ADMIN or email `admin@gmail.com` bypass
 *     subscription gate restrictions.
 * ============================================================================
 */

import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import { hashPassword, verifyPassword } from '../common/utils/hash.util.js';
import { EmailService } from '../common/services/email.service.js';
import { SystemRole, OrgRole, SubscriptionStatus } from '@prisma/client';
import { UserPermission } from '@geocap-x/shared';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService
  ) {}

  // 1. User Registration (Account creation without auto-granting paid access)
  async register(dto: any, ipAddress?: string, userAgent?: string) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match.');
    }

    const hashedPassword = await hashPassword(dto.password);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create User, Profile, Settings, and Organization in a transaction
    const user = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          role: SystemRole.USER,
          verificationToken,
          isEmailVerified: true, // auto-verified for onboarding ease
          emailVerifiedAt: new Date(),
          profile: {
            create: {
              firstName: dto.firstName?.trim() || 'Client',
              lastName: dto.lastName?.trim() || 'User',
            },
          },
          settings: {
            create: {
              timezone: 'UTC',
              language: 'en',
              theme: 'dark',
            },
          },
        },
      });

      // Create Personal Tenant Organization
      const org = await tx.organization.create({
        data: {
          name: `${dto.firstName?.trim() || 'Client'}'s Workgroup`,
          slug: `${(dto.firstName?.trim() || 'client').toLowerCase().replace(/[^a-z0-9]/g, '')}-workgroup-${crypto.randomInt(1000, 9999)}`,
        },
      });

      // Bind member as OWNER
      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: u.id,
          role: OrgRole.OWNER,
        },
      });

      // Bind Initial Unpaid Subscription (User MUST select/confirm plan on /plans)
      const freePlan = await tx.subscriptionPlan.findUnique({ where: { name: 'Free' } });
      if (freePlan) {
        await tx.subscription.create({
          data: {
            organizationId: org.id,
            planId: freePlan.id,
            status: SubscriptionStatus.UNPAID, // User must subscribe on /plans
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(),
          },
        });
      }

      return u;
    });

    // Generate Session & Refresh Token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const sessionToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenStr = crypto.randomBytes(40).toString('hex');

    await this.prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        ipAddress,
        userAgent,
        expiresAt,
      },
    });

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenStr,
        expiresAt,
      },
    });

    const tokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: this.getRolePermissions(user.role),
    };

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: 'user.register',
        resource: 'auth',
        ipAddress,
        userAgent,
        details: { email: user.email },
      },
    });

    return {
      success: true,
      accessToken: this.jwtService.sign(tokenPayload),
      refreshToken: refreshTokenStr,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: dto.firstName,
        lastName: dto.lastName,
        plan: 'none',
        subscriptionStatus: 'UNPAID',
        permissions: tokenPayload.permissions,
      },
      redirectTo: '/plans',
      message: 'Account created successfully! Please select your subscription plan.',
    };
  }

  // 2. User Login
  async login(dto: any, ipAddress?: string, userAgent?: string) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email, deletedAt: null },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Email or password is incorrect.');
    }

    const matches = await verifyPassword(dto.password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Email or password is incorrect.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Your account has been deactivated. Please contact support.');
    }

    // Check user's subscription in DB
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId: user.id },
      include: {
        organization: {
          include: {
            subscriptions: {
              include: { plan: true },
              orderBy: { updatedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    const activeSub = membership?.organization?.subscriptions?.[0] || null;
    const isSubActive =
      activeSub &&
      (activeSub.status === SubscriptionStatus.ACTIVE || activeSub.status === SubscriptionStatus.TRIALING) &&
      new Date(activeSub.currentPeriodEnd) > new Date();

    const redirectTo = isSubActive ? '/dashboard' : '/plans';

    // Generate Session & Refresh Token
    const rememberMe = !!dto.rememberMe;
    const refreshLifespanDays = rememberMe ? 30 : 7;
    const expiresAt = new Date(Date.now() + refreshLifespanDays * 24 * 60 * 60 * 1000);

    const sessionToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenStr = crypto.randomBytes(40).toString('hex');

    await this.prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        ipAddress,
        userAgent,
        expiresAt,
      },
    });

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenStr,
        expiresAt,
      },
    });

    const tokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: this.getRolePermissions(user.role),
    };

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: 'user.login',
        resource: 'auth',
        ipAddress,
        userAgent,
        details: { rememberMe },
      },
    });

    return {
      accessToken: this.jwtService.sign(tokenPayload),
      refreshToken: refreshTokenStr,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.profile?.firstName || null,
        lastName: user.profile?.lastName || null,
        avatarUrl: user.profile?.avatarUrl || null,
        organizationId: membership?.organizationId || null,
        plan: activeSub?.plan?.name?.toLowerCase() || 'none',
        subscriptionStatus: activeSub?.status || 'UNPAID',
        permissions: tokenPayload.permissions,
      },
      subscription: activeSub
        ? {
            id: activeSub.id,
            plan: activeSub.plan.name,
            status: activeSub.status,
            isActive: !!isSubActive,
            limits: activeSub.plan.features,
            currentPeriodEnd: activeSub.currentPeriodEnd,
          }
        : null,
      redirectTo,
    };
  }

  // 3. User Logout (Complete session and token revocation)
  async logout(refreshTokenStr?: string, userId?: string, ipAddress?: string, userAgent?: string) {
    if (refreshTokenStr) {
      const tokenRecord = await this.prisma.refreshToken.findUnique({
        where: { token: refreshTokenStr },
      });
      if (tokenRecord) {
        await this.prisma.refreshToken.update({
          where: { token: refreshTokenStr },
          data: { isRevoked: true },
        });
        userId = userId || tokenRecord.userId;
      }
    }

    if (userId) {
      // Invalidate all active sessions for this user
      await this.prisma.session.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });

      // Revoke all refresh tokens
      await this.prisma.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      });

      // Audit log
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'user.logout',
          resource: 'auth',
          ipAddress,
          userAgent,
        },
      });
    }

    return { success: true, message: 'Logged out successfully.' };
  }

  // 4. Get Current User & Live Subscription (Source of Truth)
  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      include: {
        profile: true,
        orgMemberships: {
          include: {
            organization: {
              include: {
                subscriptions: {
                  include: { plan: true },
                  orderBy: { updatedAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User session has expired or user does not exist.');
    }

    const membership = user.orgMemberships[0];
    const sub = membership?.organization?.subscriptions?.[0] || null;
    const isSubActive =
      sub &&
      (sub.status === SubscriptionStatus.ACTIVE || sub.status === SubscriptionStatus.TRIALING) &&
      new Date(sub.currentPeriodEnd) > new Date();

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.profile?.firstName || null,
      lastName: user.profile?.lastName || null,
      avatarUrl: user.profile?.avatarUrl || null,
      organization: membership
        ? {
            id: membership.organization.id,
            name: membership.organization.name,
            slug: membership.organization.slug,
          }
        : null,
      subscription: sub
        ? {
            id: sub.id,
            plan: sub.plan.name,
            planId: sub.planId,
            status: sub.status,
            isActive: !!isSubActive,
            limits: sub.plan.features,
            currentPeriodStart: sub.currentPeriodStart,
            currentPeriodEnd: sub.currentPeriodEnd,
            cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          }
        : null,
    };
  }

  // 5. Refresh Tokens Rotation
  async refresh(refreshTokenStr: string, ipAddress?: string, userAgent?: string) {
    if (!refreshTokenStr) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshTokenStr },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.isRevoked || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Revoke old refresh token (Rotation)
    await this.prisma.refreshToken.update({
      where: { token: refreshTokenStr },
      data: { isRevoked: true },
    });

    // Generate new refresh token
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const newRefreshTokenStr = crypto.randomBytes(40).toString('hex');

    await this.prisma.refreshToken.create({
      data: {
        userId: tokenRecord.userId,
        token: newRefreshTokenStr,
        expiresAt: newExpiresAt,
      },
    });

    const tokenPayload = {
      sub: tokenRecord.user.id,
      email: tokenRecord.user.email,
      role: tokenRecord.user.role,
      permissions: this.getRolePermissions(tokenRecord.user.role),
    };

    return {
      accessToken: this.jwtService.sign(tokenPayload),
      refreshToken: newRefreshTokenStr,
    };
  }

  // 6. Google OAuth Authorization URL
  getGoogleAuthUrl(): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new BadRequestException('Google OAuth is not configured on the server. Please provide GOOGLE_CLIENT_ID in the environment configuration.');
    }
    const redirectUri = encodeURIComponent(process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/callback/google');
    const scope = encodeURIComponent('openid email profile');
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
  }

  // 7. Google OAuth Callback Processor
  async handleGoogleCallback(code: string, ipAddress?: string, userAgent?: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/callback/google';

    if (!clientId || !clientSecret) {
      throw new BadRequestException('Google OAuth credentials not configured on the server.');
    }

    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new BadRequestException(tokenData.error_description || 'Failed to authenticate with Google OAuth.');
    }

    // Fetch user profile from Google UserInfo
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await userRes.json();
    if (!userRes.ok || !profile.email) {
      throw new BadRequestException('Failed to retrieve user profile from Google.');
    }

    const email = profile.email.toLowerCase();

    // Check if user exists
    let user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user) {
      // Create user account with verified email
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const hashedPassword = await hashPassword(randomPassword);

      user = await this.prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: {
            email,
            passwordHash: hashedPassword,
            role: SystemRole.USER,
            isEmailVerified: true,
            emailVerifiedAt: new Date(),
            profile: {
              create: {
                firstName: profile.given_name || 'Google',
                lastName: profile.family_name || 'User',
                avatarUrl: profile.picture || null,
              },
            },
            settings: {
              create: {
                timezone: 'UTC',
                language: 'en',
                theme: 'dark',
              },
            },
          },
          include: { profile: true },
        });

        // Personal Tenant Organization
        const org = await tx.organization.create({
          data: {
            name: `${profile.given_name || 'Google'}'s Workgroup`,
            slug: `${(profile.given_name || 'google').toLowerCase().replace(/[^a-z0-9]/g, '')}-workgroup-${crypto.randomInt(1000, 9999)}`,
          },
        });

        await tx.organizationMember.create({
          data: {
            organizationId: org.id,
            userId: u.id,
            role: OrgRole.OWNER,
          },
        });

        // Unpaid subscription (Follows SAME subscription rules)
        const freePlan = await tx.subscriptionPlan.findUnique({ where: { name: 'Free' } });
        if (freePlan) {
          await tx.subscription.create({
            data: {
              organizationId: org.id,
              planId: freePlan.id,
              status: SubscriptionStatus.UNPAID,
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(),
            },
          });
        }

        return u;
      });
    } else {
      // Existing user: ensure email is verified & update avatar if available
      if (!user.isEmailVerified) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { isEmailVerified: true, emailVerifiedAt: new Date() },
        });
      }
      if (profile.picture && !user.profile?.avatarUrl) {
        await this.prisma.profile.update({
          where: { userId: user.id },
          data: { avatarUrl: profile.picture },
        });
      }
    }

    // Check subscription status
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId: user.id },
      include: {
        organization: {
          include: {
            subscriptions: {
              include: { plan: true },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    const activeSub = membership?.organization?.subscriptions?.[0] || null;
    const isSubActive =
      activeSub &&
      (activeSub.status === SubscriptionStatus.ACTIVE || activeSub.status === SubscriptionStatus.TRIALING) &&
      new Date(activeSub.currentPeriodEnd) > new Date();

    const redirectTo = isSubActive ? '/dashboard' : '/plans';

    // Generate tokens & session
    const sessionToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenStr = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        ipAddress,
        userAgent,
        expiresAt,
      },
    });

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenStr,
        expiresAt,
      },
    });

    const tokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: this.getRolePermissions(user.role),
    };

    return {
      accessToken: this.jwtService.sign(tokenPayload),
      refreshToken: refreshTokenStr,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.profile?.firstName || profile.given_name,
        lastName: user.profile?.lastName || profile.family_name,
        avatarUrl: user.profile?.avatarUrl || profile.picture,
        organizationId: membership?.organizationId || null,
        plan: activeSub?.plan?.name?.toLowerCase() || 'none',
        subscriptionStatus: activeSub?.status || 'UNPAID',
        permissions: tokenPayload.permissions,
      },
      redirectTo,
    };
  }

  // 8. Forgot Password
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email, deletedAt: null } });
    if (!user) {
      return { success: true, message: 'If the email exists, reset instructions have been sent.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    });

    await this.emailService.sendResetPasswordEmail(user.email, resetToken);

    return { success: true, message: 'If the email exists, reset instructions have been sent.' };
  }

  // 9. Reset Password
  async resetPassword(dto: any) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: dto.token,
        passwordResetExpires: { gt: new Date() },
        deletedAt: null,
      },
    });

    if (!user) {
      throw new BadRequestException('Password reset token is invalid or expired');
    }

    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const hashedPassword = await hashPassword(dto.password);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    await this.prisma.session.updateMany({
      where: { userId: user.id },
      data: { isActive: false },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { isRevoked: true },
    });

    return { success: true, message: 'Password has been reset successfully.' };
  }

  // 10. Verify Email
  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: { verificationToken: token, deletedAt: null },
    });

    if (!user) {
      throw new BadRequestException('Verification token is invalid or expired');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        verificationToken: null,
      },
    });

    return { success: true, message: 'Email verified successfully.' };
  }

  // Helpers
  private getRolePermissions(role: SystemRole): UserPermission[] {
    const rolePermissions: Record<SystemRole, UserPermission[]> = {
      SUPER_ADMIN: [
        UserPermission.SYSTEM_ADMIN,
        UserPermission.MANAGE_USERS,
        UserPermission.VIEW_AUDIT_LOGS,
        UserPermission.READ_ANALYTICS,
        UserPermission.WRITE_ANALYTICS,
        UserPermission.READ_MARKET_DATA,
      ],
      ADMIN: [
        UserPermission.SYSTEM_ADMIN,
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
    return rolePermissions[role] || [];
  }
}
