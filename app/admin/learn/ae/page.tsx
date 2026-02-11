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

  async function load() {
    const res = await fetch("/api/admin/learn/ae", { cache: "no-store" });
    const data = (await res.json()) as { lessons?: Lesson[]; error?: string };
    if (!res.ok) {
      setMessage(data.error || "取得失敗");
      return;
    }
    setLessons(data.lessons || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function add(formData: FormData) {
    const payload = {
      title: formData.get("title"),
      youtubeUrl: formData.get("youtubeUrl"),
      sortOrder: Number(formData.get("sortOrder") || 0)
    };
    const res = await fetch("/api/admin/learn/ae", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) setMessage("追加失敗");
    await load();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/admin/learn/ae/${id}`, { method: "DELETE" });
    if (!res.ok) setMessage("削除失敗");
    await load();
  }

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
          <button className="btn primary" type="submit">
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
            <button className="btn danger" onClick={() => remove(lesson.id)}>
              削除
            </button>
          </div>
        ))}
        {!lessons.length ? <p className="meta">未登録</p> : null}
      </section>
      {message ? <p className="meta">{message}</p> : null}
    </div>
  );
}
