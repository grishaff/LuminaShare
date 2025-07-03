import { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../utils/supabase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).end("Method Not Allowed");
    return;
  }

  // агрегируем донаты напрямую с данными пользователей
  const { data, error } = await supabase
    .from('donations')
    .select(`
      donor_tg_id,
      amount_ton,
      users!donations_donor_tg_id_fkey (
        first_name,
        last_name,
        username,
        display_name
      )
    `);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  // Агрегируем данные по donor_tg_id
  const rankings = new Map();
  
  data?.forEach(donation => {
    const donorId = donation.donor_tg_id;
    const amount = parseFloat(donation.amount_ton) || 0;
    const user = Array.isArray(donation.users) ? donation.users[0] : donation.users;
    
    if (rankings.has(donorId)) {
      const existing = rankings.get(donorId);
      existing.total_amount += amount;
      existing.donation_count += 1;
    } else {
      rankings.set(donorId, {
        donor_tg_id: donorId,
        first_name: user?.first_name || user?.display_name || 'Аноним',
        total_amount: amount,
        donation_count: 1
      });
    }
  });

  // Преобразуем в массив и сортируем по сумме
  const rankingArray = Array.from(rankings.values())
    .sort((a, b) => b.total_amount - a.total_amount)
    .slice(0, 100);

  res.status(200).json({ ranking: rankingArray });
}
