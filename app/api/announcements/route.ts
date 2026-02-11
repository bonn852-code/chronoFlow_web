import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import { applyRateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const rate = applyRateLimit(req.headers, "announcements", 120, 60_000);
  if (!rate.allowed) return jsonError("アクセスが多すぎます", 429, { retryAfter: rate.retryAfterSeconds });

  const scope = req.nextUrl.searchParams.get("scope") === "members" ? "members" : "public";
  if (scope === "members") {
    const token = req.nextUrl.searchParams.get("portalToken");
    if (!token) return jsonError("members scope requires portalToken", 400);
    if (!isUuid(token)) return jsonError("portalTokenが不正です", 400);
    const { data: member } = await supabaseAdmin
      .from("members")
      .select("id")
      .eq("portal_token", token)
      .eq("is_active", true)
      .maybeSingle();
    if (!member) return jsonError("無効なportalTokenです", 401);
  }

  const { data, error } = await supabaseAdmin
    .from("announcements")
    .select("id,title,body,scope,created_at")
    .eq("scope", scope)
    .order("created_at", { ascending: false });

  if (error) return jsonError("お知らせ取得に失敗しました", 500);
  return jsonOk({ announcements: data || [] });
}
