import { Global, Module } from '@nestjs/common';
import { ApiKeysService } from './apikeys.service.js';
import { ApiKeysController } from './apikeys.controller.js';

@Global()
@Module({
  providers: [ApiKeysService],
  controllers: [ApiKeysController],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
