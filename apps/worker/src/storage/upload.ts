import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

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

export async function uploadScreenshot(
  key: string,
  buffer: Buffer
): Promise<string> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: "image/png",
    })
  );

  const publicBase = process.env.S3_PUBLIC_URL ?? process.env.NEXT_PUBLIC_S3_PUBLIC_URL ?? "";
  return `${publicBase}/${key}`;
}

export function buildKey(reviewId: string, routeId: string, type: "before" | "after" | "diff"): string {
  return `reviews/${reviewId}/${routeId}/${type}.png`;
}
