import { jsonError, jsonOk } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("lessons_ae")
    .select("id,title,youtube_url,sort_order,created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return jsonError("講座取得に失敗しました", 500);
  return jsonOk({ lessons: data || [] });
}
