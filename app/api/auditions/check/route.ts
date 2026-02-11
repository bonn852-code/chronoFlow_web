import { NextRequest } from "next/server";
import { applyRateLimit } from "@/lib/rate-limit";
import { jsonError, jsonOk } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import { hasSameOrigin } from "@/lib/security";
import { safeText } from "@/lib/utils";

export async function POST(req: NextRequest) {
  if (!hasSameOrigin(req)) return jsonError("Forbidden", 403);

  const rate = applyRateLimit(req.headers, "audition_check", 30, 60_000);
  if (!rate.allowed) return jsonError("アクセスが多すぎます", 429, { retryAfter: rate.retryAfterSeconds });

  const body = (await req.json().catch(() => null)) as { applicationCode?: string } | null;
  const code = safeText(body?.applicationCode, 6, 40);
  if (!code || !/^[A-Z0-9]{8,16}$/.test(code.toUpperCase())) return jsonError("申請コードが不正です", 400);

  const { data, error } = await supabaseAdmin
    .from("audition_applications")
    .select("status,advice_text,consent_advice,display_name,batch_id,audition_batches!inner(published_at)")
    .eq("application_code", code.toUpperCase())
    .maybeSingle();

  if (error) return jsonError("照会に失敗しました", 500);
  if (!data) return jsonError("申請コードが見つかりません", 404);

  const showAdvice = data.status === "rejected" && data.consent_advice;
  const batch = Array.isArray(data.audition_batches) ? data.audition_batches[0] : data.audition_batches;

  return jsonOk({
    status: data.status,
    displayName: data.display_name,
    publishedAt: batch?.published_at ?? null,
    adviceText: showAdvice ? data.advice_text : null
  });
}
