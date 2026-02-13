"use client";

import { useEffect, useState } from "react";
import { AdminNav } from "@/components/admin-nav";

type Announcement = {
  id: string;
  title: string;
  body: string;
  scope: "public" | "members";
  created_at: string;
};

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function load(targetPage = page) {
    const res = await fetch(`/api/admin/announcements?page=${targetPage}&pageSize=${pageSize}`, { cache: "no-store" });
    const data = (await res.json()) as {
      announcements?: Announcement[];
      total?: number;
      page?: number;
      pageSize?: number;
      error?: string;
    };
    if (!res.ok) {
      setMessage(data.error || "取得失敗");
      return;
    }
    const nextItems = data.announcements || [];
    const nextTotal = data.total || 0;
    const nextPage = data.page || targetPage;
    const nextPageSize = data.pageSize || pageSize;
    setItems(nextItems);
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

  async function add(formData: FormData) {
    setSubmitting(true);
    setMessage("更新中...");
    const payload = {
      title: formData.get("title"),
      body: formData.get("body"),
      scope: formData.get("scope")
    };
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) setMessage("作成失敗");
      setPage(1);
      await load(1);
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    setPendingId(id);
    setMessage("更新中...");
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
      if (!res.ok) setMessage("削除失敗");
      await load(page);
    } finally {
      setPendingId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="stack">
      <section className="card stack">
        <h1>Announcements Management</h1>
        <AdminNav />
        <form action={add}>
          <label>
            タイトル
            <input name="title" required />
          </label>
          <label>
            本文
            <textarea name="body" required />
          </label>
          <label>
            公開範囲
            <select name="scope" defaultValue="public">
              <option value="public">public</option>
              <option value="members">members</option>
            </select>
          </label>
          <button className={`btn primary${submitting ? " is-loading" : ""}`} type="submit" disabled={submitting}>
            作成
          </button>
        </form>
      </section>

      <section className="card stack">
        {!items.length ? <p className="meta">未登録</p> : null}
        {items.map((item) => (
          <article className="card stack" key={item.id}>
            <div className="split">
              <h3>{item.title}</h3>
              <span className="badge">{item.scope}</span>
            </div>
            <p className="meta">{new Date(item.created_at).toLocaleDateString("ja-JP")}</p>
            <p>{item.body}</p>
            <button
              className={`btn danger${pendingId === item.id ? " is-loading" : ""}`}
              onClick={() => remove(item.id)}
              disabled={pendingId === item.id}
            >
              削除
            </button>
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
      {message ? <p className="meta">{message}</p> : null}
    </div>
  );
}
