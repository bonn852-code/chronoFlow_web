import { NextRequest } from "next/server";
import { checkAdminRequest } from "@/lib/api-auth";
import { getCurrentBatch } from "@/lib/auditions";
import { jsonError, jsonOk } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import { getProfilesByUserIds } from "@/lib/profile";

export async function GET(req: NextRequest) {
  if (!checkAdminRequest(req)) return jsonError("Unauthorized", 401);

  const status = req.nextUrl.searchParams.get("status");
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || 1) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("pageSize") || 7) || 7));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    const batch = await getCurrentBatch();
    let q = supabaseAdmin
      .from("audition_applications")
      .select(
        "id,batch_id,applied_by_user_id,display_name,video_url,sns_urls,consent_public_profile,consent_advice,status,advice_text,application_code,created_at,reviewed_at"
      )
      .eq("batch_id", batch.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    let countQ = supabaseAdmin
      .from("audition_applications")
      .select("*", { count: "exact", head: true })
      .eq("batch_id", batch.id);

    if (status && ["pending", "approved", "rejected"].includes(status)) {
      q = q.eq("status", status);
      countQ = countQ.eq("status", status);
    }

    const [{ data, error }, { count, error: countErr }, { data: batches, error: batchErr }] = await Promise.all([
      q,
      countQ,
      supabaseAdmin
        .from("audition_batches")
        .select("id,title,apply_open_at,apply_close_at,published_at,created_at")
        .is("deleted_at", null)
        .not("published_at", "is", null)
        .order("created_at", { ascending: false })
        .limit(50)
    ]);
    if (error) return jsonError("申請一覧の取得に失敗しました", 500);
    if (countErr) return jsonError("申請件数取得に失敗しました", 500);
    if (batchErr) return jsonError("回次一覧の取得に失敗しました", 500);

    const applications = data || [];
    const profileMap = await getProfilesByUserIds(
      applications.map((item) => item.applied_by_user_id).filter((v): v is string => typeof v === "string" && v.length > 0)
    );
    const mergedApplications = applications.map((item) => {
      const profile = item.applied_by_user_id ? profileMap.get(item.applied_by_user_id) : null;
      return {
        ...item,
        display_name: profile?.display_name || item.display_name
      };
    });

    const counts = {
      pending: (data || []).filter((x) => x.status === "pending").length,
      approved: (data || []).filter((x) => x.status === "approved").length,
      rejected: (data || []).filter((x) => x.status === "rejected").length
    };

    return jsonOk({ batch, applications: mergedApplications, counts, batches: batches || [], total: count || 0, page, pageSize });
  } catch {
    return jsonError("申請一覧の取得に失敗しました", 500);
  }
}

export async function PATCH(req: NextRequest) {
  if (!checkAdminRequest(req)) return jsonError("Unauthorized", 401);

  const body = (await req.json().catch(() => null)) as {
    applyOpenAt?: string;
    applyCloseAt?: string;
  } | null;

  if (!body?.applyOpenAt || !body?.applyCloseAt) return jsonError("申請期間の入力が必要です", 400);

  const openAt = new Date(body.applyOpenAt);
  const closeAt = new Date(body.applyCloseAt);
  if (Number.isNaN(openAt.getTime()) || Number.isNaN(closeAt.getTime()) || openAt >= closeAt) {
    return jsonError("期間設定が不正です", 400);
  }

  try {
    const batch = await getCurrentBatch();
    const { data, error } = await supabaseAdmin
      .from("audition_batches")
      .update({
        apply_open_at: openAt.toISOString(),
        apply_close_at: closeAt.toISOString()
      })
      .eq("id", batch.id)
      .select("id,title,apply_open_at,apply_close_at,created_at,published_at")
      .single();

    if (error) return jsonError("申請期間の更新に失敗しました", 500);
    return jsonOk({ batch: data });
  } catch {
    return jsonError("申請期間の更新に失敗しました", 500);
  }
}
