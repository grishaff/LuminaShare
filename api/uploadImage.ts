import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import https from "https";
import crypto from "crypto";

// Cloudflare closes idle TLS connections after ~5-6 minutes. In a warm
// Vercel Serverless Function the Node.js process survives between
// invocations, so an old socket can stay in `freeSockets` and be reused by
// the AWS client even when `keepAlive` is false.  Re-using that half-closed
// socket triggers the `EPROTO ssl3_read_bytes:ssl/tls alert handshake
// failure` error we keep seeing.
//
// Setting `maxFreeSockets: 0` makes Node destroy sockets instead of caching
// them, *guaranteeing* that each call opens a fresh TLS connection.  We also
// turn off `keepAlive` and add a 30-second timeout just to be extra safe.
const httpsAgent = new https.Agent({
  keepAlive: false,
  maxFreeSockets: 0,
  timeout: 30_000, // close even hung sockets quickly
});

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