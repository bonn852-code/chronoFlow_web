import { NextRequest } from "next/server";
import { applyRateLimit } from "@/lib/rate-limit";
import { jsonError, jsonOk } from "@/lib/http";
import { getCurrentBatch } from "@/lib/auditions";
import { supabaseAdmin } from "@/lib/supabase";
import { hasSamePlatformSns, isAllowedAuditionUrl, makeApplicationCode, platformFromUrl, safeStringArray } from "@/lib/utils";
import { hasSameOrigin } from "@/lib/security";
import { getSuspensionState } from "@/lib/user-access";
import { ensureUserProfile } from "@/lib/profile";

export async function GET(req: NextRequest) {
  const rate = applyRateLimit(req.headers, "audition_apply_meta", 120, 60_000);
  if (!rate.allowed) return jsonError("アクセスが多すぎます", 429, { retryAfter: rate.retryAfterSeconds });

  try {
    const batch = await getCurrentBatch();
    const now = Date.now();
    const openAt = new Date(batch.apply_open_at).getTime();
    const closeAt = new Date(batch.apply_close_at).getTime();
    const isOpen = now >= openAt && now <= closeAt;
    return jsonOk({
      batch: {
        id: batch.id,
        title: batch.title,
        applyOpenAt: batch.apply_open_at,
        applyCloseAt: batch.apply_close_at
      },
      isOpen
    });
  } catch {
    return jsonError("申請期間の取得に失敗しました", 500);
  }
}

export async function POST(req: NextRequest) {
  if (!hasSameOrigin(req)) return jsonError("Forbidden", 403);

  const rate = applyRateLimit(req.headers, "audition_apply", 15, 60_000);
  if (!rate.allowed) return jsonError("送信回数が多すぎます", 429, { retryAfter: rate.retryAfterSeconds });

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return jsonError("審査申請にはログインが必要です", 401);
  const {
    data: { user },
    error: authError
  } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return jsonError("認証が無効です。再ログインしてください", 401);
  const suspension = await getSuspensionState(user.id);
  if (suspension.suspended) return jsonError("このアカウントは停止中のため申請できません", 403);

  const body = (await req.json().catch(() => null)) as
    | {
        video_url?: string;
        sns_urls?: unknown;
        consent_public_profile?: boolean;
        consent_advice?: boolean;
      }
    | null;

  const videoUrl = typeof body?.video_url === "string" ? body.video_url.trim() : "";
  const snsCandidateUrls = safeStringArray(body?.sns_urls, 8);
  const snsUrls = snsCandidateUrls.filter((url) => isAllowedAuditionUrl(url));
  const consentPublic = body?.consent_public_profile === true;
  const consentAdvice = body?.consent_advice === true;

  if (!videoUrl || !isAllowedAuditionUrl(videoUrl) || !consentPublic) {
    return jsonError("入力内容を確認してください", 400);
  }
  if (snsUrls.length !== snsCandidateUrls.length) {
    return jsonError("SNS URLは YouTube / TikTok / Instagram のみ指定できます", 400);
  }

  try {
    const batch = await getCurrentBatch();
    const now = Date.now();
    const openAt = new Date(batch.apply_open_at).getTime();
    const closeAt = new Date(batch.apply_close_at).getTime();
    if (now < openAt || now > closeAt) {
      return jsonError("現在は募集期間外のため申請できません。募集開始までお待ちください。", 403, {
        applyOpenAt: batch.apply_open_at,
        applyCloseAt: batch.apply_close_at
      });
    }

    const profile = await ensureUserProfile({ id: user.id, user_metadata: user.user_metadata });
    const displayName = profile?.display_name?.trim();
    if (!displayName) return jsonError("プロフィールの表示名を設定してから申請してください", 400);

    const { data: existingApplication } = await supabaseAdmin
      .from("audition_applications")
      .select("id")
      .eq("batch_id", batch.id)
      .eq("applied_by_user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (existingApplication) {
      const { data: allowed } = await supabaseAdmin
        .from("audition_resubmit_permissions")
        .select("batch_id,user_id")
        .eq("batch_id", batch.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!allowed) return jsonError("この募集回では既に申請済みです。再申請は管理者の許可が必要です。", 409);
      await supabaseAdmin.from("audition_resubmit_permissions").delete().eq("batch_id", batch.id).eq("user_id", user.id);
    }

    const applicationCode = makeApplicationCode();
    const warnings: string[] = [];
    const videoPlatform = platformFromUrl(videoUrl);
    if ((videoPlatform === "youtube" || videoPlatform === "tiktok" || videoPlatform === "instagram") && !hasSamePlatformSns(videoUrl, snsUrls)) {
      warnings.push(`審査動画と同じプラットフォームのSNS URLを追加すると本人確認がスムーズになります（推奨）。`);
    }

    const { error } = await supabaseAdmin.from("audition_applications").insert({
      batch_id: batch.id,
      applied_by_user_id: user.id,
      display_name: displayName,
      video_url: videoUrl,
      sns_urls: snsUrls,
      consent_public_profile: consentPublic,
      consent_advice: consentAdvice,
      application_code: applicationCode
    });
    if (error) {
      if (error.code === "23505") return jsonError("時間をおいて再試行してください", 409);
      return jsonError("申請の保存に失敗しました", 500);
    }

    return jsonOk({ applicationCode: consentAdvice ? applicationCode : null, warnings });
  } catch {
    return jsonError("申請処理に失敗しました", 500);
  }
}
