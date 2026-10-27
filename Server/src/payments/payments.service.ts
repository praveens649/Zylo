import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApiException } from '../common/api-error.js';
import { listMeta, pageParams } from '../common/pagination.js';
import { SYSTEM_ROLE } from '../common/constants.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { UserModel } from '../generated/prisma/models.js';
import type { ListPaymentsQueryDto } from './dto.js';

const PAYMENT_INCLUDE = {
  user: {
    select: { id: true, name: true, email: true },
  },
} satisfies Prisma.PaymentInclude;

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Customers see their own payments; admins see everything (+ filters). */
  async listPayments(query: ListPaymentsQueryDto, user: UserModel) {
    const admin = user.role === SYSTEM_ROLE;
    const where: Prisma.PaymentWhereInput = {};

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
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        include: PAYMENT_INCLUDE,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
    ]);

    return { data, meta: listMeta(total, query.page, query.limit) };
  }

  async getPayment(id: string, user: UserModel) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: PAYMENT_INCLUDE,
    });
    if (!payment) {
      throw new ApiException(404, 'PAYMENT_NOT_FOUND', 'Payment not found');
    }
    if (user.role !== SYSTEM_ROLE && payment.userId !== user.id) {
      throw new ApiException(
        403,
        'FORBIDDEN',
        'You can only view your own payments',
      );
    }
    return payment;
  }
}
