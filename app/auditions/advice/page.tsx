"use client";

import { useEffect, useState } from "react";

type AdviceResponse = {
  displayName: string;
  status: "pending" | "approved" | "rejected";
  publishedAt: string | null;
  adviceText: string | null;
};

export default function AuditionAdvicePage() {
  const adviceCodeStorageKey = "cf_latest_advice_code";
  const [result, setResult] = useState<AdviceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [codeInput, setCodeInput] = useState("");

  const toStatusLabel = (status: AdviceResponse["status"]) => {
    if (status === "approved") return "合格";
    if (status === "rejected") return "不合格";
    return "審査中";
  };

  async function lookup(applicationCodeInput: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    const applicationCode = applicationCodeInput.trim().toUpperCase();

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
      try {
        localStorage.setItem(adviceCodeStorageKey, applicationCode);
      } catch {
        // noop
      }
      const next = new URL(window.location.href);
      next.searchParams.set("code", applicationCode);
      window.history.replaceState(null, "", next.toString());
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(formData: FormData) {
    const applicationCode = String(formData.get("applicationCode") || "");
    await lookup(applicationCode);
  }

  useEffect(() => {
    const url = new URL(window.location.href);
    const codeFromQuery = (url.searchParams.get("code") || "").trim();
    let fallbackCode = "";
    try {
      fallbackCode = (localStorage.getItem(adviceCodeStorageKey) || "").trim();
    } catch {
      // noop
    }
    const code = codeFromQuery || fallbackCode;
    if (!code) return;
    setCodeInput(code);
    void lookup(code);
  }, []);

  return (
    <section className="card stack">
      <h1>アドバイス確認（本人用）</h1>
      <form action={onSubmit} className="split">
        <input
          name="applicationCode"
          required
          placeholder="申請コード"
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value)}
        />
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
            ステータス: <strong>{toStatusLabel(result.status)}</strong>
          </p>
          <p className="meta">発表日時: {result.publishedAt ? new Date(result.publishedAt).toLocaleString("ja-JP") : "未発表"}</p>
          {result.adviceText ? <p>{result.adviceText}</p> : <p className="meta">表示できるアドバイスはありません。</p>}
        </article>
      ) : null}
    </section>
  );
}
