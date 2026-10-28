import { Module } from '@nestjs/common';
import { UsageSimulationController } from './usage-simulation.controller.js';
import { UsageSimulationService } from './usage-simulation.service.js';

/**
 * Data usage simulation feature.
 *   POST /api/v1/sims/:simId/usage/start
 *   GET  /api/v1/sims/:simId/usage
 *   POST /api/v1/sims/:simId/usage/stop
 *
 * PrismaService is provided globally via PrismaModule imported in AppModule.
 */
@Module({
  controllers: [UsageSimulationController],
  providers: [UsageSimulationService],
  exports: [UsageSimulationService],
})
export class UsageSimulationModule {}
