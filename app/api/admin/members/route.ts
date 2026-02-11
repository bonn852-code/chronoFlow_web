import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { checkAdminRequest } from "@/lib/api-auth";
import { jsonError, jsonOk } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import { safeText } from "@/lib/utils";

export async function GET(req: NextRequest) {
  if (!checkAdminRequest(req)) return jsonError("Unauthorized", 401);
  const includeInactive = req.nextUrl.searchParams.get("includeInactive") === "1";
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || 1) || 1);
  const pageSize = Math.min(30, Math.max(1, Number(req.nextUrl.searchParams.get("pageSize") || 7) || 7));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from("members")
    .select("id,display_name,joined_at,is_active,icon_url,icon_focus_x,icon_focus_y,portal_token,created_at")
    .order("joined_at", { ascending: false })
    .range(from, to);
  let countQuery = supabaseAdmin.from("members").select("*", { count: "exact", head: true });
  if (!includeInactive) {
    query = query.eq("is_active", true);
    countQuery = countQuery.eq("is_active", true);
  }
  const [{ data, error }, { count, error: countErr }] = await Promise.all([query, countQuery]);
  if (error) return jsonError("メンバー一覧取得に失敗しました", 500);
  if (countErr) return jsonError("メンバー件数取得に失敗しました", 500);
  return jsonOk({ members: data || [], total: count || 0, page, pageSize });
}

export async function POST(req: NextRequest) {
  if (!checkAdminRequest(req)) return jsonError("Unauthorized", 401);
  const body = (await req.json().catch(() => null)) as { displayName?: string } | null;
  const displayName = safeText(body?.displayName, 1, 120);
  if (!displayName) return jsonError("表示名が不正です", 400);

  const { data, error } = await supabaseAdmin
    .from("members")
    .insert({ display_name: displayName, portal_token: randomUUID() })
    .select("id,display_name,joined_at,is_active,icon_url,icon_focus_x,icon_focus_y,portal_token,created_at")
    .single();

  if (error) return jsonError("メンバー作成に失敗しました", 500);
  return jsonOk({ member: data });
}
