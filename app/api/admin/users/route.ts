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
  let controls: Array<{
    user_id: string;
    is_suspended?: boolean;
    suspend_reason?: string | null;
    suspended_at?: string | null;
    is_member?: boolean;
    member_granted_at?: string | null;
  }> = [];
  let hasMemberColumn = true;
  if (ids.length) {
    const withMember = await supabaseAdmin
      .from("user_account_controls")
      .select("user_id,is_suspended,suspend_reason,suspended_at,is_member,member_granted_at")
      .in("user_id", ids);
    if (withMember.error) {
      const code = (withMember.error as { code?: string }).code;
      if (code === "42703") {
        hasMemberColumn = false;
        const legacy = await supabaseAdmin
          .from("user_account_controls")
          .select("user_id,is_suspended,suspend_reason,suspended_at")
          .in("user_id", ids);
        if (legacy.error) return jsonError("ユーザー制御情報の取得に失敗しました", 500);
        controls = legacy.data || [];
      } else if (code === "42P01") {
        hasMemberColumn = false;
        controls = [];
      } else {
        return jsonError("ユーザー制御情報の取得に失敗しました", 500);
      }
    } else {
      controls = withMember.data || [];
    }
  }

  const controlMap = new Map((controls || []).map((c) => [c.user_id, c]));
  const memberMap = new Map<string, boolean>();
  if (ids.length) {
    const { data: members } = await supabaseAdmin
      .from("members")
      .select("user_id,is_active")
      .in("user_id", ids)
      .eq("is_active", true);
    (members || []).forEach((m) => {
      if (typeof m.user_id === "string") memberMap.set(m.user_id, Boolean(m.is_active));
    });
  }
  return jsonOk({
    users: users.map((u) => {
      const ctrl = controlMap.get(u.id);
      const controlHasMember = Boolean(ctrl && "is_member" in ctrl);
      const memberFallback = memberMap.get(u.id) ?? false;
      return {
        id: u.id,
        email: u.email,
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at,
        suspended: Boolean(ctrl?.is_suspended),
        suspendReason: ctrl?.suspend_reason || null,
        suspendedAt: ctrl?.suspended_at || null,
        isMember: controlHasMember ? Boolean(ctrl?.is_member) || memberFallback : memberFallback,
        memberGrantedAt: ctrl?.member_granted_at || null
      };
    }),
    total: data.total || users.length,
    page,
    pageSize
  });
}
