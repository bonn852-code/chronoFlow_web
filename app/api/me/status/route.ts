import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { applyRateLimit } from "@/lib/rate-limit";
import { hasSameOrigin } from "@/lib/security";
import { getAuthUserFromRequest, getUserAccessState } from "@/lib/user-access";
import { ensureUserProfile } from "@/lib/profile";

export async function GET(req: NextRequest) {
  if (!hasSameOrigin(req)) return jsonError("Forbidden", 403);
  const rate = applyRateLimit(req.headers, "me_status", 120, 60_000);
  if (!rate.allowed) return jsonError("アクセスが多すぎます", 429, { retryAfter: rate.retryAfterSeconds });

  const { user, error } = await getAuthUserFromRequest(req);
  if (!user) return jsonError(error || "認証が必要です", 401);

  const access = await getUserAccessState(user.id);
  const profile = await ensureUserProfile({ id: user.id });
  return jsonOk({
    userId: user.id,
    email: user.email,
    suspended: access.suspended,
    reason: access.reason,
    isMember: access.isMember,
    profile: profile
      ? {
          displayName: profile.display_name,
          iconUrl: profile.icon_url,
          iconFocusX: profile.icon_focus_x,
          iconFocusY: profile.icon_focus_y,
          bio: profile.bio
        }
      : null
  });
}
