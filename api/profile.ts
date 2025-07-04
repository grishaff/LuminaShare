import { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../utils/supabase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (typeof id !== "string") {
    res.status(400).json({ error: "id query parameter is required" });
    return;
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).end("Method Not Allowed");
    return;
  }

  try {
    // fetch user profile
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, tg_id, role, display_name, avatar_url, bio, wallet_address, created_at, username")
      .eq("id", id)
      .single();

    if (userError) {
      res.status(404).json({ error: userError.message });
      return;
    }

    // fetch recent announcements by the user (max 10)
    const { data: announcements, error: annError } = await supabase
      .from("announcements")
      .select("id, title, image_url, created_at")
      .eq("recipient_id", id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (annError) {
      res.status(500).json({ error: annError.message });
      return;
    }

    res.status(200).json({ profile: user, announcements });
  } catch (error) {
    console.error("Profile API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
} 