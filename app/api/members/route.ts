import { NextRequest } from "next/server";
import { getMembers } from "@/lib/queries";
import { jsonError, jsonOk } from "@/lib/http";
import { applyRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const rate = applyRateLimit(req.headers, "members_list", 120, 60_000);
  if (!rate.allowed) return jsonError("アクセスが多すぎます", 429, { retryAfter: rate.retryAfterSeconds });

  try {
    const query = req.nextUrl.searchParams.get("query") || "";
    const members = await getMembers(query, 200);
    return jsonOk({ members });
  } catch {
    return jsonError("メンバー取得に失敗しました", 500);
  }
}
