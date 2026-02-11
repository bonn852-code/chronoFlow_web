"use client";

import { useEffect, useState } from "react";
import { AdminNav } from "@/components/admin-nav";

type Asset = { id: string; name: string; external_url: string; description: string | null; created_at: string };

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

  async function create(formData: FormData) {
    const payload = {
      name: String(formData.get("name") || "").trim(),
      externalUrl: String(formData.get("externalUrl") || "").trim(),
      description: String(formData.get("description") || "").trim()
    };
    const res = await fetch("/api/admin/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) setMessage("素材リンクの登録に失敗しました");
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
        <p className="meta">
          Supabase容量を使わないため、素材はアップロードせず外部リンクで共有します。メンバーはログイン後に `Assets` から閲覧できます。
        </p>
        <AdminNav />
        <form action={create}>
          <label>
            表示名
            <input name="name" required />
          </label>
          <label>
            外部リンクURL
            <input name="externalUrl" type="url" placeholder="https://..." required />
          </label>
          <label>
            説明（任意）
            <textarea name="description" maxLength={300} placeholder="ダウンロード手順、注意点など" />
          </label>
          <button className="btn primary" type="submit">
            リンクを登録
          </button>
        </form>
        {message ? <p className="meta">{message}</p> : null}
      </section>

      <section className="card stack">
        <h2>登録済み素材</h2>
        {!assets.length ? <p className="meta">未登録</p> : null}
        {assets.map((asset) => (
          <div key={asset.id} className="split admin-actions">
            <div className="stack" style={{ gap: 4 }}>
              <strong>{asset.name}</strong>
              <p className="meta" style={{ overflowWrap: "anywhere", margin: 0 }}>
                {asset.external_url}
              </p>
              {asset.description ? <p className="meta">{asset.description}</p> : null}
            </div>
            <div className="split">
              <a className="btn" href={asset.external_url} target="_blank" rel="noreferrer noopener">
                確認
              </a>
              <button className="btn danger" onClick={() => remove(asset.id)}>
                削除
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
