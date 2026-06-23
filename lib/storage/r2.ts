import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export function createR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT ?? "http://localhost:9000",
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    },
    forcePathStyle: true,  // required for MinIO and R2
  });
}

export async function uploadImageToR2(
  imageBuffer: Buffer,
  storagePath: string,
  contentType: string = "image/jpeg"
): Promise<void> {
  const client = createR2Client();
  const bucket = process.env.R2_BUCKET_NAME ?? "english-learning";

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: storagePath,
      Body: imageBuffer,
      ContentType: contentType,
    })
  );
}

export async function getSignedImageUrl(
  storagePath: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  const client = createR2Client();
  const bucket = process.env.R2_BUCKET_NAME ?? "english-learning";

  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: storagePath }),
    { expiresIn: expiresInSeconds }
  );
}
