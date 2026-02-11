import { NextRequest } from "next/server";
import { applyRateLimit } from "@/lib/rate-limit";
import { jsonError, jsonOk } from "@/lib/http";
import { hasSameOrigin } from "@/lib/security";
import { supabaseAdmin } from "@/lib/supabase";
import { getAuthUserFromRequest, getSuspensionState } from "@/lib/user-access";
import { safeText } from "@/lib/utils";
import { logSecurityEvent } from "@/lib/security-events";

export async function POST(req: NextRequest) {
  if (!hasSameOrigin(req)) return jsonError("Forbidden", 403);
  const rate = applyRateLimit(req.headers, "contact_submit", 10, 60_000);
  if (!rate.allowed) return jsonError("送信回数が多すぎます", 429, { retryAfter: rate.retryAfterSeconds });

  const { user, error } = await getAuthUserFromRequest(req);
  if (!user) return jsonError(error || "認証が必要です", 401);

  const suspension = await getSuspensionState(user.id);
  if (suspension.suspended) return jsonError("停止中アカウントはお問い合わせできません", 403);

  const body = (await req.json().catch(() => null)) as { subject?: string; message?: string } | null;
  const subject = safeText(body?.subject, 3, 120);
  const message = safeText(body?.message, 10, 4000);
  if (!subject || !message) return jsonError("件名と本文を入力してください", 400);

  const { error: insertErr } = await supabaseAdmin.from("contact_inquiries").insert({
    user_id: user.id,
    email: user.email ?? "",
    subject,
    message
  });
  if (insertErr) return jsonError("お問い合わせ送信に失敗しました", 500);

  await logSecurityEvent({
    eventType: "contact_submitted",
    severity: "info",
    actorUserId: user.id,
    target: user.email ?? user.id,
    detail: { subjectLength: subject.length, messageLength: message.length }
  });

  return jsonOk({ ok: true });
}

