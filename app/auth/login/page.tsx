"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const supabase = createSupabaseBrowserClient();
  const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "bonnedits852@gmail.com").trim().toLowerCase();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [slowNotice, setSlowNotice] = useState(false);
  const inFlightRef = useRef(false);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("blocked") === "1") {
      setError("このアカウントは現在停止中です。運営へお問い合わせください。");
    }
  }, []);

  async function syncAdminSession(token?: string) {
    if (!token) return;
    const response = await fetch("/api/admin/session/sync", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "same-origin",
      keepalive: true
    });
    if (!response.ok) throw new Error("admin session sync failed");
  }

  function nextPath() {
    if (typeof window === "undefined") return "/";
    const raw = new URLSearchParams(window.location.search).get("next") || "/";
    if (!raw.startsWith("/")) return "/";
    return raw;
  }

  function beginSubmit() {
    inFlightRef.current = true;
    setLoading(true);
    setError(null);
    setWarning(null);
    setSlowNotice(false);
    slowTimer.current = setTimeout(() => setSlowNotice(true), 1200);
  }

  function endSubmit() {
    if (slowTimer.current) clearTimeout(slowTimer.current);
    inFlightRef.current = false;
    setLoading(false);
  }

  async function onSubmit(formData: FormData) {
    if (inFlightRef.current) return;
    beginSubmit();

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
      endSubmit();
      return;
    }

    const statusRes = await fetch("/api/me/status", {
      headers: { Authorization: `Bearer ${data.session?.access_token || ""}` },
      credentials: "same-origin"
    });
    if (statusRes.ok) {
      const statusData = (await statusRes.json()) as { suspended?: boolean };
      if (statusData.suspended) {
        await supabase.auth.signOut();
        setError("このアカウントは現在停止中です。運営へお問い合わせください。");
        endSubmit();
        return;
      }
    }

    const accessToken = data.session?.access_token;
    if (email.toLowerCase() === adminEmail && accessToken) {
      let synced = false;
      for (let i = 0; i < 2; i += 1) {
        try {
          await syncAdminSession(accessToken);
          synced = true;
          break;
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      }
      if (!synced) {
        setWarning("管理者セッション同期が遅延しています。管理ページで再同期します。");
      }
    }

    endSubmit();
    router.replace(nextPath() as never);
  }

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted || !data.session) return;
      const email = data.session.user.email?.toLowerCase() || "";
      if (email === adminEmail) {
        await syncAdminSession(data.session.access_token).catch(() => undefined);
      }
      router.replace(nextPath() as never);
    });
    return () => {
      mounted = false;
    };
  }, [adminEmail, router, supabase.auth]);

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
      {warning ? <p className="meta">{warning}</p> : null}
      {loading && slowNotice ? <p className="meta">処理に数秒かかる場合があります。ボタンは1回だけ押してお待ちください。</p> : null}
      <p className="meta">
        アカウントをお持ちでない場合は <Link href="/auth/register">新規登録</Link>
      </p>
    </section>
  );
}
