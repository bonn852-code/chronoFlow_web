import { NextRequest } from "next/server";
import { checkAdminRequest } from "@/lib/api-auth";
import { jsonError, jsonOk } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import { safeText } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminRequest(req)) return jsonError("Unauthorized", 401);
  const { id } = await params;

  const body = (await req.json().catch(() => null)) as {
    status?: "approved" | "rejected";
    adviceText?: string;
  } | null;

  if (!body?.status || !["approved", "rejected"].includes(body.status)) {
    return jsonError("不正なステータスです", 400);
  }

  const advice = body.status === "rejected" ? safeText(body.adviceText ?? "", 0, 2000) : null;

  const { error } = await supabaseAdmin
    .from("audition_applications")
    .update({
      status: body.status,
      advice_text: body.status === "rejected" ? advice : null,
      reviewed_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) return jsonError("審査更新に失敗しました", 500);
  return jsonOk({ ok: true });
}
