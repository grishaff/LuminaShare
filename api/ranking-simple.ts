import { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).end("Method Not Allowed");
    return;
  }

  // тестовые данные для проверки
  const testRanking = [
    {
      donor_tg_id: 123456789,
      first_name: "Тестовый Донор",
      total_amount: 5.5,
      donation_count: 3
    },
    {
      donor_tg_id: 987654321,
      first_name: "Второй Донор",
      total_amount: 2.1,
      donation_count: 1
    }
  ];

  res.status(200).json({ ranking: testRanking });
} 