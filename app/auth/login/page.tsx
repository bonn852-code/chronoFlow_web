"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const supabase = createSupabaseBrowserClient();
  const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "bonnedits852@gmail.com").trim().toLowerCase();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function syncAdminSession(token?: string) {
    if (!token) return;
    await fetch("/api/admin/session/sync", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "same-origin",
      keepalive: true
    });
  }

  async function onSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      const msg = signInError.message || "";
      if (/email.*not.*confirmed/i.test(msg)) {
        setError("メール確認が完了していません。確認メール（迷惑メールフォルダ含む）を確認してください。");
      } else {
        setError("ログインに失敗しました。メールアドレスかパスワードを確認してください。");
      }
      setLoading(false);
      return;
    }

    const accessToken = data.session?.access_token;
    if (email.toLowerCase() === adminEmail && accessToken) {
      try {
        await syncAdminSession(accessToken);
      } catch {
        setError("管理者セッションの同期に失敗しました。もう一度ログインしてください。");
        setLoading(false);
        return;
      }
    }

    router.replace("/account");
  }

  return (
    <section className="card stack" style={{ maxWidth: 480, margin: "30px auto" }}>
      <h1>ログイン</h1>
      <form action={onSubmit}>
        <label>
          メールアドレス
          <input name="email" type="email" required />
        </label>
        <label>
          パスワード
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? "ログイン中..." : "ログイン"}
        </button>
      </form>
      {error ? <p className="meta">{error}</p> : null}
      <p className="meta">
        アカウントをお持ちでない場合は <Link href="/auth/register">新規登録</Link>
      </p>
    </section>
  );
}
