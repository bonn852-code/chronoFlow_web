import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { checkAdminRequest } from "@/lib/api-auth";
import { jsonError, jsonOk } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import { isUuid } from "@/lib/utils";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminRequest(req)) return jsonError("Unauthorized", 401);
  const { id } = await params;
  if (!isUuid(id)) return jsonError("IDが不正です", 400);
  const permanent = req.nextUrl.searchParams.get("permanent") === "1";

  if (permanent) {
    const { data, error } = await supabaseAdmin.from("members").delete().eq("id", id).select("id").maybeSingle();
    if (error) return jsonError("完全削除に失敗しました", 500);
    if (!data) return jsonError("対象メンバーが見つかりません", 404);
    return jsonOk({ ok: true, mode: "permanent" });
  }

  const { data, error } = await supabaseAdmin
    .from("members")
    .update({ is_active: false })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return jsonError("メンバー削除に失敗しました", 500);
  if (!data) return jsonError("対象メンバーが見つかりません", 404);

  return jsonOk({ ok: true, mode: "deactivate" });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminRequest(req)) return jsonError("Unauthorized", 401);
  const { id } = await params;
  if (!isUuid(id)) return jsonError("IDが不正です", 400);
  const body = (await req.json().catch(() => null)) as
    | {
        regeneratePortal?: boolean;
        iconUrl?: string | null;
        iconFocusX?: number;
        iconFocusY?: number;
      }
    | null;
  if (!body) return jsonError("不正なリクエストです", 400);

  if (body.regeneratePortal) {
    const { data, error } = await supabaseAdmin
      .from("members")
      .update({ portal_token: randomUUID() })
      .eq("id", id)
      .select("id,portal_token")
      .single();

    if (error) return jsonError("ポータルトークン再発行に失敗しました", 500);
    return jsonOk({ member: data });
  }

  const iconUrl =
    body.iconUrl === null ? null : typeof body.iconUrl === "string" && body.iconUrl.trim() ? body.iconUrl.trim() : null;
  const iconFocusX = Number.isFinite(body.iconFocusX) ? Math.min(100, Math.max(0, Math.round(body.iconFocusX!))) : 50;
  const iconFocusY = Number.isFinite(body.iconFocusY) ? Math.min(100, Math.max(0, Math.round(body.iconFocusY!))) : 50;

  const { data, error } = await supabaseAdmin
    .from("members")
    .update({
      icon_url: iconUrl,
      icon_focus_x: iconFocusX,
      icon_focus_y: iconFocusY
    })
    .eq("id", id)
    .select("id,icon_url,icon_focus_x,icon_focus_y")
    .single();

  if (error) return jsonError("アイコン設定の更新に失敗しました", 500);
  return jsonOk({ member: data });
}
