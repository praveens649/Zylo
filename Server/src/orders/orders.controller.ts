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
import { OrdersService } from './orders.service.js';
import { ListOrdersQueryDto } from './dto.js';

/**
 * Order history — customers see their own orders, admins see all.
 * Orders are created by purchases/recharges and fulfilled by Stripe
 * webhooks; there is no direct order-creation endpoint.
 */
@Controller('orders')
@UseGuards(AuthGuard, RequirePasswordChangedGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(@Query() query: ListOrdersQueryDto, @CurrentUser() user: UserModel) {
    return this.orders.listOrders(query, user).then((r) => ({
      data: r.data,
      meta: r.meta,
    }));
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserModel) {
    return this.orders.getOrder(id, user).then((data) => ({ data }));
  }
}
