import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { SimsController } from './sims.controller.js';
import { SimsService } from './sims.service.js';

@Module({
  imports: [AuthModule],
  controllers: [SimsController],
  providers: [SimsService],
  exports: [SimsService],
})
export class SimsModule {}
