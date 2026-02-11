import { NextRequest } from "next/server";
import { getRankings } from "@/lib/queries";
import { jsonError, jsonOk } from "@/lib/http";
import { applyRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const rate = applyRateLimit(req.headers, "rankings", 120, 60_000);
  if (!rate.allowed) return jsonError("アクセスが多すぎます", 429, { retryAfter: rate.retryAfterSeconds });

  const rangeParam = req.nextUrl.searchParams.get("range");
  const range = rangeParam === "30d" ? "30d" : "all";
  const rawLimit = Number(req.nextUrl.searchParams.get("limit") || 20);
  const limit = Math.max(1, Math.min(Number.isFinite(rawLimit) ? rawLimit : 20, 100));
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || 1) || 1);
  const offset = (page - 1) * limit;

  try {
    const rankings = await getRankings(range, limit, offset);
    return jsonOk({ range, page, limit, rankings });
  } catch {
    return jsonError("ランキング取得に失敗しました", 500);
  }
}
