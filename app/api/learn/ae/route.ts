import { jsonError, jsonOk } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import { applyRateLimit } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const rate = applyRateLimit(req.headers, "learn_ae", 120, 60_000);
  if (!rate.allowed) return jsonError("アクセスが多すぎます", 429, { retryAfter: rate.retryAfterSeconds });

  const { data, error } = await supabaseAdmin
    .from("lessons_ae")
    .select("id,title,youtube_url,sort_order,created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return jsonError("講座取得に失敗しました", 500);
  return jsonOk({ lessons: data || [] });
}
