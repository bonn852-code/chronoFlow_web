import { NextRequest } from "next/server";
import { checkAdminRequest } from "@/lib/api-auth";
import { jsonError, jsonOk } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import { isUuid } from "@/lib/utils";
import { logSecurityEvent } from "@/lib/security-events";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminRequest(req)) return jsonError("Unauthorized", 401);
  const { id } = await params;
  if (!isUuid(id)) return jsonError("IDが不正です", 400);

  const { data, error } = await supabaseAdmin
    .from("contact_inquiries")
    .delete()
    .eq("id", id)
    .select("id,email,user_id")
    .maybeSingle();
  if (error) return jsonError("お問い合わせ削除に失敗しました", 500);
  if (!data) return jsonError("対象が見つかりません", 404);

  await logSecurityEvent({
    eventType: "contact_resolved_deleted",
    severity: "info",
    target: data.email || data.user_id || data.id,
    detail: { inquiryId: data.id }
  });

  return jsonOk({ ok: true });
}

