import { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../utils/supabase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { username } = req.query;
  if (typeof username !== "string") {
    res.status(400).json({ error: "username query parameter is required" });
    return;
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).end("Method Not Allowed");
    return;
  }

  try {
    // Получаем профиль пользователя
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, tg_id, role, display_name, avatar_url, bio, wallet_address, created_at, username")
      .eq("username", username)
      .single();

    if (userError || !user) {
      res.status(404).json({ error: userError?.message || "User not found" });
      return;
    }

    // Получаем сумму звезд пользователя
    const { data: donations, error: donationsError } = await supabase
      .from("donations")
      .select("amount_stars")
      .eq("donor_tg_id", user.tg_id);

    const total_amount_stars = donations?.reduce((sum, d) => sum + (parseInt(d.amount_stars) || 0), 0) || 0;

    // Получаем топ пользователей для определения ранга
    const { data: allUsers, error: allUsersError } = await supabase
      .from("users")
      .select("tg_id, username");
    const { data: allDonations } = await supabase
      .from("donations")
      .select("donor_tg_id, amount_stars");
    // Считаем сумму звезд по tg_id
    const userStars: Record<string, number> = {};
    allDonations?.forEach((d: any) => {
      if (!userStars[d.donor_tg_id]) userStars[d.donor_tg_id] = 0;
      userStars[d.donor_tg_id] += parseInt(d.amount_stars) || 0;
    });
    // Формируем массив для сортировки
    const sorted = Object.entries(userStars)
      .map(([tg_id, stars]) => ({ tg_id, stars: Number(stars) }))
      .sort((a, b) => Number(b.stars) - Number(a.stars));
    const rank = sorted.findIndex(u => u.tg_id == user.tg_id) + 1;

    res.status(200).json({ profile: { ...user, total_amount_stars, rank } });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
} 