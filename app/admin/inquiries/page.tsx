"use client";

import { useEffect, useState } from "react";
import { AdminNav } from "@/components/admin-nav";

type Inquiry = {
  id: string;
  user_id: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
};

export default function AdminInquiriesPage() {
  const [items, setItems] = useState<Inquiry[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(7);
  const [total, setTotal] = useState(0);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function load(targetPage = page) {
    const res = await fetch(`/api/admin/inquiries?page=${targetPage}&pageSize=${pageSize}`, { cache: "no-store" });
    const data = (await res.json()) as { inquiries?: Inquiry[]; total?: number; page?: number; pageSize?: number; error?: string };
    if (!res.ok) {
      setMessage(data.error || "お問い合わせ一覧の取得に失敗しました");
      return;
    }
    setItems(data.inquiries || []);
    setTotal(data.total || 0);
    setPage(data.page || targetPage);
    setPageSize(data.pageSize || pageSize);
  }

  useEffect(() => {
    void load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function resolveAndDelete(id: string) {
    if (!window.confirm("このお問い合わせを対応済みとして削除しますか？")) return;
    setPendingId(id);
    setMessage("更新中...");
    try {
      const res = await fetch(`/api/admin/inquiries/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(data.error || "削除に失敗しました");
        return;
      }
      setMessage("対応済みとして削除しました");
      await load(page);
    } finally {
      setPendingId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="stack">
      <section className="card stack">
        <h1>お問い合わせ管理</h1>
        <AdminNav />
        <p className="meta">対応完了したものは削除して一覧を整理してください。</p>
        {message ? <p className="meta">{message}</p> : null}
      </section>

      <section className="card stack">
        {!items.length ? <p className="meta">未対応のお問い合わせはありません。</p> : null}
        {items.map((item) => (
          <article key={item.id} className="card stack">
            <div className="split admin-actions">
              <strong>{item.subject}</strong>
              <button
                className={`btn danger${pendingId === item.id ? " is-loading" : ""}`}
                type="button"
                onClick={() => resolveAndDelete(item.id)}
                disabled={pendingId === item.id}
              >
                対応済みで削除
              </button>
            </div>
            <p className="meta">
              {item.email} / {new Date(item.created_at).toLocaleString("ja-JP")}
            </p>
            <p style={{ whiteSpace: "pre-wrap" }}>{item.message}</p>
          </article>
        ))}
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
