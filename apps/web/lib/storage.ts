import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.S3_REGION ?? "us-east-1",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  },
  forcePathStyle: !!process.env.S3_ENDPOINT, // required for MinIO
});

const BUCKET = process.env.S3_BUCKET ?? "deploydiff-assets";

export async function uploadBuffer(
  key: string,
  buffer: Buffer,
  contentType: string = "image/png"
): Promise<string> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  // Return the public URL
  const publicBaseUrl = process.env.NEXT_PUBLIC_S3_PUBLIC_URL ?? "";
  return `${publicBaseUrl}/${key}`;
}

export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn });
}

export function getPublicUrl(key: string): string {
  const publicBaseUrl = process.env.NEXT_PUBLIC_S3_PUBLIC_URL ?? "";
  return `${publicBaseUrl}/${key}`;
}

export { s3Client, BUCKET };
