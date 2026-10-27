import { Global, Module } from '@nestjs/common';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthGuard } from './auth.guard.js';
import { AdminGuard } from './admin.guard.js';
import { RequirePasswordChangedGuard } from './require-password-changed.guard.js';

import { StorageModule } from '../storage/storage.module.js';

@Global()
@Module({
  imports: [
    PrismaModule,
    StorageModule,
    // Read env at DI time — ConfigModule has loaded .env.local by then.
    JwtModule.registerAsync({
      global: true,
      useFactory: () => ({
        secret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
        signOptions: {
          expiresIn: (process.env.JWT_EXPIRES_IN ||
            '24h') as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthGuard,
    AdminGuard,
    RequirePasswordChangedGuard,
  ],
  exports: [
    AuthService,
    AuthGuard,
    AdminGuard,
    RequirePasswordChangedGuard,
  ],
})
export class AuthModule {}
