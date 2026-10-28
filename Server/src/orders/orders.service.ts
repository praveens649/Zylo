import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApiException } from '../common/api-error.js';
import { listMeta, pageParams } from '../common/pagination.js';
import { SYSTEM_ROLE } from '../common/constants.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { UserModel } from '../generated/prisma/models.js';
import type { ListOrdersQueryDto } from './dto.js';

const ORDER_INCLUDE = {
  user: {
    select: { id: true, name: true, email: true },
  },
  plan: {
    select: { id: true, name: true },
  },
  phoneNumber: {
    select: { id: true, number: true },
  },
  payment: {
    select: { id: true, status: true },
  },
} satisfies Prisma.OrderInclude;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Customers see their own orders; admins see everything (+ filters). */
  async listOrders(query: ListOrdersQueryDto, user: UserModel) {
    const admin = user.role === SYSTEM_ROLE;
    const where: Prisma.OrderWhereInput = {};

    if (admin) {
      if (query.userId) where.userId = query.userId;
    } else {
      where.userId = user.id;
    }

    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    const { skip, take } = pageParams(query);
    const [total, data] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
    ]);

    return { data, meta: listMeta(total, query.page, query.limit) };
  }

  async getOrder(id: string, user: UserModel) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });
    if (!order) {
      throw new ApiException(404, 'ORDER_NOT_FOUND', 'Order not found');
    }
    if (user.role !== SYSTEM_ROLE && order.userId !== user.id) {
      throw new ApiException(
        403,
        'FORBIDDEN',
        'You can only view your own orders',
      );
    }
    return order;
  }
}
