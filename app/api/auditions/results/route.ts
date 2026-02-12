import { jsonError, jsonOk } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import { applyRateLimit } from "@/lib/rate-limit";
import { NextRequest } from "next/server";
import { getResolvedProfilesByUserIds } from "@/lib/profile";

export async function GET(req: NextRequest) {
  const rate = applyRateLimit(req.headers, "audition_results", 120, 60_000);
  if (!rate.allowed) return jsonError("アクセスが多すぎます", 429, { retryAfter: rate.retryAfterSeconds });

  try {
    const { data: batch, error: batchErr } = await supabaseAdmin
      .from("audition_batches")
      .select("id,title,published_at")
      .is("deleted_at", null)
      .not("published_at", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (batchErr) return jsonError("結果一覧の取得に失敗しました", 500);
    if (!batch) {
      return jsonOk({
        batch: {
          title: "",
          publishedAt: null
        },
        results: []
      });
    }

    const { data, error } = await supabaseAdmin
      .from("audition_applications")
      .select("id,applied_by_user_id,display_name,status,created_at,reviewed_at")
      .eq("batch_id", batch.id)
      .order("created_at", { ascending: true });

    if (error) return jsonError("結果一覧の取得に失敗しました", 500);

    const items = data || [];
    const profileMap = await getResolvedProfilesByUserIds(
      items.map((item) => item.applied_by_user_id).filter((v): v is string => typeof v === "string" && v.length > 0)
    );
    const merged = items.map((item) => {
      const profile = item.applied_by_user_id ? profileMap.get(item.applied_by_user_id) : null;
      return {
        ...item,
        display_name: profile?.display_name || item.display_name
      };
    });

    return jsonOk({
      batch: {
        title: batch.title,
        publishedAt: batch.published_at
      },
      results: merged
    });
  } catch {
    return jsonError("結果一覧の取得に失敗しました", 500);
  }
}
