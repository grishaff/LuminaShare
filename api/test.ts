import { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Устанавливаем правильные заголовки
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache');
  
  console.log(`[TEST] [${req.method}] /api/test`);

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    const testResponse = {
      success: true,
      timestamp: new Date().toISOString(),
      environment: {
        node_version: process.version,
        vercel_region: process.env.VERCEL_REGION || 'unknown',
        has_supabase_url: !!process.env.SUPABASE_URL,
        has_supabase_key: !!process.env.SUPABASE_SERVICE_KEY,
      },
      message: "API is working correctly"
    };

    console.log("Test response:", testResponse);
    res.status(200).json(testResponse);
  } catch (err) {
    console.error("Test error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ 
      success: false,
      error: "Internal server error", 
      details: errorMessage 
    });
  }
} 