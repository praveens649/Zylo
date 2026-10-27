import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from './prisma/prisma.service.js';
import { renderLandingPage } from './common/landing-page.js';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  // Branded landing page for browsers hitting the root.
  @Get()
  landing(@Res() res: Response) {
    res
      .status(200)
      .type('html')
      .send(
        renderLandingPage({
          version: process.env.npm_package_version ?? '1.0.0',
          uptimeSeconds: process.uptime(),
          docsEnabled: false,
        }),
      );
  }

  @Get('health')
  async health() {
    let dbConnected = true;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbConnected = false;
    }

    return {
      data: {
        status: dbConnected ? 'ok' : 'degraded',
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
        db: { status: dbConnected ? 'connected' : 'disconnected' },
        version: process.env.npm_package_version ?? '1.0.0',
      },
    };
  }
}
