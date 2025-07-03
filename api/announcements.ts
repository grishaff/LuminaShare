import { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../utils/supabase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("announcements")
      .select("id,title,description,image_url,recipient_wallet,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ announcements: data });
    return;
  }

  if (req.method === "POST") {
    const { title, description, imageUrl, recipientWallet } = req.body ?? {};

    if (!title || !imageUrl || !recipientWallet) {
      res.status(400).json({ error: "title, imageUrl and recipientWallet are required" });
      return;
    }

    const { data, error } = await supabase
      .from("announcements")
      .insert({
        title,
        description,
        image_url: imageUrl,
        recipient_wallet: recipientWallet,
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(201).json({ announcement: data });
    return;
  }

  // Method not allowed
  res.setHeader("Allow", "GET, POST");
  res.status(405).end("Method Not Allowed");
} 