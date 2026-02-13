import { NextRequest } from "next/server";
import { checkAdminRequest } from "@/lib/api-auth";
import { jsonError, jsonOk } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import { isUuid, safeText } from "@/lib/utils";
import { applyRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminRequest(req)) return jsonError("Unauthorized", 401);

  const rate = applyRateLimit(req.headers, "admin_auditions_review", 60, 60_000);
  if (!rate.allowed) return jsonError("アクセスが多すぎます", 429, { retryAfter: rate.retryAfterSeconds });

  const { id } = await params;
  if (!isUuid(id)) return jsonError("IDが不正です", 400);

  const body = (await req.json().catch(() => null)) as {
    status?: "approved" | "rejected";
    adviceText?: string;
  } | null;

  if (!body?.status || !["approved", "rejected"].includes(body.status)) {
    return jsonError("不正なステータスです", 400);
  }

  const { data: target, error: targetErr } = await supabaseAdmin
    .from("audition_applications")
    .select("id,batch_id,audition_batches!inner(published_at)")
    .eq("id", id)
    .maybeSingle();
  if (targetErr) return jsonError("審査対象の取得に失敗しました", 500);
  if (!target) return jsonError("審査対象が見つかりません", 404);
  const batch = Array.isArray(target.audition_batches) ? target.audition_batches[0] : target.audition_batches;
  if (batch?.published_at) return jsonError("結果発表後の申請は変更できません", 409);

  const advice = body.status === "rejected" ? safeText(body.adviceText ?? "", 0, 2000) : null;

  const { error } = await supabaseAdmin
    .from("audition_applications")
    .update({
      status: body.status,
      advice_text: body.status === "rejected" ? advice : null,
      reviewed_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) return jsonError("審査更新に失敗しました", 500);
  return jsonOk({ ok: true });
}
