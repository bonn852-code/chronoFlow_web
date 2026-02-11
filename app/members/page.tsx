import Link from "next/link";
import { getMembersPaged } from "@/lib/queries";
import { MemberCard } from "@/components/member-card";

export const revalidate = 120;
export const dynamic = "force-dynamic";

export default async function MembersPage({
  searchParams
}: {
  searchParams?: Promise<{ query?: string; page?: string }>;
}) {
  const params = (await searchParams) || {};
  const query = params.query || "";
  const page = Math.max(1, Number(params.page || 1) || 1);
  const pageSize = 7;
  const { members, total } = await getMembersPaged(query, page, pageSize);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="stack">
      <section className="card">
        <h1>Members</h1>
        <form action="/members" method="get" className="split">
          <input name="query" defaultValue={query} placeholder="名前で検索" />
          <input type="hidden" name="page" value="1" />
          <button className="btn primary" type="submit">
            検索
          </button>
        </form>
      </section>

      <section className="grid grid-3">
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
      </section>

      {!members.length ? (
        <section className="card">
          <p className="meta">該当メンバーがいません。</p>
          <Link href="/members" className="btn">
            クリア
          </Link>
        </section>
      ) : null}

      <section className="split">
        {page > 1 ? (
          <Link href={`/members?query=${encodeURIComponent(query)}&page=${page - 1}`} className="btn">
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
          <Link href={`/members?query=${encodeURIComponent(query)}&page=${page + 1}`} className="btn">
            次へ
          </Link>
        ) : (
          <button className="btn" type="button" disabled>
            次へ
          </button>
        )}
      </section>
    </div>
  );
}
