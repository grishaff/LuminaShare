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
      .select("id, tg_id, role, display_name, avatar_url, bio, wallet_address, created_at")
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
    const { tgId, role, displayName, avatarUrl, bio, walletAddress } = req.body ?? {};

    if (!tgId || !displayName) {
      res.status(400).json({ error: "tgId and displayName are required" });
      return;
    }

    // Set default role if not provided
    const userRole = role || "user";

    // upsert on tg_id
    const { data, error } = await supabase
      .from("users")
      .upsert(
        {
          tg_id: tgId,
          role: userRole,
          display_name: displayName,
          avatar_url: avatarUrl,
          bio,
          wallet_address: walletAddress,
        },
        { onConflict: "tg_id", ignoreDuplicates: false }
      )
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ user: data });
    return;
  }

  if (req.method === "PUT") {
    // Update existing user profile
    const { tgId, displayName, bio, walletAddress } = req.body ?? {};

    if (!tgId) {
      res.status(400).json({ error: "tgId is required" });
      return;
    }

    const updateData: any = {};
    if (displayName) updateData.display_name = displayName;
    if (bio !== undefined) updateData.bio = bio;
    if (walletAddress !== undefined) updateData.wallet_address = walletAddress;

    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("tg_id", tgId)
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ user: data });
    return;
  }

  res.setHeader("Allow", "GET, POST, PUT");
  res.status(405).end("Method Not Allowed");
} 