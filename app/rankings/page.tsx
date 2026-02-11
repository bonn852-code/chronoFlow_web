import Link from "next/link";
import { getRankings } from "@/lib/queries";

export const revalidate = 120;
export const dynamic = "force-dynamic";

export default async function RankingsPage({
  searchParams
}: {
  searchParams?: Promise<{ range?: string; page?: string }>;
}) {
  const params = (await searchParams) || {};
  const range = params.range === "30d" ? "30d" : "all";
  const page = Math.max(1, Number(params.page || 1) || 1);
  const pageSize = 7;
  const rows = await getRankings(range, pageSize + 1, (page - 1) * pageSize);
  const hasNext = rows.length > pageSize;
  const rankings = rows.slice(0, pageSize);

  return (
    <div className="stack">
      <section className="card split">
        <div>
          <h1>ランキング</h1>
          <p className="meta">期間: {range === "all" ? "全期間" : "直近30日"}</p>
        </div>
        <div className="split">
          <Link href="/rankings?range=all&page=1" className="btn">
            全期間
          </Link>
          <Link href="/rankings?range=30d&page=1" className="btn">
            30日
          </Link>
        </div>
      </section>

      <section className="card">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>メンバー</th>
              <th>加入日</th>
              <th>いいね</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((row, idx) => (
              <tr key={row.member_id}>
                <td>{(page - 1) * pageSize + idx + 1}</td>
                <td>
                  <Link href={`/members/${row.member_id}`}>{row.members.display_name}</Link>
                </td>
                <td>{new Date(row.members.joined_at).toLocaleDateString("ja-JP")}</td>
                <td>{row.reaction_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="split">
        {page > 1 ? (
          <Link href={`/rankings?range=${range}&page=${page - 1}`} className="btn">
            前へ
          </Link>
        ) : (
          <button className="btn" type="button" disabled>
            前へ
          </button>
        )}
        <span className="meta">ページ {page}</span>
        {hasNext ? (
          <Link href={`/rankings?range=${range}&page=${page + 1}`} className="btn">
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
