import { NextRequest } from "next/server";
import { clearAdminCookie } from "@/lib/admin-auth";
import { jsonError, jsonOk } from "@/lib/http";
import { hasSameOrigin } from "@/lib/security";
import { applyRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  if (!hasSameOrigin(req)) return jsonError("Forbidden", 403);
  const rate = applyRateLimit(req.headers, "admin_session_clear", 60, 60_000);
  if (!rate.allowed) return jsonError("試行回数が多すぎます", 429, { retryAfter: rate.retryAfterSeconds });

  await clearAdminCookie();
  return jsonOk({ ok: true });
}
