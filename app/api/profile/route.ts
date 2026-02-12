import { NextRequest } from "next/server";
import { applyRateLimit } from "@/lib/rate-limit";
import { hasSameOrigin } from "@/lib/security";
import { jsonError, jsonOk } from "@/lib/http";
import { getAuthUserFromRequest } from "@/lib/user-access";
import { ensureUserProfile } from "@/lib/profile";
import { supabaseAdmin } from "@/lib/supabase";
import { isValidUrl, safeText } from "@/lib/utils";

export async function GET(req: NextRequest) {
  if (!hasSameOrigin(req)) return jsonError("Forbidden", 403);
  const rate = applyRateLimit(req.headers, "profile_get", 120, 60_000);
  if (!rate.allowed) return jsonError("アクセスが多すぎます", 429, { retryAfter: rate.retryAfterSeconds });

  const auth = await getAuthUserFromRequest(req);
  if (!auth.user) return jsonError(auth.error || "認証が必要です", 401);

  const profile = await ensureUserProfile({ id: auth.user.id });
  if (!profile) return jsonError("プロフィール取得に失敗しました", 500);
  return jsonOk({ profile });
}

export async function PATCH(req: NextRequest) {
  if (!hasSameOrigin(req)) return jsonError("Forbidden", 403);
  const rate = applyRateLimit(req.headers, "profile_patch", 30, 60_000);
  if (!rate.allowed) return jsonError("更新回数が多すぎます", 429, { retryAfter: rate.retryAfterSeconds });

  const auth = await getAuthUserFromRequest(req);
  if (!auth.user) return jsonError(auth.error || "認証が必要です", 401);

  const body = (await req.json().catch(() => null)) as
    | { displayName?: string; bio?: string; iconUrl?: string | null; iconFocusX?: number; iconFocusY?: number }
    | null;
  if (!body) return jsonError("不正なリクエストです", 400);

  const displayName = safeText(body.displayName, 1, 120);
  if (!displayName) return jsonError("表示名が不正です", 400);

  const bio = typeof body.bio === "string" ? safeText(body.bio, 0, 500) : null;
  const iconUrl = typeof body.iconUrl === "string" ? body.iconUrl.trim() : body.iconUrl;
  if (iconUrl && !isValidUrl(iconUrl)) return jsonError("アイコンURLが不正です", 400);
  const iconFocusX = Number.isFinite(body.iconFocusX) ? Math.min(100, Math.max(0, Math.round(Number(body.iconFocusX)))) : 50;
  const iconFocusY = Number.isFinite(body.iconFocusY) ? Math.min(100, Math.max(0, Math.round(Number(body.iconFocusY)))) : 50;

  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .upsert(
      {
        user_id: auth.user.id,
        display_name: displayName,
        bio: bio || null,
        icon_url: iconUrl || null,
        icon_focus_x: iconFocusX,
        icon_focus_y: iconFocusY,
        updated_at: now
      },
      { onConflict: "user_id" }
    )
    .select("user_id,display_name,bio,icon_url,icon_focus_x,icon_focus_y,updated_at")
    .single();

  if (error) return jsonError("プロフィール更新に失敗しました", 500);

  await Promise.all([
    supabaseAdmin.auth.admin.updateUserById(auth.user.id, {
      user_metadata: {
        display_name: displayName,
        icon_url: iconUrl || null,
        icon_focus_x: iconFocusX,
        icon_focus_y: iconFocusY
      }
    }),
    supabaseAdmin
      .from("members")
      .update({
        display_name: displayName,
        icon_url: iconUrl || null,
        icon_focus_x: iconFocusX,
        icon_focus_y: iconFocusY
      })
      .eq("user_id", auth.user.id),
    supabaseAdmin.from("audition_applications").update({ display_name: displayName }).eq("applied_by_user_id", auth.user.id)
  ]);

  return jsonOk({ profile: data });
}
