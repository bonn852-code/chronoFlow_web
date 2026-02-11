import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function PortalPage({ params }: { params: Promise<{ portalToken: string }> }) {
  const { portalToken } = await params;

  const { data: member } = await supabaseAdmin
    .from("members")
    .select("id,display_name,is_active")
    .eq("portal_token", portalToken)
    .eq("is_active", true)
    .maybeSingle();

  if (!member) notFound();

  const { data: announcements } = await supabaseAdmin
    .from("announcements")
    .select("id,title,body,created_at")
    .eq("scope", "members")
    .order("created_at", { ascending: false });

  return (
    <div className="stack">
      <section className="hero">
        <h1>Member Portal</h1>
        <p>{member.display_name} さん専用ページ</p>
      </section>

      <section className="grid grid-2">
        <article className="card stack">
          <h2>配布素材</h2>
          <p className="meta">
            素材はログイン後に `Assets` ページで確認できます。セキュリティ保護のため、このポータルでは直接配布していません。
          </p>
        </article>

        <article className="card stack">
          <h2>お知らせ</h2>
          {!announcements?.length ? <p className="meta">お知らせはありません。</p> : null}
          {(announcements || []).map((ann) => (
            <div key={ann.id} className="stack">
              <strong>{ann.title}</strong>
              <p className="meta">{new Date(ann.created_at).toLocaleDateString("ja-JP")}</p>
              <p>{ann.body}</p>
            </div>
          ))}
        </article>
      </section>
    </div>
  );
}
