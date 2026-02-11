import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { checkAdminRequest } from "@/lib/api-auth";
import { createNextBatch, getCurrentBatch } from "@/lib/auditions";
import { jsonError, jsonOk } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  if (!checkAdminRequest(req)) return jsonError("Unauthorized", 401);

  try {
    const batch = await getCurrentBatch();
    if (batch.published_at) return jsonError("このバッチは既に公開済みです", 409);

    const { data: approved, error: appErr } = await supabaseAdmin
      .from("audition_applications")
      .select("id,display_name,applied_by_user_id")
      .eq("batch_id", batch.id)
      .eq("status", "approved");

    if (appErr) return jsonError("合格者取得に失敗しました", 500);

    const approvedIds = (approved || []).map((a) => a.id);

    if (approvedIds.length) {
      const { data: existing, error: existingErr } = await supabaseAdmin
        .from("members")
        .select("created_from_application_id")
        .in("created_from_application_id", approvedIds);

      if (existingErr) return jsonError("既存メンバー確認に失敗しました", 500);

      const existingSet = new Set((existing || []).map((e) => e.created_from_application_id));
      const inserts = (approved || [])
        .filter((a) => !existingSet.has(a.id))
        .map((a) => ({
          display_name: a.display_name,
          joined_at: new Date().toISOString(),
          is_active: true,
          portal_token: randomUUID(),
          created_from_application_id: a.id
        }));

      if (inserts.length) {
        const { error: insertErr } = await supabaseAdmin.from("members").insert(inserts);
        if (insertErr) return jsonError("メンバー追加に失敗しました", 500);
      }

      const grantedUserIds = Array.from(
        new Set(
          (approved || [])
            .map((a) => a.applied_by_user_id)
            .filter((v): v is string => typeof v === "string" && v.length > 0)
        )
      );

      if (grantedUserIds.length) {
        const now = new Date().toISOString();
        const rows = grantedUserIds.map((userId) => ({
          user_id: userId,
          is_member: true,
          member_granted_at: now,
          updated_at: now
        }));
        const { error: grantErr } = await supabaseAdmin.from("user_account_controls").upsert(rows, { onConflict: "user_id" });
        if (grantErr) {
          if ((grantErr as { code?: string }).code === "42703") {
            return jsonError("DBの最新スキーマが未適用です（user_account_controls / audition_applications の追加列）", 500);
          }
          return jsonError("メンバー権限付与に失敗しました", 500);
        }
      }
    }

    const { error: publishErr } = await supabaseAdmin
      .from("audition_batches")
      .update({ published_at: new Date().toISOString() })
      .eq("id", batch.id);

    if (publishErr) return jsonError("結果発表に失敗しました", 500);

    await createNextBatch();

    return jsonOk({ ok: true, publishedCount: approvedIds.length, nextBatchCreated: true });
  } catch {
    return jsonError("結果発表に失敗しました", 500);
  }
}
