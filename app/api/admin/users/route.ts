import { NextRequest } from "next/server";
import { checkAdminRequest } from "@/lib/api-auth";
import { jsonError, jsonOk } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  if (!checkAdminRequest(req)) return jsonError("Unauthorized", 401);

  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || 1) || 1);
  const pageSize = Math.min(30, Math.max(1, Number(req.nextUrl.searchParams.get("pageSize") || 7) || 7));

  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page,
    perPage: pageSize
  });
  if (error) return jsonError("ユーザー一覧の取得に失敗しました", 500);

  const users = data.users || [];
  const ids = users.map((u) => u.id);
  const { data: controls, error: controlErr } = ids.length
    ? await supabaseAdmin
        .from("user_account_controls")
        .select("user_id,is_suspended,suspend_reason,suspended_at")
        .in("user_id", ids)
    : { data: [], error: null };
  if (controlErr) return jsonError("ユーザー制御情報の取得に失敗しました", 500);

  const controlMap = new Map((controls || []).map((c) => [c.user_id, c]));
  return jsonOk({
    users: users.map((u) => {
      const ctrl = controlMap.get(u.id);
      return {
        id: u.id,
        email: u.email,
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at,
        suspended: Boolean(ctrl?.is_suspended),
        suspendReason: ctrl?.suspend_reason || null,
        suspendedAt: ctrl?.suspended_at || null
      };
    }),
    total: data.total || users.length,
    page,
    pageSize
  });
}

