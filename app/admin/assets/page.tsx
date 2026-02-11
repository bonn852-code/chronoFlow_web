"use client";

import { useEffect, useState } from "react";
import { AdminNav } from "@/components/admin-nav";

type Asset = { id: string; name: string; storage_path: string; created_at: string };

export default function AdminAssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/assets", { cache: "no-store" });
    const data = (await res.json()) as { assets?: Asset[]; error?: string };
    if (!res.ok) {
      setMessage(data.error || "取得失敗");
      return;
    }
    setAssets(data.assets || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function upload(formData: FormData) {
    const res = await fetch("/api/admin/assets", { method: "POST", body: formData });
    if (!res.ok) setMessage("アップロードに失敗しました");
    await load();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/admin/assets/${id}`, { method: "DELETE" });
    if (!res.ok) setMessage("削除に失敗しました");
    await load();
  }

  return (
    <div className="stack">
      <section className="card stack">
        <h1>Assets Management</h1>
        <AdminNav />
        <form action={upload}>
          <label>
            表示名
            <input name="name" required />
          </label>
          <label>
            ファイル
            <input name="file" type="file" required />
          </label>
          <button className="btn primary" type="submit">
            アップロード
          </button>
        </form>
        {message ? <p className="meta">{message}</p> : null}
      </section>

      <section className="card stack">
        <h2>登録済み素材</h2>
        {!assets.length ? <p className="meta">未登録</p> : null}
        {assets.map((asset) => (
          <div key={asset.id} className="split">
            <div>
              <strong>{asset.name}</strong>
              <p className="meta">{asset.storage_path}</p>
            </div>
            <button className="btn danger" onClick={() => remove(asset.id)}>
              削除
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
