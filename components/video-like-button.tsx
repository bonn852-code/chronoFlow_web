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

export function VideoLikeButton({ memberLinkId, initialCount = 0 }: { memberLinkId: string; initialCount?: number }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [count, setCount] = useState(initialCount);

  async function onLike() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberLinkId, deviceId: getDeviceId() })
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(data.error || "いいねに失敗しました");
        return;
      }
      setCount((c) => c + 1);
      setMessage("いいねしました");
    } catch {
      setMessage("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="split">
      <button type="button" className="btn" onClick={onLike} disabled={loading}>
        {loading ? "送信中..." : "いいね"}
      </button>
      <span className="badge">{count}</span>
      {message ? <span className="meta">{message}</span> : null}
    </div>
  );
}
