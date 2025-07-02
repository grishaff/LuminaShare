import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";

// Lazy singleton instance
const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET as string,
  },
});

/**
 * Загружает изображение в R2 и возвращает публичный URL.
 * @param buffer содержимое файла
 * @param mime   MIME-тип (например, image/jpeg)
 */
export async function uploadImage(buffer: Buffer, mime = "image/jpeg"): Promise<string> {
  if (!process.env.R2_BUCKET) throw new Error("R2_BUCKET env missing");

  const key = crypto.randomUUID();

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mime,
      ACL: "public-read",
    })
  );

  return `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET}/${key}`;
} 