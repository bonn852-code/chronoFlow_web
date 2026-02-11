import Link from "next/link";
import { getLatestPublicAnnouncements, getMembers } from "@/lib/queries";
import { MemberCard } from "@/components/member-card";

export const revalidate = 120;
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [announcements, members] = await Promise.all([getLatestPublicAnnouncements(6), getMembers("", 6)]);

  return (
    <div className="stack">
      <section className="hero section">
        <h1>ChronoFlow 公式サイト</h1>
        <p>メンバー活動、審査、学習、配布を一つにまとめたミニマルな運用サイト。</p>
      </section>

      <section className="section">
        <div className="split">
          <h2>報告・お知らせ</h2>
        </div>
        <article className="card stack">
          {!announcements.length ? <p className="meta">お知らせはまだありません</p> : null}
          {announcements.map((ann) => (
            <div key={ann.id} className="stack">
              <strong>{ann.title}</strong>
              <p className="meta">{new Date(ann.created_at).toLocaleDateString("ja-JP")}</p>
              <p>{ann.body}</p>
            </div>
          ))}
        </article>
      </section>

      <section className="section">
        <div className="split">
          <h2>メンバー</h2>
          <div className="split">
            <Link href="/members" className="btn">
              メンバー一覧
            </Link>
            <Link href="/rankings" className="btn">
              ランキングページ
            </Link>
          </div>
        </div>
        <div className="grid home-members-grid">
          {members.map((m) => (
            <MemberCard
              key={m.id}
              id={m.id}
              displayName={m.display_name}
              joinedAt={m.joined_at}
              iconUrl={m.icon_url}
              iconFocusX={m.icon_focus_x}
              iconFocusY={m.icon_focus_y}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
