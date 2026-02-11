import { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { jsonError, jsonOk } from "@/lib/http";
import { setAdminCookie, clearAdminCookie } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { applyRateLimit } from "@/lib/rate-limit";
import { getSuspensionState } from "@/lib/user-access";
import { logSecurityEvent } from "@/lib/security-events";
import { hasSameOrigin } from "@/lib/security";

export async function POST(req: NextRequest) {
  if (!hasSameOrigin(req)) return jsonError("Forbidden", 403);

  const rate = applyRateLimit(req.headers, "admin_session_sync", 120, 60_000);
  if (!rate.allowed) return jsonError("試行回数が多すぎます", 429, { retryAfter: rate.retryAfterSeconds });

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    await clearAdminCookie();
    return jsonError("認証が必要です", 401);
  }

  const {
    data: { user },
    error
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user?.email) {
    await clearAdminCookie();
    return jsonError("認証が無効です", 401);
  }

  const normalized = (value?: string | null) => (value || "").trim().toLowerCase();
  const allowedAdminEmails = new Set(
    [normalized(env.adminEmail), normalized(process.env.NEXT_PUBLIC_ADMIN_EMAIL)].filter(Boolean)
  );

  if (!allowedAdminEmails.has(user.email.toLowerCase())) {
    await clearAdminCookie();
    return jsonError("管理者権限がありません", 403);
  }
  const suspension = await getSuspensionState(user.id);
  if (suspension.suspended) {
    await clearAdminCookie();
    await logSecurityEvent({
      eventType: "admin_session_denied_suspended",
      severity: "warn",
      actorUserId: user.id,
      target: user.email
    });
    return jsonError("停止中アカウントは管理操作できません", 403);
  }

  await setAdminCookie();
  await logSecurityEvent({
    eventType: "admin_session_synced",
    severity: "info",
    actorUserId: user.id,
    target: user.email
  });
  return jsonOk({ ok: true });
}
