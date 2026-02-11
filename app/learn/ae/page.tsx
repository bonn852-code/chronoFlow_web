import { supabaseAdmin } from "@/lib/supabase";

export const revalidate = 120;
export const dynamic = "force-dynamic";

export default async function LearnAePage() {
  const { data } = await supabaseAdmin
    .from("lessons_ae")
    .select("id,title,youtube_url,sort_order,created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  return (
    <div className="stack">
      <section className="card">
        <h1>After Effects Learning</h1>
        <p className="meta">管理者が選定したYouTube講座一覧です。</p>
      </section>
      <section className="grid grid-2">
        {(data || []).map((lesson) => (
          <article key={lesson.id} className="card stack">
            <h3>{lesson.title}</h3>
            <a href={lesson.youtube_url} target="_blank" rel="noreferrer" className="btn">
              YouTubeで開く
            </a>
          </article>
        ))}
        {!data?.length ? <article className="card meta">講座はまだ登録されていません。</article> : null}
      </section>
    </div>
  );
}
