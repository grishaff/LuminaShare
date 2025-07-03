import { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../utils/supabase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log(`[${req.method}] /api/users`, req.body || req.query);

  if (req.method === "GET") {
    const { tgId } = req.query;
    if (!tgId || typeof tgId !== "string") {
      res.status(400).json({ error: "tgId query param required" });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*") // Выбираем все доступные поля
        .eq("tg_id", tgId)
        .single();

      if (error) {
        console.log("Supabase error (GET):", error);
        res.status(404).json({ error: error.message });
        return;
      }

      res.status(200).json({ profile: data });
    } catch (err) {
      console.error("Unexpected error (GET):", err);
      res.status(500).json({ error: "Internal server error" });
    }
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

    // Создаем базовый объект только с обязательными полями
    const userData: any = {
      tg_id: tgId,
      role: userRole,
      display_name: displayName,
    };

    // Добавляем опциональные поля только если они переданы
    if (avatarUrl) userData.avatar_url = avatarUrl;
    if (bio) userData.bio = bio;
    if (walletAddress) userData.wallet_address = walletAddress;

    try {
      console.log("Attempting to create user with data:", userData);

      const { data, error } = await supabase
        .from("users")
        .upsert(userData, { onConflict: "tg_id", ignoreDuplicates: false })
        .select()
        .single();

      if (error) {
        console.error("Supabase error (POST):", error);
        res.status(500).json({ error: error.message, details: error });
        return;
      }

      console.log("User created successfully:", data);
      res.status(200).json({ user: data });
    } catch (err) {
      console.error("Unexpected error (POST):", err);
      res.status(500).json({ error: "Internal server error", details: err });
    }
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

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    try {
      console.log("Attempting to update user:", tgId, updateData);

      const { data, error } = await supabase
        .from("users")
        .update(updateData)
        .eq("tg_id", tgId)
        .select()
        .single();

      if (error) {
        console.error("Supabase error (PUT):", error);
        res.status(500).json({ error: error.message, details: error });
        return;
      }

      console.log("User updated successfully:", data);
      res.status(200).json({ user: data });
    } catch (err) {
      console.error("Unexpected error (PUT):", err);
      res.status(500).json({ error: "Internal server error", details: err });
    }
    return;
  }

  res.setHeader("Allow", "GET, POST, PUT");
  res.status(405).end("Method Not Allowed");
} 