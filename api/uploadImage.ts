import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import https from "https";
import crypto from "crypto";

// Disable socket keep-alive to avoid TLS handshake failures that occur when a
// warm Vercel Serverless Function re-uses a stale TLS connection. We create a
// minimal HTTPS agent without keep-alive and pass it via a custom request
// handler.
const httpsAgent = new https.Agent({ keepAlive: false });

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET as string,
  },
  requestHandler: new NodeHttpHandler({ httpsAgent }),
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
    })
  );

  return `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET}/${key}`;
} 