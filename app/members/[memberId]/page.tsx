import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getMemberById, getRankings } from "@/lib/queries";
import { toDayDiff } from "@/lib/utils";
import { MemberBadges } from "@/components/badges";
import { MemberAvatar } from "@/components/member-avatar";
import { VideoLikeButton } from "@/components/video-like-button";

export const revalidate = 60;
export const dynamic = "force-dynamic";

function embedUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    if (host.includes("youtube.com")) {
      const v = parsed.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (host.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host.includes("tiktok.com") || host.includes("instagram.com")) return null;
    return null;
  } catch {
    return null;
  }
}

export default async function MemberDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ memberId: string }>;
  searchParams?: Promise<{ page?: string }>;
}) {
  const { memberId } = await params;
  const query = (await searchParams) || {};
  const page = Math.max(1, Number(query.page || 1) || 1);
  const pageSize = 3;
  const data = await getMemberById(memberId);
  if (!data) notFound();

  const allRank = await getRankings("all", 1);
  const isTop = allRank[0]?.member_id === data.member.id;

  const totalPages = Math.max(1, Math.ceil(data.links.length / pageSize));
  if (page > totalPages) {
    redirect(`/members/${memberId}?page=${totalPages}`);
  }
  const pagedLinks = data.links.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="stack member-detail-page">
      <section className="member-hero">
        <div className="member-hero-top">
          <Link href="/members" className="btn member-back-btn">
            メンバー一覧へ
          </Link>
          <span className="badge">Member Profile</span>
        </div>

        <div className="member-hero-main">
          <MemberAvatar
            name={data.member.display_name}
            iconUrl={data.member.icon_url}
            focusX={data.member.icon_focus_x}
            focusY={data.member.icon_focus_y}
            size={92}
          />
          <div className="stack">
            <h1 className="member-title">{data.member.display_name}</h1>
            <p className="meta">加入日: {new Date(data.member.joined_at).toLocaleDateString("ja-JP")}</p>
            <MemberBadges joinedAt={data.member.joined_at} isTop={isTop} />
          </div>
        </div>
      </section>

      <section className="member-stats-grid">
        <article className="card member-stat-card">
          <p className="meta">加入から</p>
          <p className="member-stat-value">{toDayDiff(data.member.joined_at)}日</p>
        </article>
        <article className="card member-stat-card">
          <p className="meta">総いいね</p>
          <p className="member-stat-value">{data.reactionCount}</p>
        </article>
        <article className="card member-stat-card">
          <p className="meta">作品数</p>
          <p className="member-stat-value">{data.links.length}</p>
        </article>
      </section>

      <section className="card stack member-works-section">
        <div className="split">
          <h2>作品一覧</h2>
          <span className="meta">{data.links.length}件 / {page}ページ目</span>
        </div>
        {!data.links.length ? <p className="meta">作品リンクはまだありません。</p> : null}
        {pagedLinks.map((link) => {
          const embed = embedUrl(link.url);
          return (
            <article key={link.id} className="member-work-card">
              <div className="member-work-head">
                <span className={`badge platform-badge platform-${link.platform}`}>{link.platform}</span>
                <div className="split">
                  <VideoLikeButton memberLinkId={link.id} initialCount={link.like_count || 0} />
                  <a href={link.url} target="_blank" rel="noreferrer" className="btn">
                    リンクを開く
                  </a>
                </div>
              </div>
              {embed ? (
                <iframe
                  title={link.url}
                  src={embed}
                  className="member-work-frame"
                  allowFullScreen
                />
              ) : (
                <p className="notice">埋め込み非対応のためリンクで表示しています。</p>
              )}
            </article>
          );
        })}
        {data.links.length > pageSize ? (
          <section className="pager">
            {page > 1 ? (
              <Link href={`/members/${memberId}?page=${page - 1}`} className="btn">
                前へ
              </Link>
            ) : (
              <button className="btn" type="button" disabled>
                前へ
              </button>
            )}
            <span className="meta">
              {page} / {totalPages}
            </span>
            {page < totalPages ? (
              <Link href={`/members/${memberId}?page=${page + 1}`} className="btn">
                次へ
              </Link>
            ) : (
              <button className="btn" type="button" disabled>
                次へ
              </button>
            )}
          </section>
        ) : null}
      </section>
    </div>
  );
}
