import { NextRequest } from "next/server";
import { checkAdminRequest } from "@/lib/api-auth";
import { jsonError, jsonOk } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import { isValidUrl, safeText } from "@/lib/utils";

export async function GET(req: NextRequest) {
  if (!checkAdminRequest(req)) return jsonError("Unauthorized", 401);

  const { data, error } = await supabaseAdmin
    .from("lessons_ae")
    .select("id,title,youtube_url,sort_order,created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return jsonError("取得に失敗しました", 500);
  return jsonOk({ lessons: data || [] });
}

export async function POST(req: NextRequest) {
  if (!checkAdminRequest(req)) return jsonError("Unauthorized", 401);

  const body = (await req.json().catch(() => null)) as { title?: string; youtubeUrl?: string; sortOrder?: number } | null;
  const title = safeText(body?.title, 1, 200);
  const youtubeUrl = safeText(body?.youtubeUrl, 10, 2000);
  const sortOrder = Number(body?.sortOrder || 0);

  if (!title || !youtubeUrl || !isValidUrl(youtubeUrl)) return jsonError("入力が不正です", 400);

  const { data, error } = await supabaseAdmin
    .from("lessons_ae")
    .insert({ title, youtube_url: youtubeUrl, sort_order: sortOrder })
    .select("id,title,youtube_url,sort_order,created_at")
    .single();

  if (error) return jsonError("講座追加に失敗しました", 500);
  return jsonOk({ lesson: data });
}
