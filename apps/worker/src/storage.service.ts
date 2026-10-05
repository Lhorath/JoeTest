import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";

export class StorageService {
  private s3Client: S3Client;
  private bucket: string;

  constructor() {
    const region = process.env.S3_REGION;
    const endpoint = process.env.S3_ENDPOINT;
    const accessKeyId = process.env.S3_ACCESS_KEY;
    const secretAccessKey = process.env.S3_SECRET_KEY;
    this.bucket = process.env.S3_BUCKET || "";
    const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";

    if (!region || !accessKeyId || !secretAccessKey || !this.bucket) {
      throw new Error("S3 environment variables are missing");
    }
    if (
      process.env.NODE_ENV === "production" &&
      (!endpoint || /localhost|127\.0\.0\.1|minio/i.test(endpoint))
    ) {
      throw new Error("Production object storage must use Cloudflare R2 or another non-local S3 endpoint");
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

  async getObjectStream(objectKey: string): Promise<Readable> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
    });
    const response = await this.s3Client.send(command);
    return response.Body as Readable;
  }

  async uploadObject(
    objectKey: string,
    body: Buffer | Readable,
    mimeType: string,
  ): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      Body: body,
      ContentType: mimeType,
    });
    await this.s3Client.send(command);
  }

  async deleteObject(objectKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
    });
    await this.s3Client.send(command);
  }
}
