import { NextRequest } from "next/server";
import { checkAdminRequest } from "@/lib/api-auth";
import { jsonError, jsonOk } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import { isUuid } from "@/lib/utils";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminRequest(req)) return jsonError("Unauthorized", 401);
  const { id } = await params;
  if (!isUuid(id)) return jsonError("IDが不正です", 400);

  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from("assets")
    .select("id,storage_path")
    .eq("id", id)
    .single();

  if (fetchErr) return jsonError("素材の取得に失敗しました", 500);

  const { error: storageErr } = await supabaseAdmin.storage.from("member-assets").remove([existing.storage_path]);
  if (storageErr) return jsonError("Storage削除に失敗しました", 500);

  const { error } = await supabaseAdmin.from("assets").delete().eq("id", id);
  if (error) return jsonError("素材削除に失敗しました", 500);

  return jsonOk({ ok: true });
}
