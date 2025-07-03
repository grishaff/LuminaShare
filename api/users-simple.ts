import { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../utils/supabase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Устанавливаем правильные заголовки
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache');
  
  console.log(`[SIMPLE] [${req.method}] /api/users-simple`, req.body || req.query);

  if (req.method === "GET") {
    const { tgId } = req.query;
    if (!tgId || typeof tgId !== "string") {
      res.status(400).json({ error: "tgId query param required" });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, tg_id, display_name, role, created_at")
        .eq("tg_id", tgId)
        .single();

      if (error) {
        console.log("User not found:", error);
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.status(200).json({ profile: data });
    } catch (err) {
      console.error("Error in GET:", err);
      res.status(500).json({ error: "Internal server error" });
    }
    return;
  }

  if (req.method === "POST") {
    const { tgId, displayName } = req.body ?? {};

    if (!tgId || !displayName) {
      res.status(400).json({ error: "tgId and displayName are required" });
      return;
    }

    try {
      // Простая вставка только с обязательными полями
      const userData = {
        tg_id: Number(tgId),
        display_name: displayName,
        role: "user"
      };

      console.log("Creating simple user:", userData);

      // Используем upsert вместо insert для избежания конфликтов
      const { data, error } = await supabase
        .from("users")
        .upsert(userData, { onConflict: "tg_id", ignoreDuplicates: false })
        .select("id, tg_id, display_name, role, created_at")
        .single();

      if (error) {
        console.error("Upsert error:", error);
        res.status(500).json({ error: error.message, details: error });
        return;
      }

      console.log("User created:", data);
      res.status(200).json({ user: data });
    } catch (err) {
      console.error("Error in POST:", err);
      res.status(500).json({ error: "Internal server error" });
    }
    return;
  }

  res.setHeader("Allow", "GET, POST");
  res.status(405).end("Method Not Allowed");
} 