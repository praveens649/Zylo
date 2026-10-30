import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { MailModule } from './mail/mail.module.js';
import { StorageModule } from './storage/storage.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { SimsModule } from './sims/sims.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { StripeModule } from './stripe/stripe.module.js';
import { PlansModule } from './plans/plans.module.js';
import { SetTopBoxModule } from './set-top-box/set-top-box.module.js';
import { WifiModule } from './wifi/wifi.module.js';
import { RechargeModule } from './recharge/recharge.module.js';
import { ParkingModule } from './parking/parking.module.js';
import { TravelEsimModule } from './travel-esim/travel-esim.module.js';
import { NumbersModule } from './numbers/numbers.module.js';
import { OnboardingModule } from './onboarding/onboarding.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { UsageSimulationModule } from './usage-simulation/usage-simulation.module.js';
import { ScheduleModule } from '@nestjs/schedule';
import { DataBankModule } from './data-bank/data-bank.module.js';
import { DataQuestModule } from './data-quest/data-quest.module.js';
import { DataTransferModule } from './data-transfer/data-transfer.module.js';
import { MusicModule } from './music/music.module.js';
import { SupportModule } from './support/support.module.js';
import { LoansModule } from './loans/loans.module.js';
import { ApiExceptionFilter } from './common/api-exception.filter.js';
import { EnvelopeInterceptor } from './common/envelope.interceptor.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 100,
      },
    ]),
    PrismaModule,
    RedisModule,
    MailModule,
    StorageModule,
    AuthModule,
    UsersModule,
    OrdersModule,
    SimsModule,
    PaymentsModule,
    StripeModule,
    PlansModule,
    SetTopBoxModule,
    WifiModule,
    RechargeModule,
    ParkingModule,
    TravelEsimModule,
    NumbersModule,
    OnboardingModule,
    NotificationsModule,
    UsageSimulationModule,
    LoansModule,
    DataBankModule,
    DataQuestModule,
    DataTransferModule,
    MusicModule,
    SupportModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: ApiExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: EnvelopeInterceptor,
    },
  ],
})
export class AppModule {}
