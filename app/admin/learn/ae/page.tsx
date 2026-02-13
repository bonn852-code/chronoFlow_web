"use client";

import { useEffect, useState } from "react";
import { AdminNav } from "@/components/admin-nav";

type Lesson = {
  id: string;
  title: string;
  youtube_url: string;
  sort_order: number;
};

export default function AdminLearnAePage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function load(targetPage = page) {
    const res = await fetch(`/api/admin/learn/ae?page=${targetPage}&pageSize=${pageSize}`, { cache: "no-store" });
    const data = (await res.json()) as {
      lessons?: Lesson[];
      total?: number;
      page?: number;
      pageSize?: number;
      error?: string;
    };
    if (!res.ok) {
      setMessage(data.error || "取得失敗");
      return;
    }
    const nextLessons = data.lessons || [];
    const nextTotal = data.total || 0;
    const nextPage = data.page || targetPage;
    const nextPageSize = data.pageSize || pageSize;
    setLessons(nextLessons);
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
      youtubeUrl: formData.get("youtubeUrl"),
      sortOrder: Number(formData.get("sortOrder") || 0)
    };
    try {
      const res = await fetch("/api/admin/learn/ae", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) setMessage("追加失敗");
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
      const res = await fetch(`/api/admin/learn/ae/${id}`, { method: "DELETE" });
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
        <h1>AE Lessons Management</h1>
        <AdminNav />
        <form action={add} className="grid grid-2">
          <label>
            タイトル
            <input name="title" required />
          </label>
          <label>
            YouTube URL
            <input name="youtubeUrl" type="url" required />
          </label>
          <label>
            並び順
            <input name="sortOrder" type="number" defaultValue={0} />
          </label>
          <button className={`btn primary${submitting ? " is-loading" : ""}`} type="submit" disabled={submitting}>
            追加
          </button>
        </form>
      </section>

      <section className="card stack">
        {lessons.map((lesson) => (
          <div key={lesson.id} className="split">
            <div>
              <strong>{lesson.title}</strong>
              <p className="meta">order: {lesson.sort_order}</p>
            </div>
            <button
              className={`btn danger${pendingId === lesson.id ? " is-loading" : ""}`}
              onClick={() => remove(lesson.id)}
              disabled={pendingId === lesson.id}
            >
              削除
            </button>
          </div>
        ))}
        {!lessons.length ? <p className="meta">未登録</p> : null}
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
