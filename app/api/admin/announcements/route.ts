import { NextRequest } from "next/server";
import { checkAdminRequest } from "@/lib/api-auth";
import { jsonError, jsonOk } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import { safeText } from "@/lib/utils";

export async function GET(req: NextRequest) {
  if (!checkAdminRequest(req)) return jsonError("Unauthorized", 401);

  const { data, error } = await supabaseAdmin
    .from("announcements")
    .select("id,title,body,scope,created_at")
    .order("created_at", { ascending: false });

  if (error) return jsonError("取得に失敗しました", 500);
  return jsonOk({ announcements: data || [] });
}

export async function POST(req: NextRequest) {
  if (!checkAdminRequest(req)) return jsonError("Unauthorized", 401);

  const body = (await req.json().catch(() => null)) as {
    title?: string;
    body?: string;
    scope?: "public" | "members";
  } | null;

  const title = safeText(body?.title, 1, 200);
  const text = safeText(body?.body, 1, 5000);
  const scope = body?.scope === "members" ? "members" : "public";

  if (!title || !text) return jsonError("入力が不正です", 400);

  const { data, error } = await supabaseAdmin
    .from("announcements")
    .insert({ title, body: text, scope })
    .select("id,title,body,scope,created_at")
    .single();

  if (error) return jsonError("作成に失敗しました", 500);
  return jsonOk({ announcement: data });
}
