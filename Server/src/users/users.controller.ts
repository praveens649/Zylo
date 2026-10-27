import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiException } from '../common/api-error.js';
import { avatarMulterOptions } from '../common/avatar-upload.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { RequirePasswordChangedGuard } from '../auth/require-password-changed.guard.js';
import { UsersService } from './users.service.js';
import {
  CreateUserDto,
  ListUsersQueryDto,
  UpdateUserDto,
} from './dto.js';

import { StorageService } from '../storage/storage.service.js';

// User-account provisioning — SUPER_ADMIN only.
@Controller('users')
@UseGuards(AuthGuard, RequirePasswordChangedGuard, AdminGuard)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly storage: StorageService,
  ) {}

  @Post()
  createUser(@Body() dto: CreateUserDto) {
    return this.users.createUser(dto).then((data) => ({ data }));
  }

  @Post('upload-avatar')
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

  // Picker list — must precede :id so "options" isn't parsed as a uuid.
  @Get('options')
  async listUserOptions() {
    return { data: await this.users.listUserOptions() };
  }

  @Get()
  async listUsers(@Query() query: ListUsersQueryDto) {
    const { data, meta } = await this.users.listUsers(query);
    return { data, meta };
  }

  @Get(':id')
  async getUser(@Param('id', ParseUUIDPipe) id: string) {
    return { data: { user: await this.users.getUserById(id) } };
  }

  @Patch(':id')
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return { data: { user: await this.users.updateUser(id, dto) } };
  }

  @Delete(':id')
  async deleteUser(@Param('id', ParseUUIDPipe) id: string) {
    await this.users.deleteUser(id);
    return { data: { message: 'User deleted' } };
  }
}
