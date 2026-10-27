import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApiException } from '../common/api-error.js';

@Injectable()
export class StorageService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Stores a file buffer directly into the database as object storage.
   */
  async saveFile(file: Express.Multer.File) {
    if (!file || !file.buffer) {
      throw new ApiException(400, 'NO_FILE_UPLOADED', 'No image file provided');
    }

    const record = await this.prisma.storedFile.create({
      data: {
        filename: file.originalname || 'upload.bin',
        mimeType: file.mimetype || 'application/octet-stream',
        size: file.size ?? file.buffer.length,
        data: new Uint8Array(file.buffer),
      },
    });

    return {
      id: record.id,
      filename: record.filename,
      mimeType: record.mimeType,
      size: record.size,
      url: `/api/v1/storage/${record.id}`,
    };
  }

  /**
   * Retrieves a stored file by ID from the database.
   */
  async getFile(id: string) {
    const file = await this.prisma.storedFile.findUnique({
      where: { id },
    });

    if (!file) {
      throw new ApiException(404, 'FILE_NOT_FOUND', 'Stored file not found');
    }

    return file;
  }

  /**
   * Deletes a stored file by ID.
   */
  async deleteFile(id: string) {
    try {
      await this.prisma.storedFile.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }
}
