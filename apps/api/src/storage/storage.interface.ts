export const STORAGE_SERVICE = "STORAGE_SERVICE";

export interface PresignedUrlResponse {
  url: string;
  objectKey: string;
  expiresAt: Date;
}

export interface ObjectMetadata {
  contentLength: number;
  contentType: string;
  eTag?: string;
}

export interface StorageService {
  createPresignedUpload(
    prefix: string,
    filename: string,
    mimeType: string,
    expiresInSeconds?: number,
  ): Promise<PresignedUrlResponse>;

  createPresignedDownload(
    objectKey: string,
    expiresInSeconds?: number,
  ): Promise<string>;

  headObject(objectKey: string): Promise<ObjectMetadata | null>;

  deleteObject(objectKey: string): Promise<void>;

  verifyObjectExists(objectKey: string): Promise<boolean>;
}
