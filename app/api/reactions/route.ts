import { NextRequest } from "next/server";
import { applyRateLimit } from "@/lib/rate-limit";
import { jsonError, jsonOk } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import { hasSameOrigin } from "@/lib/security";
import { isUuid, safeText } from "@/lib/utils";

export async function POST(req: NextRequest) {
  if (!hasSameOrigin(req)) return jsonError("Forbidden", 403);

  const rate = applyRateLimit(req.headers, "reactions", 30, 60_000);
  if (!rate.allowed) return jsonError("レート制限に達しました", 429, { retryAfter: rate.retryAfterSeconds });

  const body = (await req.json().catch(() => null)) as { memberId?: string; memberLinkId?: string; deviceId?: string } | null;
  const memberId = safeText(body?.memberId, 10, 80);
  const memberLinkId = safeText(body?.memberLinkId, 10, 80);
  const deviceId = safeText(body?.deviceId, 8, 120);
  if ((!memberId && !memberLinkId) || !deviceId) return jsonError("入力が不正です", 400);
  if (memberId && !isUuid(memberId)) return jsonError("memberIdが不正です", 400);
  if (memberLinkId && !isUuid(memberLinkId)) return jsonError("memberLinkIdが不正です", 400);
  if (!/^[a-zA-Z0-9_-]{8,120}$/.test(deviceId)) return jsonError("deviceIdが不正です", 400);

  const reactedOn = new Date().toISOString().slice(0, 10);

  if (memberLinkId) {
    const { error } = await supabaseAdmin.from("link_reactions").insert({
      member_link_id: memberLinkId,
      device_id: deviceId,
      reacted_on: reactedOn
    });
    if (error) {
      if (error.code === "23505") return jsonError("本日は既にいいね済みです", 409);
      return jsonError("いいね保存に失敗しました", 500);
    }
    return jsonOk({ ok: true, target: "video" });
  }

  const { error } = await supabaseAdmin.from("reactions").insert({
    member_id: memberId,
    device_id: deviceId,
    reacted_on: reactedOn
  });

  if (error) {
    if (error.code === "23505") return jsonError("本日は既にリアクション済みです", 409);
    return jsonError("リアクション保存に失敗しました", 500);
  }

  return jsonOk({ ok: true, target: "member" });
}
