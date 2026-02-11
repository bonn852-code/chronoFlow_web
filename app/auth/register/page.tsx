"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { PASSWORD_MIN_LENGTH, validatePasswordStrength } from "@/lib/password-policy";

export default function RegisterPage() {
  const supabase = createSupabaseBrowserClient();
  const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "bonnedits852@gmail.com").toLowerCase();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [slowNotice, setSlowNotice] = useState(false);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);

  function syncAdminSession(token?: string) {
    if (!token) return;
    void fetch("/api/admin/session/sync", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      keepalive: true
    });
  }

  function beginSubmit() {
    inFlightRef.current = true;
    setLoading(true);
    setError(null);
    setMessage(null);
    setSlowNotice(false);
    slowTimer.current = setTimeout(() => setSlowNotice(true), 1200);
  }

  function endSubmit() {
    if (slowTimer.current) clearTimeout(slowTimer.current);
    inFlightRef.current = false;
    setLoading(false);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlightRef.current) return;
    beginSubmit();
    const formData = new FormData(event.currentTarget);

    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const passwordConfirm = String(formData.get("passwordConfirm") || "");

    if (password !== passwordConfirm) {
      setError("確認用パスワードが一致しません。");
      endSubmit();
      return;
    }

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      setError(passwordError);
      endSubmit();
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/login`
      }
    });
    if (signUpError) {
      setError("新規登録に失敗しました。入力内容を確認してください。");
      endSubmit();
      return;
    }

    if (data.user && !data.session) {
      setConfirmEmail(email);
      setMessage("確認メールを送信しました。メール内のURLを開いて登録を完了してください。");
      endSubmit();
      return;
    }

    const accessToken = data.session?.access_token;
    if (email.toLowerCase() === adminEmail && accessToken) {
      syncAdminSession(accessToken);
    }

    router.replace("/account");
  }

  async function resendConfirmation() {
    if (!confirmEmail) return;
    setResending(true);
    setError(null);
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: confirmEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/login`
      }
    });
    if (resendError) {
      setError("確認メールの再送に失敗しました。少し時間をおいて再試行してください。");
    } else {
      setMessage("確認メールを再送しました。");
    }
    setResending(false);
  }

  return (
    <section className="card stack" style={{ maxWidth: 520, margin: "30px auto" }}>
      <h1>新規登録</h1>
      <form onSubmit={onSubmit}>
        <fieldset disabled={loading} style={{ margin: 0, padding: 0, border: 0, display: "grid", gap: 14 }}>
          <label>
            メールアドレス
            <input name="email" type="email" required />
          </label>
          <label>
            パスワード
            <input
              name="password"
              type="password"
              minLength={PASSWORD_MIN_LENGTH}
              pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).+"
              title={`英大文字・英小文字・数字をそれぞれ1文字以上含み、${PASSWORD_MIN_LENGTH}文字以上にしてください。`}
              autoComplete="new-password"
              required
            />
          </label>
          <label>
            パスワード（確認）
            <input
              name="passwordConfirm"
              type="password"
              minLength={PASSWORD_MIN_LENGTH}
              autoComplete="new-password"
              required
            />
          </label>
          <p className="meta">
            パスワード要件: 英大文字・英小文字・数字をそれぞれ1文字以上含み、{PASSWORD_MIN_LENGTH}文字以上
          </p>
          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? "登録処理中..." : "新規登録"}
          </button>
        </fieldset>
      </form>
      {error ? <p className="meta">{error}</p> : null}
      {message ? <p className="meta">{message}</p> : null}
      {loading && !confirmEmail ? <p className="meta">登録処理を実行中です。ボタンは1回だけ押せば大丈夫です。</p> : null}
      {loading && slowNotice ? (
        <p className="meta">送信に数秒かかる場合があります。画面を閉じずにこのままお待ちください。</p>
      ) : null}
      {confirmEmail ? (
        <section className="alert-strong stack">
          <h2>メール確認が必要です</h2>
          <p>
            <strong>{confirmEmail}</strong> に確認メールを送信しました。
          </p>
          <p>迷惑メールフォルダにも入っていないか必ず確認してください。</p>
          <p>メール内URLがリンク化されていない場合は、URL全文をコピーしてブラウザへ貼り付けてください。</p>
          <div className="split">
            <button className="btn" type="button" onClick={resendConfirmation} disabled={resending}>
              {resending ? "再送中..." : "確認メールを再送"}
            </button>
            <Link href="/auth/login" className="btn primary">
              ログインへ
            </Link>
          </div>
        </section>
      ) : null}
      <p className="meta">
        すでにアカウントをお持ちの場合は <Link href="/auth/login">ログイン</Link>
      </p>
    </section>
  );
}
