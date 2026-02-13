import Link from "next/link";
import { AdminNav } from "@/components/admin-nav";
import { getCurrentBatch } from "@/lib/auditions";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const batch = await getCurrentBatch();
  const [{ count: pendingCount }, { count: inquiryCount }, { count: eventCount }, { count: memberCount }] = await Promise.all([
    supabaseAdmin.from("audition_applications").select("*", { count: "exact", head: true }).eq("batch_id", batch.id).eq("status", "pending"),
    supabaseAdmin.from("contact_inquiries").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("security_events").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("members").select("*", { count: "exact", head: true }).eq("is_active", true)
  ]);

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
          <p style={{ fontSize: "2rem", margin: 0 }}>{pendingCount || 0}</p>
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
        <article className="card stack">
          <h2>未対応お問い合わせ</h2>
          <p style={{ fontSize: "2rem", margin: 0 }}>{inquiryCount || 0}</p>
          <Link href="/admin/inquiries" className="btn">
            お問い合わせ管理へ
          </Link>
        </article>
        <article className="card stack">
          <h2>監査ログ件数</h2>
          <p style={{ fontSize: "2rem", margin: 0 }}>{eventCount || 0}</p>
          <Link href="/admin/security" className="btn">
            監査管理へ
          </Link>
        </article>
        <article className="card stack">
          <h2>公開メンバー数</h2>
          <p style={{ fontSize: "2rem", margin: 0 }}>{memberCount || 0}</p>
          <Link href="/admin/members" className="btn">
            メンバー管理へ
          </Link>
        </article>
      </section>
    </div>
  );
}
