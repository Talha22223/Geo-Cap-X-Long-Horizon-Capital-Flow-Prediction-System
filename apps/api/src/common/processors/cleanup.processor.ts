import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export const CLEANUP_QUEUE_NAME = 'system-cleanup';

@Injectable()
@Processor(CLEANUP_QUEUE_NAME)
export class CleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(CleanupProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Executing background job: ${job.name} (ID: ${job.id})`);
    switch (job.name) {
      case 'purge-expired-sessions':
        return this.purgeExpiredSessions();
      case 'purge-revoked-tokens':
        return this.purgeRevokedTokens();
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        return { success: false, reason: 'Unknown job type' };
    }
  }

  private async purgeExpiredSessions() {
    const result = await this.prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    this.logger.log(`Purged ${result.count} expired sessions.`);
    return { purgedSessions: result.count };
  }

  private async purgeRevokedTokens() {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { isRevoked: true },
          { expiresAt: { lt: new Date() } },
        ],
      },
    });
    this.logger.log(`Purged ${result.count} revoked/expired refresh tokens.`);
    return { purgedTokens: result.count };
  }
}
