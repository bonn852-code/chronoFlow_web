import { NextRequest } from "next/server";
import { checkAdminRequest } from "@/lib/api-auth";
import { jsonError, jsonOk } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  if (!checkAdminRequest(req)) return jsonError("Unauthorized", 401);

  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || 1) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("pageSize") || 20) || 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const [{ data, error }, { count, error: countErr }] = await Promise.all([
    supabaseAdmin
      .from("security_events")
      .select("id,event_type,severity,actor_user_id,target,detail,created_at")
      .order("created_at", { ascending: false })
      .range(from, to),
    supabaseAdmin.from("security_events").select("*", { count: "exact", head: true })
  ]);
  if (error) return jsonError("セキュリティログの取得に失敗しました", 500);
  if (countErr) return jsonError("セキュリティログ件数の取得に失敗しました", 500);

  return jsonOk({ events: data || [], total: count || 0, page, pageSize });
}

