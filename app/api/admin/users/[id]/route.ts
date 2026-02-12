import { NextRequest } from "next/server";
import { checkAdminRequest } from "@/lib/api-auth";
import { jsonError, jsonOk } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import { env } from "@/lib/env";
import { isUuid, safeText } from "@/lib/utils";
import { logSecurityEvent } from "@/lib/security-events";
import { ensureUserProfile } from "@/lib/profile";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminRequest(req)) return jsonError("Unauthorized", 401);
  const { id } = await params;
  if (!isUuid(id)) return jsonError("IDが不正です", 400);

  const body = (await req.json().catch(() => null)) as { suspended?: boolean; reason?: string; isMember?: boolean } | null;
  if (typeof body?.suspended !== "boolean" && typeof body?.isMember !== "boolean") {
    return jsonError("更新対象が指定されていません", 400);
  }

  const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.getUserById(id);
  if (userErr || !userData?.user) return jsonError("ユーザーが見つかりません", 404);

  const email = userData.user.email?.toLowerCase() || "";
  if (email === env.adminEmail.toLowerCase()) return jsonError("管理者アカウントは停止できません", 403);

  const prev = await supabaseAdmin
    .from("user_account_controls")
    .select("*")
    .eq("user_id", id)
    .maybeSingle();

  const current = prev.data || {};
  const nextSuspended = typeof body.suspended === "boolean" ? body.suspended : Boolean(current.is_suspended);
  const nextIsMember = typeof body.isMember === "boolean" ? body.isMember : Boolean(current.is_member);
  const reason = nextSuspended ? safeText(body.reason, 0, 500) : null;
  const payload = {
    user_id: id,
    is_suspended: nextSuspended,
    suspend_reason: nextSuspended ? reason : null,
    suspended_at: nextSuspended ? new Date().toISOString() : null,
    is_member: nextIsMember,
    member_granted_at: nextIsMember ? new Date().toISOString() : null,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabaseAdmin.from("user_account_controls").upsert(payload, { onConflict: "user_id" });
  if (error) return jsonError("ユーザー停止状態の更新に失敗しました", 500);

  if (typeof body.isMember === "boolean") {
    if (nextIsMember) {
      const profile = await ensureUserProfile({ id: userData.user.id, user_metadata: userData.user.user_metadata || null });
      const displayName =
        profile?.display_name ||
        safeText(userData.user.user_metadata?.display_name, 1, 120) ||
        (userData.user.email ? userData.user.email.split("@")[0] : "") ||
        "メンバー";

      const existing = await supabaseAdmin
        .from("members")
        .select("id")
        .eq("user_id", id)
        .maybeSingle();

      if (existing.data?.id) {
        await supabaseAdmin
          .from("members")
          .update({
            display_name: displayName,
            is_active: true,
            icon_url: profile?.icon_url ?? null,
            icon_focus_x: profile?.icon_focus_x ?? 50,
            icon_focus_y: profile?.icon_focus_y ?? 50
          })
          .eq("user_id", id);
      } else {
        await supabaseAdmin.from("members").insert({
          user_id: id,
          display_name: displayName,
          is_active: true,
          icon_url: profile?.icon_url ?? null,
          icon_focus_x: profile?.icon_focus_x ?? 50,
          icon_focus_y: profile?.icon_focus_y ?? 50
        });
      }
    } else {
      await supabaseAdmin.from("members").update({ is_active: false }).eq("user_id", id);
    }
  }

  await logSecurityEvent({
    eventType:
      typeof body.suspended === "boolean"
        ? body.suspended
          ? "user_suspended"
          : "user_unsuspended"
        : nextIsMember
          ? "member_access_granted"
          : "member_access_revoked",
    severity: nextSuspended ? "warn" : "info",
    target: userData.user.email ?? id,
    detail: { reason: reason || null, isMember: nextIsMember }
  });

  return jsonOk({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminRequest(req)) return jsonError("Unauthorized", 401);
  const { id } = await params;
  if (!isUuid(id)) return jsonError("IDが不正です", 400);

  const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.getUserById(id);
  if (userErr || !userData?.user) return jsonError("ユーザーが見つかりません", 404);
  const email = userData.user.email?.toLowerCase() || "";
  if (email === env.adminEmail.toLowerCase()) return jsonError("管理者アカウントは削除できません", 403);

  const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (deleteErr) return jsonError("ユーザー削除に失敗しました", 500);
  await supabaseAdmin.from("user_account_controls").delete().eq("user_id", id);

  await logSecurityEvent({
    eventType: "user_deleted_by_admin",
    severity: "warn",
    target: userData.user.email ?? id
  });

  return jsonOk({ ok: true });
}
