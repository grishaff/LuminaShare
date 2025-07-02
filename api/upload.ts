import type { VercelRequest, VercelResponse } from "@vercel/node";
import formidable, { File, Fields, Files } from "formidable";
import fs from "fs/promises";
import { uploadImage } from "./uploadImage";

export const config = {
  api: {
    bodyParser: false, // отключаем встроенный парсер, будем использовать formidable
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const form = formidable({ maxFileSize: 5 * 1024 * 1024 }); // 5 MB
    const { fields, files } = await new Promise<{
      fields: Fields;
      files: Files;
    }>((resolve, reject) => {
      form.parse(req, (err: any, fields: Fields, files: Files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    // "files.image" может быть File или File[] (formidable v3)
    const entry = files.image as File | File[] | undefined;
    if (!entry) {
      return res.status(400).json({ error: "No image field provided" });
    }

    const file: File = Array.isArray(entry) ? entry[0] : entry;
    if (!file.filepath) {
      return res.status(500).json({ error: "Filepath missing" });
    }

    const buffer = await fs.readFile(file.filepath);
    const imageUrl = await uploadImage(buffer, file.mimetype || "image/jpeg");

    return res.status(200).json({ ok: true, url: imageUrl });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Upload failed" });
  }
} 