import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuditionBatchesPaged } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AuditionResultPage({
  searchParams
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const params = (await searchParams) || {};
  const page = Math.max(1, Number(params.page || 1) || 1);
  const { batches, total, pageSize } = await getAuditionBatchesPaged(page, 7, true);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (page > totalPages) {
    redirect(`/auditions/result?page=${totalPages}`);
  }

  return (
    <div className="stack">
      <section className="card stack">
        <h1>審査結果一覧</h1>
        <p className="meta">第何回ごとの結果を確認できます。</p>
      </section>

      <section className="card stack">
        {!batches.length ? <p className="meta">結果データがありません。</p> : null}
        {batches.map((batch, idx) => {
          const round = total - (page - 1) * pageSize - idx;
          const period = `${new Date(batch.apply_open_at).toLocaleDateString("ja-JP")} - ${new Date(batch.apply_close_at).toLocaleDateString("ja-JP")}`;
          return (
            <div key={batch.id} className="split card">
              <div className="stack">
                <strong>第{round}回</strong>
                <span className="meta">期間: {period}</span>
                <span className="meta">発表: {batch.published_at ? new Date(batch.published_at).toLocaleString("ja-JP") : "未発表"}</span>
              </div>
              <Link href={`/auditions/result/${batch.id}`} className="btn">
                詳細を見る
              </Link>
            </div>
          );
        })}
      </section>

      <section className="split">
        {page > 1 ? (
          <Link href={`/auditions/result?page=${page - 1}`} className="btn">
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
          <Link href={`/auditions/result?page=${page + 1}`} className="btn">
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
