import { NextRequest } from "next/server";
import { applyRateLimit } from "@/lib/rate-limit";
import { jsonError, jsonOk } from "@/lib/http";
import { hasSameOrigin } from "@/lib/security";
import { supabaseAdmin } from "@/lib/supabase";
import { getAuthUserFromRequest, getUserAccessState } from "@/lib/user-access";

export async function GET(req: NextRequest) {
  if (!hasSameOrigin(req)) return jsonError("Forbidden", 403);

  const rate = applyRateLimit(req.headers, "member_assets", 120, 60_000);
  if (!rate.allowed) return jsonError("アクセスが多すぎます", 429, { retryAfter: rate.retryAfterSeconds });

  const { user, error } = await getAuthUserFromRequest(req);
  if (!user) return jsonError(error || "認証が必要です", 401);

  const access = await getUserAccessState(user.id);
  if (access.suspended) return jsonError("停止中アカウントは素材を閲覧できません", 403);
  if (!access.isMember) return jsonError("メンバー限定ページです。メンバー権限が必要です", 403);

  const { data, error: fetchErr } = await supabaseAdmin
    .from("assets")
    .select("id,name,external_url,description,created_at")
    .eq("scope", "members")
    .not("external_url", "is", null)
    .order("created_at", { ascending: false });

  if (fetchErr) return jsonError("素材一覧の取得に失敗しました", 500);

  return jsonOk({ assets: data || [] });
}
