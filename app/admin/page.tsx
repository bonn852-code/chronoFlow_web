import Link from "next/link";
import { AdminNav } from "@/components/admin-nav";
import { getCurrentBatch } from "@/lib/auditions";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const batch = await getCurrentBatch();
  const { count } = await supabaseAdmin
    .from("audition_applications")
    .select("*", { count: "exact", head: true })
    .eq("batch_id", batch.id)
    .eq("status", "pending");

  return (
    <div className="stack">
      <section className="card stack">
        <div className="split">
          <h1>Admin Dashboard</h1>
          <form action="/api/admin/logout" method="post">
            <button className="btn" type="submit">
              Logout
            </button>
          </form>
        </div>
        <AdminNav />
      </section>

      <section className="grid grid-2">
        <article className="card stack">
          <h2>未処理申請</h2>
          <p style={{ fontSize: "2rem", margin: 0 }}>{count || 0}</p>
        </article>
        <article className="card stack">
          <h2>現在バッチ</h2>
          <p>{batch.title}</p>
          <p className="meta">
            申請期間: {new Date(batch.apply_open_at).toLocaleString("ja-JP")} 〜{" "}
            {new Date(batch.apply_close_at).toLocaleString("ja-JP")}
          </p>
          <p className="meta">公開状態: {batch.published_at ? "公開済み" : "未公開"}</p>
          <Link href="/admin/auditions" className="btn primary">
            審査へ
          </Link>
        </article>
      </section>
    </div>
  );
}
