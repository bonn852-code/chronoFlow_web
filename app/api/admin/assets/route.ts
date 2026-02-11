import { NextRequest } from "next/server";
import { checkAdminRequest } from "@/lib/api-auth";
import { jsonError, jsonOk } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import { safeText } from "@/lib/utils";

export async function GET(req: NextRequest) {
  if (!checkAdminRequest(req)) return jsonError("Unauthorized", 401);

  const { data, error } = await supabaseAdmin
    .from("assets")
    .select("id,name,external_url,description,scope,created_at")
    .order("created_at", { ascending: false });

  if (error) return jsonError("素材一覧取得に失敗しました", 500);
  return jsonOk({ assets: data || [] });
}

export async function POST(req: NextRequest) {
  if (!checkAdminRequest(req)) return jsonError("Unauthorized", 401);

  const body = (await req.json().catch(() => null)) as { name?: string; externalUrl?: string; description?: string } | null;
  const name = safeText(body?.name, 1, 120);
  const externalUrl = typeof body?.externalUrl === "string" ? body.externalUrl.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim().slice(0, 300) : null;

  if (!name || !externalUrl) return jsonError("表示名とリンクURLは必須です", 400);
  if (!/^https?:\/\/[^\s]+$/i.test(externalUrl)) return jsonError("外部リンクURLが不正です", 400);

  const { data, error } = await supabaseAdmin
    .from("assets")
    .insert({ name, external_url: externalUrl, description, storage_path: null, scope: "members" })
    .select("id,name,external_url,description,scope,created_at")
    .single();

  if (error) return jsonError("素材登録に失敗しました", 500);

  return jsonOk({ asset: data });
}
