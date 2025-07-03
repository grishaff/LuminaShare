import { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../utils/supabase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).end("Method Not Allowed");
    return;
  }

  // агрегируем донаты по donor_tg_id
  const { data, error } = await supabase
    .from("donations")
    .select("donor_tg_id, sum:amount_ton")
    .group("donor_tg_id")
    .order("sum", { ascending: false })
    .limit(100);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json({ ranking: data });
}
