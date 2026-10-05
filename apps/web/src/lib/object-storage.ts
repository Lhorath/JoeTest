import { PutObjectCommand, S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const ALLOWED_AUDIO = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
  "audio/aac",
  "audio/mp4",
  "audio/ogg",
  "audio/webm",
]);

const BLOCKED_EXTENSION = /\.(exe|bat|cmd|com|sh|js|mjs|cjs|html|htm|svg|php|dll|ps1|jar|scr)$/i;

export function assertSafeAudioUpload(filename: string, mimeType: string): void {
  const name = filename.trim();
  const mime = mimeType.trim().toLowerCase();
  if (!name || BLOCKED_EXTENSION.test(name) || name.includes("..") || name.includes("/") || name.includes("\\")) {
    throw new Error("This file cannot be uploaded");
  }
  if (!ALLOWED_AUDIO.has(mime)) {
    throw new Error("Upload an audio file (MP3, WAV, FLAC, AAC, M4A, or OGG)");
  }
}

export function storageConfigured(): boolean {
  return Boolean(
    process.env.S3_ENDPOINT &&
      process.env.S3_REGION &&
      process.env.S3_BUCKET &&
      process.env.S3_ACCESS_KEY &&
      process.env.S3_SECRET_KEY,
  );
}

function client(): S3Client {
  if (!storageConfigured()) {
    throw new Error("Object storage is not configured");
  }
  return new S3Client({
    region: process.env.S3_REGION,
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY as string,
      secretAccessKey: process.env.S3_SECRET_KEY as string,
    },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  });
}

export async function createAudioUploadUrl(filename: string, mimeType: string): Promise<{
  objectKey: string;
  uploadUrl: string;
  expiresAt: string;
}> {
  assertSafeAudioUpload(filename, mimeType);
  const extension = filename.includes(".") ? filename.slice(filename.lastIndexOf(".")).toLowerCase() : "";
  const objectKey = `tracks/${new Date().toISOString().slice(0, 10).replace(/-/g, "/")}/${randomUUID()}${extension}`;
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: objectKey,
    ContentType: mimeType,
  });
  const uploadUrl = await getSignedUrl(client(), command, { expiresIn: 900 });
  return {
    objectKey,
    uploadUrl,
    expiresAt: new Date(Date.now() + 900_000).toISOString(),
  };
}

export async function audioObjectExists(objectKey: string): Promise<boolean> {
  if (!storageConfigured()) return false;
  try {
    await client().send(
      new HeadObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: objectKey,
      }),
    );
    return true;
  } catch {
    return false;
  }
}
