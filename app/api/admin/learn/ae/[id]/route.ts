import { NextRequest } from "next/server";
import { checkAdminRequest } from "@/lib/api-auth";
import { jsonError, jsonOk } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminRequest(req)) return jsonError("Unauthorized", 401);
  const { id } = await params;

  const { error } = await supabaseAdmin.from("lessons_ae").delete().eq("id", id);
  if (error) return jsonError("講座削除に失敗しました", 500);

  return jsonOk({ ok: true });
}
