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

  async function load() {
    const res = await fetch("/api/admin/announcements", { cache: "no-store" });
    const data = (await res.json()) as { announcements?: Announcement[]; error?: string };
    if (!res.ok) {
      setMessage(data.error || "取得失敗");
      return;
    }
    setItems(data.announcements || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function add(formData: FormData) {
    const payload = {
      title: formData.get("title"),
      body: formData.get("body"),
      scope: formData.get("scope")
    };
    const res = await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) setMessage("作成失敗");
    await load();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
    if (!res.ok) setMessage("削除失敗");
    await load();
  }

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
          <button className="btn primary" type="submit">
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
            <button className="btn danger" onClick={() => remove(item.id)}>
              削除
            </button>
          </article>
        ))}
      </section>
      {message ? <p className="meta">{message}</p> : null}
    </div>
  );
}
