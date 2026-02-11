import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { applyRateLimit } from "@/lib/rate-limit";
import { hasSameOrigin } from "@/lib/security";
import { getAuthUserFromRequest, getUserAccessState } from "@/lib/user-access";

export async function GET(req: NextRequest) {
  if (!hasSameOrigin(req)) return jsonError("Forbidden", 403);
  const rate = applyRateLimit(req.headers, "me_status", 120, 60_000);
  if (!rate.allowed) return jsonError("アクセスが多すぎます", 429, { retryAfter: rate.retryAfterSeconds });

  const { user, error } = await getAuthUserFromRequest(req);
  if (!user) return jsonError(error || "認証が必要です", 401);

  const access = await getUserAccessState(user.id);
  return jsonOk({
    userId: user.id,
    email: user.email,
    suspended: access.suspended,
    reason: access.reason,
    isMember: access.isMember
  });
}
