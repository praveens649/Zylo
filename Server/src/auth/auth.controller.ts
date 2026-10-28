import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { avatarMulterOptions } from '../common/avatar-upload.js';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApiException } from '../common/api-error.js';
import { AuthService, type UserWithRole } from './auth.service.js';
import {
  AuthGuard,
  type AuthenticatedRequest,
} from './auth.guard.js';
import { CurrentUser } from './current-user.decorator.js';
import {
  ChangePasswordDto,
  LoginDto,
  RegisterDto,
  UpdateProfileDto,
} from './dto.js';

import { StorageService } from '../storage/storage.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 900_000 } })
  async login(@Body() dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (
      !user ||
      !user.isActive ||
      !(await bcrypt.compare(dto.password, user.passwordHash))
    ) {
      throw new ApiException(
        401,
        'INVALID_CREDENTIALS',
        'Invalid email or password',
      );
    }

    const token = await this.auth.issueToken(user);

    return {
      data: { user: await this.auth.safeUser(user), token },
    };
  }

  /**
   * Public self-signup — new accounts are always CUSTOMERs.
   * Auto-logs the user in (a JWT is returned with the response).
   */
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  async register(@Body() dto: RegisterDto) {
    const taken = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (taken) {
      throw new ApiException(
        409,
        'EMAIL_IN_USE',
        'A user with this email already exists',
      );
    }

    const defaultName = dto.name?.trim() || dto.email.split('@')[0];

    const user = await this.prisma.user.create({
      data: {
        name: defaultName,
        email: dto.email,
        passwordHash: await bcrypt.hash(dto.password, 12),
        image: dto.image,
        mustChangePassword: false,
        isActive: true,
      },
    });

    const token = await this.auth.issueToken(user);

    return {
      data: { user: await this.auth.safeUser(user), token },
    };
  }

  /**
   * Public avatar upload for the signup form (not yet authenticated).
   * Returns a relative path to pass as `image` on register.
   */
  @Post('upload-avatar')
  @Throttle({ default: { limit: 10, ttl: 900_000 } })
  @UseInterceptors(FileInterceptor('avatar', avatarMulterOptions))
  async uploadAvatar(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new ApiException(
        400,
        'NO_FILE_UPLOADED',
        'No image file provided',
      );
    }
    const saved = await this.storage.saveFile(file);
    return {
      data: {
        url: saved.url,
        filename: saved.filename,
        id: saved.id,
      },
    };
  }

  /**
   * Logout — the token is added to a Redis blocklist for its remaining
   * lifetime, so it stops working server-side immediately. The client
   * also discards its copy.
   */
  @Post('logout')
  @UseGuards(AuthGuard)
  async logout(@Req() req: AuthenticatedRequest) {
    await this.auth.revokeToken(req.accessToken);
    return { data: { message: 'Logged out successfully' } };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@CurrentUser() user: UserWithRole) {
    return { data: { user: await this.auth.safeUser(user) } };
  }

  /**
   * Self-service profile update — any signed-in user may change their own
   * name and avatar. Email/role/status remain admin-managed.
   */
  @Patch('me')
  @UseGuards(AuthGuard)
  async updateProfile(
    @Body() dto: UpdateProfileDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = await this.prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.image !== undefined ? { image: dto.image } : {}),
      },
    });
    return { data: { user: await this.auth.safeUser(user) } };
  }

  /**
   * Authenticated avatar upload — same storage path as the public signup
   * upload, for users updating their profile photo after sign-in.
   */
  @Post('me/avatar')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('avatar', avatarMulterOptions))
  async uploadProfileAvatar(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new ApiException(
        400,
        'NO_FILE_UPLOADED',
        'No image file provided',
      );
    }
    const saved = await this.storage.saveFile(file);
    return {
      data: {
        url: saved.url,
        filename: saved.filename,
        id: saved.id,
      },
    };
  }

  @Patch('change-password')
  @UseGuards(AuthGuard)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user || !user.isActive) {
      throw new ApiException(401, 'TOKEN_INVALID', 'Please log in again');
    }

    const passwordMatches = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new ApiException(
        400,
        'INCORRECT_CURRENT_PASSWORD',
        'Current password is incorrect',
      );
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new ApiException(
        400,
        'PASSWORD_UNCHANGED',
        'Choose a different password',
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(dto.newPassword, 12),
        mustChangePassword: false,
      },
    });

    // The old token is revoked — password change ends the session.
    await this.auth.revokeToken(req.accessToken);

    // Issue a fresh token after a credential change.
    const token = await this.auth.issueToken(user);

    return {
      data: { message: 'Password changed successfully', token },
    };
  }
}
