import { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../utils/supabase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).end("Method Not Allowed");
    return;
  }

  try {
    console.log('Fetching donations...');
    // получаем все донаты
    const { data: donations, error: donationsError } = await supabase
      .from('donations')
      .select('donor_tg_id, amount_ton');

    if (donationsError) {
      console.error('Donations error:', donationsError);
      res.status(500).json({ error: `Donations error: ${donationsError.message}` });
      return;
    }

    console.log('Donations fetched:', donations?.length || 0);

    console.log('Fetching users...');
    // получаем данные пользователей отдельно
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('tg_id, first_name, last_name, username, display_name');

    if (usersError) {
      console.error('Users error:', usersError);
      res.status(500).json({ error: `Users error: ${usersError.message}` });
      return;
    }

    console.log('Users fetched:', users?.length || 0);

  // создаем карту пользователей для быстрого поиска
  const userMap: any = {};
  users?.forEach((user: any) => {
    userMap[user.tg_id] = user;
  });

  // Агрегируем данные по donor_tg_id
  const rankings: any = {};
  
  donations?.forEach((donation: any) => {
    const donorId = donation.donor_tg_id;
    const amount = parseFloat(donation.amount_ton) || 0;
    const user = userMap[donorId];
    
    if (rankings[donorId]) {
      rankings[donorId].total_amount += amount;
      rankings[donorId].donation_count += 1;
    } else {
      rankings[donorId] = {
        donor_tg_id: donorId,
        first_name: user?.first_name || user?.display_name || 'Аноним',
        total_amount: amount,
        donation_count: 1
      };
    }
  });

  // Преобразуем в массив и сортируем по сумме
  const rankingArray = Object.values(rankings)
    .sort((a: any, b: any) => b.total_amount - a.total_amount)
    .slice(0, 100);

    console.log('Returning ranking with', rankingArray.length, 'entries');
    res.status(200).json({ ranking: rankingArray });
  } catch (error) {
    console.error('Ranking API error:', error);
    res.status(500).json({ error: `Internal server error: ${error}` });
  }
}
