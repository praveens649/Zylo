import { memoryStorage } from 'multer';
import { ApiException } from './api-error.js';

export const avatarStorage = memoryStorage();

export const avatarFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiException(
        400,
        'INVALID_FILE_TYPE',
        'Only JPEG, PNG, WEBP, and GIF images are allowed',
      ),
      false,
    );
  }
};

export const avatarMulterOptions = {
  storage: avatarStorage,
  fileFilter: avatarFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
};
