import { NextRequest } from "next/server";
import { checkAdminRequest } from "@/lib/api-auth";
import { jsonError, jsonOk } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import { isUuid } from "@/lib/utils";
import { applyRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminRequest(req)) return jsonError("Unauthorized", 401);

  const rate = applyRateLimit(req.headers, "admin_auditions_allow_resubmit", 60, 60_000);
  if (!rate.allowed) return jsonError("アクセスが多すぎます", 429, { retryAfter: rate.retryAfterSeconds });

  const { id } = await params;
  if (!isUuid(id)) return jsonError("IDが不正です", 400);

  const { data: app, error: appErr } = await supabaseAdmin
    .from("audition_applications")
    .select("id,batch_id,applied_by_user_id")
    .eq("id", id)
    .maybeSingle();
  if (appErr) return jsonError("申請の取得に失敗しました", 500);
  if (!app) return jsonError("申請が見つかりません", 404);
  if (!app.applied_by_user_id) return jsonError("この申請にはユーザー情報がないため許可できません", 400);

  const { error } = await supabaseAdmin.from("audition_resubmit_permissions").upsert(
    {
      batch_id: app.batch_id,
      user_id: app.applied_by_user_id,
      granted_by_application_id: app.id,
      granted_at: new Date().toISOString()
    },
    { onConflict: "batch_id,user_id" }
  );
  if (error) {
    if ((error as { code?: string }).code === "42P01") {
      return jsonError("DBの最新スキーマが未適用です（audition_resubmit_permissions）", 500);
    }
    return jsonError("再申請許可の保存に失敗しました", 500);
  }
  return jsonOk({ ok: true });
}
