import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { RequirePasswordChangedGuard } from '../auth/require-password-changed.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { UserModel } from '../generated/prisma/models.js';
import { PaymentsService } from './payments.service.js';
import { ListPaymentsQueryDto } from './dto.js';

/**
 * Payment history — customers see their own payments, admins see all.
 * Payments are created by bookings and Stripe webhooks; there is no
 * direct payment-creation endpoint.
 */
@Controller('payments')
@UseGuards(AuthGuard, RequirePasswordChangedGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  list(
    @Query() query: ListPaymentsQueryDto,
    @CurrentUser() user: UserModel,
  ) {
    return this.payments.listPayments(query, user).then((r) => ({
      data: r.data,
      meta: r.meta,
    }));
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserModel) {
    return this.payments.getPayment(id, user).then((data) => ({ data }));
  }
}
