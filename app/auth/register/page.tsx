"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { PASSWORD_MIN_LENGTH, validatePasswordStrength } from "@/lib/password-policy";

export default function RegisterPage() {
  const supabase = createSupabaseBrowserClient();
  const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "bonnedits852@gmail.com").toLowerCase();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    setMessage(null);

    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const passwordConfirm = String(formData.get("passwordConfirm") || "");

    if (password !== passwordConfirm) {
      setError("確認用パスワードが一致しません。");
      setLoading(false);
      return;
    }

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      setError(passwordError);
      setLoading(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setError("新規登録に失敗しました。入力内容を確認してください。");
      setLoading(false);
      return;
    }

    if (data.user && !data.session) {
      setMessage("登録しました。確認メールを送信しました。メールを確認してログインしてください。");
      setLoading(false);
      return;
    }

    const accessToken = data.session?.access_token;
    if (email.toLowerCase() === adminEmail && accessToken) {
      await fetch("/api/admin/session/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` }
      });
    }

    router.push("/account");
    router.refresh();
    setLoading(false);
  }

  return (
    <section className="card stack" style={{ maxWidth: 520, margin: "30px auto" }}>
      <h1>新規登録</h1>
      <form action={onSubmit}>
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
          {loading ? "登録中..." : "新規登録"}
        </button>
      </form>
      {error ? <p className="meta">{error}</p> : null}
      {message ? <p className="meta">{message}</p> : null}
      <p className="meta">
        すでにアカウントをお持ちの場合は <Link href="/auth/login">ログイン</Link>
      </p>
    </section>
  );
}
