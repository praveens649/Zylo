import { Module } from '@nestjs/common';
import { NumbersController } from './numbers.controller.js';
import { NumbersService } from './numbers.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [NumbersController],
  providers: [NumbersService],
  exports: [NumbersService],
})
export class NumbersModule {}
