import { NextRequest } from "next/server";
import { applyRateLimit } from "@/lib/rate-limit";
import { hasSameOrigin } from "@/lib/security";
import { jsonError, jsonOk } from "@/lib/http";
import { getAuthUserFromRequest } from "@/lib/user-access";
import { ensureUserProfile } from "@/lib/profile";
import { supabaseAdmin } from "@/lib/supabase";

const MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function extensionForType(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/jpeg") return "jpg";
  if (type === "image/webp") return "webp";
  return "bin";
}

export async function POST(req: NextRequest) {
  if (!hasSameOrigin(req)) return jsonError("Forbidden", 403);
  const rate = applyRateLimit(req.headers, "profile_icon_upload", 20, 60_000);
  if (!rate.allowed) return jsonError("アクセスが多すぎます", 429, { retryAfter: rate.retryAfterSeconds });

  const auth = await getAuthUserFromRequest(req);
  if (!auth.user) return jsonError(auth.error || "認証が必要です", 401);

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("ファイルが選択されていません", 400);
  if (!ALLOWED_TYPES.has(file.type)) return jsonError("画像形式は PNG / JPG / WebP のみ対応です", 400);
  if (file.size > MAX_SIZE) return jsonError("画像サイズは2MB以下にしてください", 400);

  const profile = await ensureUserProfile({ id: auth.user.id });
  if (!profile) return jsonError("プロフィールの取得に失敗しました", 500);

  const ext = extensionForType(file.type);
  const path = `${auth.user.id}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabaseAdmin.storage.from("profile-icons").upload(path, buffer, {
    contentType: file.type,
    upsert: true,
    cacheControl: "3600"
  });
  if (uploadError) return jsonError("アップロードに失敗しました", 500);

  const { data: publicData } = supabaseAdmin.storage.from("profile-icons").getPublicUrl(path);
  const iconUrl = publicData.publicUrl;

  const now = new Date().toISOString();
  await Promise.all([
    supabaseAdmin
      .from("user_profiles")
      .update({
        icon_url: iconUrl,
        updated_at: now
      })
      .eq("user_id", auth.user.id),
    supabaseAdmin.auth.admin.updateUserById(auth.user.id, {
      user_metadata: {
        display_name: profile.display_name,
        icon_url: iconUrl,
        icon_focus_x: profile.icon_focus_x,
        icon_focus_y: profile.icon_focus_y
      }
    }),
    supabaseAdmin
      .from("members")
      .update({
        icon_url: iconUrl,
        icon_focus_x: profile.icon_focus_x,
        icon_focus_y: profile.icon_focus_y
      })
      .eq("user_id", auth.user.id)
  ]);

  return jsonOk({ iconUrl });
}
