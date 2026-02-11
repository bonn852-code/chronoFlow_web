import { NextRequest } from "next/server";
import { checkAdminRequest } from "@/lib/api-auth";
import { jsonError, jsonOk } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  if (!checkAdminRequest(req)) return jsonError("Unauthorized", 401);

  const { data, error } = await supabaseAdmin
    .from("assets")
    .select("id,name,storage_path,scope,created_at")
    .order("created_at", { ascending: false });

  if (error) return jsonError("素材一覧取得に失敗しました", 500);
  return jsonOk({ assets: data || [] });
}

export async function POST(req: NextRequest) {
  if (!checkAdminRequest(req)) return jsonError("Unauthorized", 401);

  const formData = await req.formData();
  const file = formData.get("file");
  const nameRaw = formData.get("name");

  if (!(file instanceof File)) return jsonError("ファイルが必要です", 400);

  const name = typeof nameRaw === "string" && nameRaw.trim() ? nameRaw.trim() : file.name;
  const storagePath = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const bytes = await file.arrayBuffer();
  const { error: uploadErr } = await supabaseAdmin.storage
    .from("member-assets")
    .upload(storagePath, bytes, { upsert: false, contentType: file.type || "application/octet-stream" });

  if (uploadErr) return jsonError("Storageアップロードに失敗しました", 500);

  const { data, error } = await supabaseAdmin
    .from("assets")
    .insert({ name, storage_path: storagePath, scope: "members" })
    .select("id,name,storage_path,scope,created_at")
    .single();

  if (error) return jsonError("素材登録に失敗しました", 500);

  return jsonOk({ asset: data });
}
