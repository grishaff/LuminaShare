import { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../utils/supabase";
import { randomUUID } from "crypto";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
    return;
  }

  const { announcementId, donorTgId, amountTon, txHash } = req.body ?? {};

  if (!announcementId || !donorTgId || !amountTon || !txHash) {
    res.status(400).json({ error: "announcementId, donorTgId, amountTon, txHash are required" });
    return;
  }

  // ensure donor exists in users table
  await supabase
    .from("users")
    .upsert(
      {
        tg_id: donorTgId,
        role: "donor",
        display_name: `tg${donorTgId}`, // placeholder, can be updated later
      },
      { onConflict: "tg_id", ignoreDuplicates: false }
    );

  // insert donation
  const { data, error } = await supabase
    .from("donations")
    .insert({
      id: randomUUID(),
      announcement_id: announcementId,
      donor_tg_id: donorTgId,
      amount_ton: amountTon,
      tx_hash: txHash,
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json({ donation: data });
} 