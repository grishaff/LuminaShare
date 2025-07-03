import { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../utils/supabase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const { tgId } = req.query;
    if (!tgId || typeof tgId !== "string") {
      res.status(400).json({ error: "tgId query param required" });
      return;
    }

    const { data, error } = await supabase
      .from("users")
      .select("id, tg_id, role, display_name, avatar_url, bio, created_at")
      .eq("tg_id", tgId)
      .single();

    if (error) {
      res.status(404).json({ error: error.message });
      return;
    }

    res.status(200).json({ profile: data });
    return;
  }

  if (req.method === "POST") {
    const { tgId, role, displayName, avatarUrl, bio } = req.body ?? {};

    if (!tgId || !role || !displayName) {
      res.status(400).json({ error: "tgId, role and displayName are required" });
      return;
    }

    // upsert on tg_id
    const { data, error } = await supabase
      .from("users")
      .upsert(
        {
          tg_id: tgId,
          role,
          display_name: displayName,
          avatar_url: avatarUrl,
          bio,
        },
        { onConflict: "tg_id", ignoreDuplicates: false }
      )
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ profile: data });
    return;
  }

  res.setHeader("Allow", "GET, POST");
  res.status(405).end("Method Not Allowed");
} 