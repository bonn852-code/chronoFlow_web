"use client";

import { useEffect, useState } from "react";
import { AdminNav } from "@/components/admin-nav";

type SecurityEvent = {
  id: string;
  event_type: string;
  severity: "info" | "warn" | "error";
  actor_user_id: string | null;
  target: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

export default function AdminSecurityPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [total, setTotal] = useState(0);

  async function load(targetPage = page) {
    const res = await fetch(`/api/admin/security-events?page=${targetPage}&pageSize=${pageSize}`, { cache: "no-store" });
    const data = (await res.json()) as {
      events?: SecurityEvent[];
      total?: number;
      page?: number;
      pageSize?: number;
      error?: string;
    };
    if (!res.ok) {
      setMessage(data.error || "ログ取得に失敗しました");
      return;
    }
    const nextEvents = data.events || [];
    const nextTotal = data.total || 0;
    const nextPage = data.page || targetPage;
    const nextPageSize = data.pageSize || pageSize;
    setEvents(nextEvents);
    setTotal(nextTotal);
    setPage(nextPage);
    setPageSize(nextPageSize);
    const totalPages = Math.max(1, Math.ceil(nextTotal / nextPageSize));
    if (nextPage > totalPages) {
      setPage(totalPages);
    }
  }

  useEffect(() => {
    void load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="stack">
      <section className="card stack">
        <h1>運用ログ監視・定期監査</h1>
        <AdminNav />
        <article className="alert-strong stack">
          <h2>定期監査チェック（毎週）</h2>
          <p className="meta">1. 停止/削除したアカウントの妥当性を確認</p>
          <p className="meta">2. お問い合わせ未対応件数を0に近づける</p>
          <p className="meta">3. 不審な短時間連続アクセスを確認（rate-limitログ）</p>
          <p className="meta">4. Supabase Security Advisor の警告を確認</p>
          <p className="meta">5. Vercel のデプロイ失敗/異常ログを確認</p>
        </article>
        {message ? <p className="meta">{message}</p> : null}
      </section>

      <section className="card" style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>日時</th>
              <th>重要度</th>
              <th>イベント</th>
              <th>対象</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>{new Date(event.created_at).toLocaleString("ja-JP")}</td>
                <td>{event.severity}</td>
                <td>{event.event_type}</td>
                <td>{event.target || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="pager">
        <button className="btn" type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          前へ
        </button>
        <span className="meta">
          {page} / {totalPages}
        </span>
        <button className="btn" type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
          次へ
        </button>
      </section>
    </div>
  );
}
