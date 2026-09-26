import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as net from 'net';
import { CLEANUP_QUEUE_NAME, CleanupProcessor } from './processors/cleanup.processor';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const RedisMock = require('ioredis-mock');

let isAvailableCache: boolean | null = null;

async function checkRedis(host: string, port: number, timeoutMs = 400): Promise<boolean> {
  if (isAvailableCache !== null) {
    return isAvailableCache;
  }
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => {
      socket.destroy();
      isAvailableCache = true;
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      isAvailableCache = false;
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      isAvailableCache = false;
      resolve(false);
    });
    socket.connect(port, host);
  });
}

let mockRedisInstance: any = null;
function getMockRedis() {
  if (!mockRedisInstance) {
    mockRedisInstance = new RedisMock();
  }
  return mockRedisInstance;
}

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST', 'localhost');
        const port = configService.get<number>('REDIS_PORT', 6379);
        const available = await checkRedis(host, port);

        if (!available) {
          console.warn(`[RedisQueueModule] Native Redis unavailable on ${host}:${port}. Using safe in-memory fallback.`);
          return {
            connection: getMockRedis(),
            defaultJobOptions: {
              attempts: 3,
              removeOnComplete: 100,
              removeOnFail: 500,
            },
          };
        }

        return {
          connection: {
            host,
            port,
            maxRetriesPerRequest: null,
            lazyConnect: true,
            enableOfflineQueue: false,
            retryStrategy: (times) => Math.min(times * 5000, 60000),
          },
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
            removeOnComplete: 100,
            removeOnFail: 500,
          },
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: CLEANUP_QUEUE_NAME,
    }),
  ],
  providers: [
    CleanupProcessor,
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST', 'localhost');
        const port = configService.get<number>('REDIS_PORT', 6379);
        const available = await checkRedis(host, port);

        if (!available) {
          return getMockRedis();
        }

        const client = new Redis({
          host,
          port,
          maxRetriesPerRequest: null,
          lazyConnect: true,
          retryStrategy: (times) => Math.min(times * 2000, 30000),
          enableOfflineQueue: false,
        });
        client.on('error', () => {
          // Suppress unhandled crash log if local Redis server is offline
        });
        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: [BullModule, 'REDIS_CLIENT', CleanupProcessor],
})
export class RedisQueueModule {}
