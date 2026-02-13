import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { checkAdminRequest } from "@/lib/api-auth";
import { jsonError, jsonOk } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import { getResolvedProfilesByUserIds } from "@/lib/profile";
import { safeText } from "@/lib/utils";
import { applyRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  if (!checkAdminRequest(req)) return jsonError("Unauthorized", 401);

  const rate = applyRateLimit(req.headers, "admin_members_list", 120, 60_000);
  if (!rate.allowed) return jsonError("アクセスが多すぎます", 429, { retryAfter: rate.retryAfterSeconds });

  const includeInactive = req.nextUrl.searchParams.get("includeInactive") === "1";
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || 1) || 1);
  const pageSize = Math.min(30, Math.max(1, Number(req.nextUrl.searchParams.get("pageSize") || 7) || 7));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from("members")
    .select("id,user_id,created_from_application_id,display_name,joined_at,is_active,icon_url,icon_focus_x,icon_focus_y,portal_token,created_at")
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
  const rows = data || [];

  const missingUserAppIds = rows
    .filter((m) => !m.user_id && typeof m.created_from_application_id === "string" && m.created_from_application_id.length > 0)
    .map((m) => m.created_from_application_id as string);

  let appUserMap = new Map<string, string>();
  if (missingUserAppIds.length) {
    const { data: appRows } = await supabaseAdmin
      .from("audition_applications")
      .select("id,applied_by_user_id")
      .in("id", missingUserAppIds);
    appUserMap = new Map(
      (appRows || [])
        .filter((row) => typeof row.applied_by_user_id === "string" && row.applied_by_user_id.length > 0)
        .map((row) => [row.id, row.applied_by_user_id as string])
    );
  }

  const effectiveUserIds = rows
    .map((m) => m.user_id || (m.created_from_application_id ? appUserMap.get(m.created_from_application_id) : null))
    .filter((v): v is string => typeof v === "string" && v.length > 0);
  const profileMap = await getResolvedProfilesByUserIds(effectiveUserIds);

  const members = rows.map((m) => {
    const effectiveUserId = m.user_id || (m.created_from_application_id ? appUserMap.get(m.created_from_application_id) : null);
    const profile = effectiveUserId ? profileMap.get(effectiveUserId) : null;
    return {
      ...m,
      display_name: profile?.display_name || m.display_name,
      icon_url: profile?.icon_url ?? m.icon_url,
      icon_focus_x: profile?.icon_focus_x ?? m.icon_focus_x,
      icon_focus_y: profile?.icon_focus_y ?? m.icon_focus_y
    };
  });

  return jsonOk({ members, total: count || 0, page, pageSize });
}

export async function POST(req: NextRequest) {
  if (!checkAdminRequest(req)) return jsonError("Unauthorized", 401);

  const rate = applyRateLimit(req.headers, "admin_members_create", 30, 60_000);
  if (!rate.allowed) return jsonError("アクセスが多すぎます", 429, { retryAfter: rate.retryAfterSeconds });

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
