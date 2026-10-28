import { api } from "@/lib/api";

export interface UploadedFile {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
}

export const storageApi = {
  /**
   * Upload a business verification document (PDF, JPEG, PNG, WEBP — max 10 MB).
   * Requires authentication; returns the StoredFile record for linking.
   */
  uploadDocument: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.postFormData<UploadedFile>(
      "/api/v1/storage/upload-document",
      formData
    );
  },
};
