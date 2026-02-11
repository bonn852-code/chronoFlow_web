import { jsonError, jsonOk } from "@/lib/http";
import { getCurrentBatch } from "@/lib/auditions";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const batch = await getCurrentBatch();
    if (!batch.published_at) {
      return jsonOk({
        batch: {
          title: batch.title,
          publishedAt: null
        },
        results: []
      });
    }

    const { data, error } = await supabaseAdmin
      .from("audition_applications")
      .select("id,display_name,status,created_at,reviewed_at")
      .eq("batch_id", batch.id)
      .order("created_at", { ascending: true });

    if (error) return jsonError("結果一覧の取得に失敗しました", 500);

    return jsonOk({
      batch: {
        title: batch.title,
        publishedAt: batch.published_at
      },
      results: data || []
    });
  } catch {
    return jsonError("結果一覧の取得に失敗しました", 500);
  }
}
