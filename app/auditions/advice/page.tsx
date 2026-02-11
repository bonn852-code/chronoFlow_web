"use client";

import { useState } from "react";

type AdviceResponse = {
  displayName: string;
  status: "pending" | "approved" | "rejected";
  publishedAt: string | null;
  adviceText: string | null;
};

export default function AuditionAdvicePage() {
  const [result, setResult] = useState<AdviceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    setResult(null);

    const applicationCode = String(formData.get("applicationCode") || "").trim().toUpperCase();

    try {
      const response = await fetch("/api/auditions/advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationCode })
      });

      const data = (await response.json()) as AdviceResponse & { error?: string };
      if (!response.ok) {
        setError(data.error || "照会に失敗しました");
        return;
      }

      setResult(data);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card stack">
      <h1>アドバイス確認（本人用）</h1>
      <form action={onSubmit} className="split">
        <input name="applicationCode" required placeholder="申請コード" />
        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? "照会中..." : "照会"}
        </button>
      </form>

      {error ? <p className="meta">{error}</p> : null}
      {result ? (
        <article className="card stack">
          <p>
            申請者: <strong>{result.displayName}</strong>
          </p>
          <p>
            ステータス: <strong>{result.status}</strong>
          </p>
          <p className="meta">発表日時: {result.publishedAt ? new Date(result.publishedAt).toLocaleString("ja-JP") : "未発表"}</p>
          {result.adviceText ? <p>{result.adviceText}</p> : <p className="meta">表示できるアドバイスはありません。</p>}
        </article>
      ) : null}
    </section>
  );
}
