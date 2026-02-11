import Link from "next/link";
import { redirect } from "next/navigation";
import { getMembersPaged, getPublicAnnouncementsPaged } from "@/lib/queries";
import { MemberCard } from "@/components/member-card";
import { GuestRegisterCta } from "@/components/guest-register-cta";

export const revalidate = 120;
export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams
}: {
  searchParams?: Promise<{ annPage?: string; memberPage?: string }>;
}) {
  const params = (await searchParams) || {};
  const annPage = Math.max(1, Number(params.annPage || 1) || 1);
  const memberPage = Math.max(1, Number(params.memberPage || 1) || 1);
  const [annPageData, memberPageData] = await Promise.all([getPublicAnnouncementsPaged(annPage, 3), getMembersPaged("", memberPage, 3)]);
  const annTotalPages = Math.max(1, Math.ceil(annPageData.total / annPageData.pageSize));
  const memberTotalPages = Math.max(1, Math.ceil(memberPageData.total / memberPageData.pageSize));
  if (annPage > annTotalPages || memberPage > memberTotalPages) {
    redirect(`/?annPage=${Math.min(annPage, annTotalPages)}&memberPage=${Math.min(memberPage, memberTotalPages)}`);
  }

  return (
    <div className="stack">
      <section className="hero section">
        <h1>ChronoFlow 公式サイト</h1>
        <p>メンバー活動、審査、学習、配布を一つにまとめたミニマルな運用サイト。</p>
        <GuestRegisterCta />
      </section>

      <section className="section">
        <div className="split">
          <h2>報告・お知らせ</h2>
        </div>
        <article className="card stack">
          {!annPageData.announcements.length ? <p className="meta">お知らせはまだありません</p> : null}
          {annPageData.announcements.map((ann) => (
            <div key={ann.id} className="stack">
              <strong>{ann.title}</strong>
              <p className="meta">{new Date(ann.created_at).toLocaleDateString("ja-JP")}</p>
              <p>{ann.body}</p>
            </div>
          ))}
        </article>
        <section className="split">
          {annPage > 1 ? (
            <Link href={`/?annPage=${annPage - 1}&memberPage=${memberPage}`} className="btn">
              前へ
            </Link>
          ) : (
            <button className="btn" type="button" disabled>
              前へ
            </button>
          )}
          <span className="meta">
            お知らせ {annPage} / {annTotalPages}
          </span>
          {annPage < annTotalPages ? (
            <Link href={`/?annPage=${annPage + 1}&memberPage=${memberPage}`} className="btn">
              次へ
            </Link>
          ) : (
            <button className="btn" type="button" disabled>
              次へ
            </button>
          )}
        </section>
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
          {memberPageData.members.map((m) => (
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
        <section className="split">
          {memberPage > 1 ? (
            <Link href={`/?memberPage=${memberPage - 1}&annPage=${annPage}`} className="btn">
              前へ
            </Link>
          ) : (
            <button className="btn" type="button" disabled>
              前へ
            </button>
          )}
          <span className="meta">
            メンバー {memberPage} / {memberTotalPages}
          </span>
          {memberPage < memberTotalPages ? (
            <Link href={`/?memberPage=${memberPage + 1}&annPage=${annPage}`} className="btn">
              次へ
            </Link>
          ) : (
            <button className="btn" type="button" disabled>
              次へ
            </button>
          )}
        </section>
      </section>
    </div>
  );
}
