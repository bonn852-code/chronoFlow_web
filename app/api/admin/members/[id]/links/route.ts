import { NextRequest } from "next/server";
import { checkAdminRequest } from "@/lib/api-auth";
import { jsonError, jsonOk } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import { isUuid, isValidUrl, platformFromUrl, safeText } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminRequest(req)) return jsonError("Unauthorized", 401);
  const { id } = await params;
  if (!isUuid(id)) return jsonError("IDが不正です", 400);

  const body = (await req.json().catch(() => null)) as { url?: string; platform?: string } | null;
  const url = safeText(body?.url, 10, 2000);
  if (!url || !isValidUrl(url)) return jsonError("URLが不正です", 400);

  const platform = (["youtube", "tiktok", "instagram", "other"] as const).includes(body?.platform as never)
    ? (body?.platform as "youtube" | "tiktok" | "instagram" | "other")
    : platformFromUrl(url);

  const { data, error } = await supabaseAdmin
    .from("member_links")
    .insert({ member_id: id, platform, url })
    .select("id,member_id,platform,url,created_at")
    .single();

  if (error) return jsonError("リンク追加に失敗しました", 500);
  return jsonOk({ link: data });
}
