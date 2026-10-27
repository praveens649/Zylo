import { Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApiException } from '../common/api-error.js';
import { listMeta, pageParams } from '../common/pagination.js';
import { MailerService } from '../mail/mailer.service.js';
import { SYSTEM_ROLE } from '../common/constants.js';
import type { UserModel } from '../generated/prisma/models.js';
import type {
  CreateUserDto,
  ListUsersQueryDto,
  UpdateUserDto,
} from './dto.js';

function safeUser(user: UserModel) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    image: user.image ?? undefined,
    mustChangePassword: user.mustChangePassword,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

/** 16 url-safe chars — satisfies the min-10 policy and is email-friendly. */
function generateTempPassword(): string {
  return randomBytes(12).toString('base64url');
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  // ── createUser ────────────────────────────────────────────────────────────

  async createUser(input: CreateUserDto) {
    const taken = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (taken) {
      throw new ApiException(
        409,
        'EMAIL_IN_USE',
        'A user with this email already exists',
      );
    }

    // When no password is supplied, generate a secure random one — it is
    // emailed to the user and must be changed on first login.
    const tempPassword = input.password ?? generateTempPassword();
    const passwordWasGenerated = !input.password;

    const user = await this.prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: await bcrypt.hash(tempPassword, 12),
        role: input.role ?? 'CUSTOMER',
        image: input.image,
        mustChangePassword: true,
        isActive: true,
      },
    });

    // Mail is disabled outside production — in development the generated
    // password is returned in the response so it can be shared manually.
    const emailSent =
      process.env.NODE_ENV === 'production'
        ? await this.mailer
            .sendTempPasswordEmail({
              to: user.email,
              name: user.name,
              password: tempPassword,
            })
            .catch(() => false)
        : false;

    const temporaryPassword =
      passwordWasGenerated &&
      !emailSent &&
      process.env.NODE_ENV !== 'production'
        ? tempPassword
        : undefined;

    return { user: safeUser(user), emailSent, temporaryPassword };
  }

  // ── listUsers ─────────────────────────────────────────────────────────────

  async listUsers(query: ListUsersQueryDto) {
    const { search, page, limit } = query;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const { skip, take } = pageParams(query);
    const [total, docs] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
    ]);

    return { data: docs.map(safeUser), meta: listMeta(total, page, limit) };
  }

  // ── listUserOptions ───────────────────────────────────────────────────────

  /** Minimal picker data (id/name/email/role) for forms referencing users. */
  async listUserOptions() {
    return this.prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  // ── getUserById ───────────────────────────────────────────────────────────

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new ApiException(404, 'USER_NOT_FOUND', 'User not found');
    }
    return safeUser(user);
  }

  // ── updateUser ────────────────────────────────────────────────────────────

  async updateUser(id: string, input: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new ApiException(404, 'USER_NOT_FOUND', 'User not found');
    }

    // Prevent demoting the hardcoded system account
    if (user.role === SYSTEM_ROLE && input.role && input.role !== SYSTEM_ROLE) {
      throw new ApiException(
        400,
        'SUPER_ADMIN_ROLE_LOCKED',
        'The SUPER_ADMIN role cannot be changed',
      );
    }

    // Check email uniqueness if email is changed
    if (input.email && input.email !== user.email) {
      const taken = await this.prisma.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      });
      if (taken) {
        throw new ApiException(
          409,
          'EMAIL_IN_USE',
          'A user with this email already exists',
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (input.name) data.name = input.name;
    if (input.email) data.email = input.email;
    if (input.role) data.role = input.role;
    if (input.image !== undefined) data.image = input.image;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    if (input.password) {
      data.passwordHash = await bcrypt.hash(input.password, 12);
      data.mustChangePassword = true;
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
    });

    return safeUser(updated);
  }

  // ── deleteUser ────────────────────────────────────────────────────────────

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new ApiException(404, 'USER_NOT_FOUND', 'User not found');
    }

    if (user.role === SYSTEM_ROLE) {
      throw new ApiException(
        400,
        'SUPER_ADMIN_PROTECTED',
        'SUPER_ADMIN account cannot be deleted',
      );
    }

    await this.prisma.user.delete({ where: { id } });
  }
}
