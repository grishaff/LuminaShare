import { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../utils/supabase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).end("Method Not Allowed");
    return;
  }

  try {
    // Получаем информацию о таблице users
    const { data: tableInfo, error: infoError } = await supabase
      .from("information_schema.columns")
      .select("column_name, data_type, is_nullable")
      .eq("table_name", "users");

    if (infoError) {
      console.log("Could not get table info:", infoError);
    }

    // Пытаемся получить все записи пользователей
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("*")
      .limit(10);

    // Пытаемся создать тестового пользователя с минимальными полями
    const testUser = {
      tg_id: 999999999,
      display_name: "Test User",
      role: "user"
    };

    const { data: testResult, error: testError } = await supabase
      .from("users")
      .upsert(testUser, { onConflict: "tg_id" })
      .select()
      .single();

    // Удаляем тестового пользователя
    if (testResult) {
      await supabase
        .from("users")
        .delete()
        .eq("tg_id", 999999999);
    }

    res.status(200).json({
      tableStructure: tableInfo || "Could not fetch table structure",
      tableError: infoError?.message || null,
      existingUsers: users || [],
      usersError: usersError?.message || null,
      testInsert: {
        success: !testError,
        error: testError?.message || null,
        result: testResult
      }
    });

  } catch (err) {
    console.error("Debug error:", err);
    res.status(500).json({ 
      error: "Internal server error", 
      details: err instanceof Error ? err.message : String(err)
    });
  }
}