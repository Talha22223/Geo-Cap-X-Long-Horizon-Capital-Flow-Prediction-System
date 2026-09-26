jest.setTimeout(30000);

import { Logger } from '@nestjs/common';

// Mock console/logger output during tests to keep logs clean if needed,
// or just print mock info.
Logger.overrideLogger(['error', 'warn']);

jest.mock('ioredis', () => {
  const EventEmitter = require('events');
  class MockRedis extends EventEmitter {
    constructor() {
      super();
      // Emit connect event on next tick so the client thinks it's connected
      process.nextTick(() => this.emit('connect'));
    }
    defineCommand() {}
    quit() { return Promise.resolve('OK'); }
    disconnect() {}
    info() { return Promise.resolve('redis_version:7.0.0'); }
    multi() {
      return {
        exec: () => Promise.resolve([]),
      };
    }
  }
  return MockRedis;
});

jest.mock('bullmq', () => {
  const EventEmitter = require('events');
  class MockQueue extends EventEmitter {
    constructor() {
      super();
    }
    add() { return Promise.resolve({ id: 'mock-job-id' }); }
    close() { return Promise.resolve(); }
    on() { return this; }
  }
  class MockWorker extends EventEmitter {
    constructor() {
      super();
    }
    close() { return Promise.resolve(); }
    on() { return this; }
  }
  class MockQueueEvents extends EventEmitter {
    constructor() {
      super();
    }
    close() { return Promise.resolve(); }
    on() { return this; }
  }
  return {
    Queue: MockQueue,
    Worker: MockWorker,
    QueueEvents: MockQueueEvents,
  };
});
