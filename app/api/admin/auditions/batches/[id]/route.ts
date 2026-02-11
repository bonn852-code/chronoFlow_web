import { NextRequest } from "next/server";
import { checkAdminRequest } from "@/lib/api-auth";
import { jsonError, jsonOk } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminRequest(req)) return jsonError("Unauthorized", 401);
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("audition_batches")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error) return jsonError("回次結果の削除に失敗しました", 500);
  if (!data) return jsonError("対象の回次が見つかりません", 404);

  return jsonOk({ ok: true, deletedCount: 1 });
}
