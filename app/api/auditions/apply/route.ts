import { NextRequest } from "next/server";
import { applyRateLimit } from "@/lib/rate-limit";
import { jsonError, jsonOk } from "@/lib/http";
import { getCurrentBatch } from "@/lib/auditions";
import { supabaseAdmin } from "@/lib/supabase";
import { isValidUrl, makeApplicationCode, safeStringArray, safeText } from "@/lib/utils";
import { hasSameOrigin } from "@/lib/security";
import { getSuspensionState } from "@/lib/user-access";

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
        display_name?: string;
        video_url?: string;
        sns_urls?: unknown;
        consent_public_profile?: boolean;
        consent_advice?: boolean;
      }
    | null;

  const displayName = safeText(body?.display_name, 1, 120);
  const videoUrl = safeText(body?.video_url, 10, 2000);
  const snsUrls = safeStringArray(body?.sns_urls, 8).filter((url) => isValidUrl(url));
  const consentPublic = body?.consent_public_profile === true;
  const consentAdvice = body?.consent_advice === true;

  if (!displayName || !videoUrl || !isValidUrl(videoUrl) || !consentPublic) {
    return jsonError("入力内容を確認してください", 400);
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

    const applicationCode = makeApplicationCode();

    const { error } = await supabaseAdmin.from("audition_applications").insert({
      batch_id: batch.id,
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

    return jsonOk({ applicationCode: consentAdvice ? applicationCode : null });
  } catch {
    return jsonError("申請処理に失敗しました", 500);
  }
}
