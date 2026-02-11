import { NextRequest } from "next/server";
import { checkAdminRequest } from "@/lib/api-auth";
import { jsonError, jsonOk } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import { env } from "@/lib/env";
import { isUuid, safeText } from "@/lib/utils";
import { logSecurityEvent } from "@/lib/security-events";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminRequest(req)) return jsonError("Unauthorized", 401);
  const { id } = await params;
  if (!isUuid(id)) return jsonError("IDが不正です", 400);

  const body = (await req.json().catch(() => null)) as { suspended?: boolean; reason?: string } | null;
  if (typeof body?.suspended !== "boolean") return jsonError("suspended の指定が必要です", 400);

  const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.getUserById(id);
  if (userErr || !userData?.user) return jsonError("ユーザーが見つかりません", 404);

  const email = userData.user.email?.toLowerCase() || "";
  if (email === env.adminEmail.toLowerCase()) return jsonError("管理者アカウントは停止できません", 403);

  const reason = body.suspended ? safeText(body.reason, 0, 500) : null;
  const payload = {
    user_id: id,
    is_suspended: body.suspended,
    suspend_reason: body.suspended ? reason : null,
    suspended_at: body.suspended ? new Date().toISOString() : null,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabaseAdmin.from("user_account_controls").upsert(payload, { onConflict: "user_id" });
  if (error) return jsonError("ユーザー停止状態の更新に失敗しました", 500);

  await logSecurityEvent({
    eventType: body.suspended ? "user_suspended" : "user_unsuspended",
    severity: body.suspended ? "warn" : "info",
    target: userData.user.email ?? id,
    detail: { reason: reason || null }
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

