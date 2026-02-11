import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type ResultItem = {
  id: string;
  display_name: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
};

export default async function BatchResultDetailPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;

  const { data: batch, error: batchErr } = await supabaseAdmin
    .from("audition_batches")
    .select("id,title,apply_open_at,apply_close_at,published_at,created_at")
    .eq("id", batchId)
    .maybeSingle();

  if (batchErr) {
    return <section className="card">読み込みに失敗しました。</section>;
  }
  if (!batch) notFound();

  const { count, error: countErr } = await supabaseAdmin.from("audition_batches").select("*", { count: "exact", head: true });
  if (countErr) {
    return <section className="card">読み込みに失敗しました。</section>;
  }

  const { data: ordered, error: orderErr } = await supabaseAdmin
    .from("audition_batches")
    .select("id")
    .order("created_at", { ascending: false });

  if (orderErr) {
    return <section className="card">読み込みに失敗しました。</section>;
  }

  const index = (ordered || []).findIndex((x) => x.id === batch.id);
  const round = index >= 0 ? (count || 0) - index : "-";

  const { data, error } = await supabaseAdmin
    .from("audition_applications")
    .select("id,display_name,status,created_at,reviewed_at")
    .eq("batch_id", batch.id)
    .order("created_at", { ascending: true });

  if (error) {
    return <section className="card">結果一覧の取得に失敗しました。</section>;
  }

  return (
    <div className="stack">
      <section className="card stack">
        <h1>第{round}回 審査結果</h1>
        <p className="meta">期間: {new Date(batch.apply_open_at).toLocaleDateString("ja-JP")} - {new Date(batch.apply_close_at).toLocaleDateString("ja-JP")}</p>
        <p className="meta">発表日時: {batch.published_at ? new Date(batch.published_at).toLocaleString("ja-JP") : "未発表"}</p>
        <Link href="/auditions/result" className="btn">一覧へ戻る</Link>
      </section>

      <section className="card" style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>表示名</th>
              <th>ステータス</th>
              <th>申請日時</th>
              <th>審査日時</th>
            </tr>
          </thead>
          <tbody>
            {(data as ResultItem[]).map((item) => (
              <tr key={item.id}>
                <td>{item.display_name}</td>
                <td>{item.status}</td>
                <td>{new Date(item.created_at).toLocaleString("ja-JP")}</td>
                <td>{item.reviewed_at ? new Date(item.reviewed_at).toLocaleString("ja-JP") : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
