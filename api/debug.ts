import { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../utils/supabase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).end("Method Not Allowed");
    return;
  }

  try {
    // проверяем донаты
    const { data: donations, error: donationsError } = await supabase
      .from('donations')
      .select('*');

    // проверяем пользователей
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');

    res.status(200).json({ 
      donations: {
        data: donations,
        error: donationsError,
        count: donations?.length || 0
      },
      users: {
        data: users,
        error: usersError,
        count: users?.length || 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}