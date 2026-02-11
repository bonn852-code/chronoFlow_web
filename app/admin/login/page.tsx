"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const enabled = process.env.NEXT_PUBLIC_ENABLE_ADMIN_PASSWORD_LOGIN === "true";
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const accessKey = String(formData.get("accessKey") || "");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, accessKey })
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error || "ログイン失敗");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  if (!enabled) {
    return (
      <section className="card" style={{ maxWidth: 520, margin: "32px auto" }}>
        <h1>管理者ログイン</h1>
        <p className="meta">
          このログイン方式は本番運用のため無効化されています。管理者メールで通常ログインし、ヘッダーの「管理」から入ってください。
        </p>
      </section>
    );
  }

  return (
    <section className="card" style={{ maxWidth: 460, margin: "32px auto" }}>
      <h1>管理者ログイン</h1>
      <form action={onSubmit}>
        <label>
          管理者メールアドレス
          <input type="email" name="email" autoComplete="username" required />
        </label>
        <label>
          アクセスキー
          <input type="password" name="accessKey" autoComplete="off" required />
        </label>
        <label>
          パスワード
          <input type="password" name="password" autoComplete="current-password" required />
        </label>
        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? "認証中..." : "ログイン"}
        </button>
      </form>
      <p className="meta">管理者は `/admin/login?k=YOUR_ADMIN_LOGIN_KEY` からアクセスしてください。</p>
      {error ? <p className="meta">{error}</p> : null}
    </section>
  );
}
