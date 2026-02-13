import { NextRequest } from "next/server";
import { checkAdminRequest } from "@/lib/api-auth";
import { jsonError, jsonOk } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import { safeText } from "@/lib/utils";

export async function GET(req: NextRequest) {
  if (!checkAdminRequest(req)) return jsonError("Unauthorized", 401);

  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || 1) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("pageSize") || 10) || 10));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const [{ data, error }, { count, error: countErr }] = await Promise.all([
    supabaseAdmin
      .from("announcements")
      .select("id,title,body,scope,created_at")
      .order("created_at", { ascending: false })
      .range(from, to),
    supabaseAdmin.from("announcements").select("*", { count: "exact", head: true })
  ]);

  if (error) return jsonError("取得に失敗しました", 500);
  if (countErr) return jsonError("件数の取得に失敗しました", 500);
  return jsonOk({ announcements: data || [], total: count || 0, page, pageSize });
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
