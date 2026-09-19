import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  NotFound,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { generateUuidV7 } from "@platform/database";
import {
  StorageService,
  PresignedUrlResponse,
  ObjectMetadata,
} from "./storage.interface";
import * as path from "path";

@Injectable()
export class S3StorageService implements StorageService, OnModuleInit {
  private readonly logger = new Logger(S3StorageService.name);
  private s3Client: S3Client;
  private bucket: string;

  constructor() {
    const region = process.env.S3_REGION || (process.env.NODE_ENV === "test" ? "us-east-1" : undefined);
    const endpoint = process.env.S3_ENDPOINT;
    const accessKeyId = process.env.S3_ACCESS_KEY || (process.env.NODE_ENV === "test" ? "test-key" : undefined);
    const secretAccessKey = process.env.S3_SECRET_KEY || (process.env.NODE_ENV === "test" ? "test-secret" : undefined);
    this.bucket = process.env.S3_BUCKET || "thequeue-media-local";
    const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";

    if (!region || !accessKeyId || !secretAccessKey) {
      if (process.env.NODE_ENV !== "test") {
        throw new Error("S3 environment variables are missing");
      }
    }

    this.s3Client = new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle, // Required for MinIO
    });
  }

  onModuleInit() {
    this.logger.log(
      `Initialized S3 Storage Service targeting bucket: ${this.bucket}`,
    );
  }

  private generateSafeObjectKey(
    prefix: string,
    originalFilename: string,
  ): string {
    const ext = path.extname(originalFilename).toLowerCase();
    const uniqueId = generateUuidV7();
    // Using a date-based partition helps prevent S3 throttling in large buckets
    const datePartition = new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "/");
    return `${prefix}/${datePartition}/${uniqueId}${ext}`;
  }

  async createPresignedUpload(
    prefix: string,
    filename: string,
    mimeType: string,
    expiresInSeconds: number = 3600,
  ): Promise<PresignedUrlResponse> {
    const objectKey = this.generateSafeObjectKey(prefix, filename);
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ContentType: mimeType,
    });

    const url = await getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    return {
      url,
      objectKey,
      expiresAt,
    };
  }

  async createPresignedDownload(
    objectKey: string,
    expiresInSeconds: number = 3600,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
    });

    return getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });
  }

  async headObject(objectKey: string): Promise<ObjectMetadata | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
      });

      const response = await this.s3Client.send(command);

      return {
        contentLength: response.ContentLength || 0,
        contentType: response.ContentType || "application/octet-stream",
        eTag: response.ETag,
      };
    } catch (error: any) {
      if (error instanceof NotFound || error.name === "NotFound") {
        return null;
      }
      this.logger.error(`Error heading object ${objectKey}: ${error.message}`);
      throw error;
    }
  }

  async verifyObjectExists(objectKey: string): Promise<boolean> {
    const metadata = await this.headObject(objectKey);
    return metadata !== null;
  }

  async deleteObject(objectKey: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
      });

      await this.s3Client.send(command);
    } catch (error: any) {
      this.logger.error(`Error deleting object ${objectKey}: ${error.message}`);
      throw error;
    }
  }
}
