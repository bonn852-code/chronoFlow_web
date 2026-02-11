"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Step = "idle" | "confirm1" | "confirm2";

export default function AccountPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState<Step>("idle");
  const [confirmWord, setConfirmWord] = useState("");
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function init() {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user?.email) {
        router.push("/auth/login");
        return;
      }
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        const statusRes = await fetch("/api/me/status", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          credentials: "same-origin"
        });
        if (statusRes.ok) {
          const statusData = (await statusRes.json()) as { suspended?: boolean };
          if (statusData.suspended) {
            await supabase.auth.signOut();
            router.replace("/auth/login?blocked=1");
            return;
          }
        }
      }
      setEmail(user.email);
      setLoading(false);
    }
    void init();
  }, [router, supabase.auth]);

  async function logout() {
    setLogoutLoading(true);
    await supabase.auth.signOut();
    router.replace("/");
  }

  async function deleteAccount(formData: FormData) {
    if (deleting) return;
    setError(null);
    setMessage(null);

    if (deleteStep === "idle") {
      setDeleteStep("confirm1");
      return;
    }
    if (deleteStep === "confirm1") {
      setDeleteStep("confirm2");
      return;
    }

    if (confirmWord !== "DELETE") {
      setError("確認ワードに DELETE を入力してください。");
      return;
    }

    const password = String(formData.get("password") || "");
    if (!password) {
      setError("パスワードを入力してください。");
      return;
    }

    setDeleting(true);
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setError("再ログインしてください。");
      setDeleting(false);
      return;
    }

    const response = await fetch("/api/account/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ password })
    });

    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error || "アカウント削除に失敗しました。");
      setDeleting(false);
      return;
    }

    await supabase.auth.signOut();
    setMessage("アカウントを削除しました。");
    router.replace("/");
  }

  if (loading) {
    return <section className="card">読み込み中...</section>;
  }

  return (
    <div className="stack account-shell">
      <section className="hero stack">
        <h1>アカウント設定</h1>
        <p className="meta">ログイン中アカウント: {email}</p>
        <p className="meta">プロフィールや退会操作をここで管理できます。</p>
      </section>

      <section className="card stack">
        <h2>基本操作</h2>
        <div className="split">
          <Link className="btn" href="/">
            TOPへ
          </Link>
        </div>
      </section>

      <section className="card stack">
        <h2>ログアウト</h2>
        <p className="meta">この端末のログインを解除します。</p>
        <button className="btn" type="button" onClick={logout} disabled={logoutLoading}>
          {logoutLoading ? "ログアウト中..." : "ログアウト"}
        </button>
      </section>

      <section className="card stack danger-zone">
        <h2>アカウント削除</h2>
        <p className="meta">この操作は元に戻せません。2段階確認とパスワード確認後に削除されます。</p>

        <form action={deleteAccount}>
          {deleteStep !== "idle" ? <p className="meta">確認1/2: 本当に削除する場合は次へ進んでください。</p> : null}
          {deleteStep === "confirm2" ? (
            <>
              <p className="meta">確認2/2: `DELETE` を入力し、現在のパスワードを入れて実行してください。</p>
              <label>
                確認ワード
                <input value={confirmWord} onChange={(e) => setConfirmWord(e.target.value)} placeholder="DELETE" required />
              </label>
              <label>
                現在のパスワード
                <input name="password" type="password" required />
              </label>
            </>
          ) : null}
          <button className="btn danger" type="submit" disabled={deleting}>
            {deleteStep === "idle" ? "削除手続きへ" : deleteStep === "confirm1" ? "最終確認へ" : "アカウントを削除"}
          </button>
        </form>

        {error ? <p className="meta">{error}</p> : null}
        {message ? <p className="meta">{message}</p> : null}
      </section>
    </div>
  );
}
