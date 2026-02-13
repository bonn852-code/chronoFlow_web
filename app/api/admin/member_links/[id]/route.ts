import { NextRequest } from "next/server";
import { checkAdminRequest } from "@/lib/api-auth";
import { jsonError, jsonOk } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import { isUuid } from "@/lib/utils";
import { applyRateLimit } from "@/lib/rate-limit";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminRequest(req)) return jsonError("Unauthorized", 401);

  const rate = applyRateLimit(req.headers, "admin_member_links_delete", 60, 60_000);
  if (!rate.allowed) return jsonError("アクセスが多すぎます", 429, { retryAfter: rate.retryAfterSeconds });

  const { id } = await params;
  if (!isUuid(id)) return jsonError("IDが不正です", 400);

  const { error } = await supabaseAdmin.from("member_links").delete().eq("id", id);
  if (error) return jsonError("リンク削除に失敗しました", 500);

  return jsonOk({ ok: true });
}
