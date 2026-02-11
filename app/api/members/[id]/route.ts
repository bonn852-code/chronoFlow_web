import { getMemberById } from "@/lib/queries";
import { jsonError, jsonOk } from "@/lib/http";
import { isUuid } from "@/lib/utils";
import { applyRateLimit } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rate = applyRateLimit(req.headers, "member_detail", 180, 60_000);
  if (!rate.allowed) return jsonError("アクセスが多すぎます", 429, { retryAfter: rate.retryAfterSeconds });

  try {
    const { id } = await params;
    if (!isUuid(id)) return jsonError("メンバーIDが不正です", 400);
    const data = await getMemberById(id);
    if (!data) return jsonError("メンバーが見つかりません", 404);
    return jsonOk(data);
  } catch {
    return jsonError("メンバー詳細取得に失敗しました", 500);
  }
}
