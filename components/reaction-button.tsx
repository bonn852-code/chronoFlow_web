"use client";

import { useState } from "react";

function getDeviceId() {
  if (typeof window === "undefined") return "";
  const key = "cf_device_id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const value = crypto.randomUUID();
  window.localStorage.setItem(key, value);
  return value;
}

export function ReactionButton({ memberId }: { memberId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onReact() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, deviceId: getDeviceId() })
      });
      const data = (await response.json()) as { error?: string; ok?: boolean };
      if (!response.ok) {
        setMessage(data.error || "リアクションに失敗しました");
        return;
      }
      setMessage("リアクションを追加しました");
    } catch {
      setMessage("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack">
      <button type="button" className="btn primary" onClick={onReact} disabled={loading}>
        {loading ? "送信中..." : "🔥 +1 リアクション"}
      </button>
      {message ? <p className="meta">{message}</p> : null}
    </div>
  );
}
