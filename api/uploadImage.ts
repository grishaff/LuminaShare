import { VercelRequest, VercelResponse } from "@vercel/node";
import formidable from "formidable";
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
  minVersion: "TLSv1.2",
  maxVersion: "TLSv1.2", // Cloudflare occasionally aborts TLS 1.3 handshakes from Node
});

// We build the S3 client *inside* each upload so that every invocation gets a
// brand-new TLS connection.  This completely rules out problems caused by
// stale sockets that survive between warm invocations of the Serverless
// Function.
function createS3Client() {
  return new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.R2_KEY_ID as string,
      secretAccessKey: process.env.R2_SECRET as string,
    },
    requestHandler: new NodeHttpHandler({ httpsAgent }),
  });
}

/**
 * Загружает изображение в R2 и возвращает публичный URL.
 * @param buffer содержимое файла
 * @param mime   MIME-тип (например, image/jpeg)
 */
export async function uploadImage(buffer: Buffer, mime = "image/jpeg"): Promise<string> {
  if (!process.env.R2_BUCKET) throw new Error("R2_BUCKET env missing");

  const key = crypto.randomUUID();

  const s3 = createS3Client();

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mime,
    })
  );

  // Explicitly close all sockets opened by the client so that nothing leaks
  // into the next invocation.
  s3.destroy();

  // Use public R2.dev URL instead of private endpoint
  const publicDomain = process.env.R2_PUBLIC_URL;
  return `${publicDomain}/${key}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
    return;
  }

  try {
    const form = formidable({
      maxFileSize: 5 * 1024 * 1024, // 5MB max
    });

    const [fields, files] = await new Promise<[any, any]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const buffer = await require("fs").promises.readFile(file.filepath);
    const url = await uploadImage(buffer, file.mimetype || "image/jpeg");

    res.status(200).json({ ok: true, url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
} 