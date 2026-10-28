import { memoryStorage } from 'multer';
import { ApiException } from './api-error.js';

export const documentStorage = memoryStorage();

export const documentFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) => {
  const allowed = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiException(
        400,
        'INVALID_FILE_TYPE',
        'Only PDF, JPEG, PNG, and WEBP documents are allowed',
      ),
      false,
    );
  }
};

export const documentMulterOptions = {
  storage: documentStorage,
  fileFilter: documentFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
};
