import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeysService {
  constructor(private prisma: PrismaService) {}

  // 1. Create API Key
  async createKey(userId: string, name: string, orgId?: string, expiresDays?: number) {
    // If organization is specified, verify membership
    if (orgId) {
      const isMember = await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: { organizationId: orgId, userId },
        },
      });
      if (!isMember) {
        throw new ForbiddenException('You do not have access to this organization');
      }
    }

    const rawKey = `gck_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const expiresAt = expiresDays ? new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000) : null;

    const apiKey = await this.prisma.apiKey.create({
      data: {
        userId,
        organizationId: orgId || null,
        keyHash,
        name,
        scopes: ['analytics:read', 'market_data:read'], // default developer scopes
        expiresAt,
      },
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      rawKey, // Return raw key ONLY ONCE during creation
      scopes: apiKey.scopes,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };
  }

  // 2. List User API Keys Metadata
  async listKeys(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        name: true,
        scopes: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
        organizationId: true,
      },
    });
  }

  // 3. Revoke/Deactivate API Key
  async revokeKey(userId: string, id: string) {
    const key = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!key) {
      throw new NotFoundException('API Key not found');
    }

    if (key.userId !== userId) {
      throw new ForbiddenException('You do not have permission to revoke this key');
    }

    await this.prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true, message: 'API Key revoked successfully' };
  }

  // 4. Validate API Key for Guard usage
  async validateKey(rawKey: string) {
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { keyHash, isActive: true },
      include: {
        user: true,
      },
    });

    if (!apiKey || (apiKey.expiresAt && apiKey.expiresAt < new Date())) {
      return null;
    }

    // Update lastUsedAt asynchronously
    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return apiKey;
  }
}
