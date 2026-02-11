import { jsonError, jsonOk } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import { applyRateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/utils";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const rate = applyRateLimit(req.headers, "portal", 80, 60_000);
  if (!rate.allowed) return jsonError("アクセスが多すぎます", 429, { retryAfter: rate.retryAfterSeconds });

  const { token } = await params;
  if (!isUuid(token)) return jsonError("無効なトークンです", 400);
  const { data: member, error: memberErr } = await supabaseAdmin
    .from("members")
    .select("id,display_name,portal_token,is_active")
    .eq("portal_token", token)
    .eq("is_active", true)
    .maybeSingle();

  if (memberErr) return jsonError("ポータル取得に失敗しました", 500);
  if (!member) return jsonError("無効なトークンです", 404);

  const { data: announcements, error: annErr } = await supabaseAdmin
    .from("announcements")
    .select("id,title,body,scope,created_at")
    .eq("scope", "members")
    .order("created_at", { ascending: false });
  if (annErr) return jsonError("ポータル情報の取得に失敗しました", 500);

  return jsonOk({
    member: { id: member.id, displayName: member.display_name },
    announcements: announcements || []
  });
}
