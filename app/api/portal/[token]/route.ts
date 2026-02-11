import { jsonError, jsonOk } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { data: member, error: memberErr } = await supabaseAdmin
    .from("members")
    .select("id,display_name,portal_token,is_active")
    .eq("portal_token", token)
    .eq("is_active", true)
    .maybeSingle();

  if (memberErr) return jsonError("ポータル取得に失敗しました", 500);
  if (!member) return jsonError("無効なトークンです", 404);

  const [{ data: announcements, error: annErr }, { data: assets, error: assetErr }] = await Promise.all([
    supabaseAdmin
      .from("announcements")
      .select("id,title,body,scope,created_at")
      .eq("scope", "members")
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("assets").select("id,name,storage_path,created_at").eq("scope", "members").order("created_at", { ascending: false })
  ]);

  if (annErr || assetErr) return jsonError("ポータル情報の取得に失敗しました", 500);

  const signedAssets = await Promise.all(
    (assets || []).map(async (asset) => {
      const { data } = await supabaseAdmin.storage.from("member-assets").createSignedUrl(asset.storage_path, 60 * 60);
      return {
        id: asset.id,
        name: asset.name,
        url: data?.signedUrl || null,
        created_at: asset.created_at
      };
    })
  );

  return jsonOk({
    member: { id: member.id, displayName: member.display_name },
    announcements: announcements || [],
    assets: signedAssets
  });
}
