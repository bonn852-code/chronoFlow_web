"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Asset = {
  id: string;
  name: string;
  external_url: string;
  description: string | null;
  created_at: string;
};

export default function AssetsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      router.replace("/auth/login?next=/assets");
      return;
    }

    const res = await fetch("/api/assets", {
      method: "GET",
      headers: { Authorization: `Bearer ${session.access_token}` },
      credentials: "same-origin",
      cache: "no-store"
    });

    const data = (await res.json()) as { assets?: Asset[]; error?: string };
    if (!res.ok) {
      setError(data.error || "素材一覧の取得に失敗しました");
      setLoading(false);
      return;
    }

    setAssets(data.assets || []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="stack">
      <section className="hero stack">
        <h1>Assets</h1>
        <p>メンバー向け配布素材ページです。必要なリンクから外部ページで取得してください。</p>
      </section>

      <section className="card stack">
        <div className="split">
          <h2 style={{ margin: 0 }}>配布リンク一覧</h2>
          <button className="btn" type="button" onClick={() => void load()}>
            更新
          </button>
        </div>

        {loading ? <p className="meta">読み込み中...</p> : null}
        {error ? <p className="meta">{error}</p> : null}
        {!loading && !error && !assets.length ? <p className="meta">現在配布中の素材はありません。</p> : null}

        <div className="grid grid-2">
          {assets.map((asset) => (
            <article key={asset.id} className="card stack" style={{ background: "rgba(255, 255, 255, 0.95)" }}>
              <div className="split" style={{ alignItems: "flex-start" }}>
                <div className="stack" style={{ gap: 4 }}>
                  <strong>{asset.name}</strong>
                  <p className="meta">公開日: {new Date(asset.created_at).toLocaleDateString("ja-JP")}</p>
                </div>
                <a className="btn primary" href={asset.external_url} target="_blank" rel="noreferrer noopener">
                  開く
                </a>
              </div>
              {asset.description ? <p className="meta" style={{ margin: 0 }}>{asset.description}</p> : null}
              <p className="meta" style={{ margin: 0, overflowWrap: "anywhere" }}>
                {asset.external_url}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
