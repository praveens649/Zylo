import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service.js';
import { avatarMulterOptions } from '../common/avatar-upload.js';
import { documentMulterOptions } from '../common/document-upload.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { Throttle } from '@nestjs/throttler';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * Serve binary file from database object storage.
   * Public endpoint so user avatars can be rendered anywhere.
   */
  @Get(':id')
  async getFile(@Param('id') id: string, @Res() res: Response) {
    const file = await this.storageService.getFile(id);

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.size.toString());
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(file.filename)}"`,
    );

    return res.end(file.data);
  }

  /**
   * Generic file upload endpoint that persists to database object storage.
   */
  @Post('upload')
  @Throttle({ default: { limit: 20, ttl: 900_000 } })
  @UseInterceptors(FileInterceptor('file', avatarMulterOptions))
  async uploadFile(@UploadedFile() file?: Express.Multer.File) {
    const saved = await this.storageService.saveFile(file!);
    return { data: saved };
  }

  /**
   * Authenticated upload for business verification documents (PDF/images).
   */
  @Post('upload-document')
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 10, ttl: 900_000 } })
  @UseInterceptors(FileInterceptor('file', documentMulterOptions))
  async uploadDocument(@UploadedFile() file?: Express.Multer.File) {
    const saved = await this.storageService.saveFile(file!);
    return { data: saved };
  }
}
