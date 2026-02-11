"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function ContactPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/auth/login");
    });
  }, [router, supabase.auth]);

  async function onSubmit(formData: FormData) {
    setLoading(true);
    setMessage(null);
    setError(null);

    const subject = String(formData.get("subject") || "").trim();
    const messageText = String(formData.get("message") || "").trim();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setError("ログイン状態を確認できませんでした。再ログインしてください。");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ subject, message: messageText })
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error || "お問い合わせ送信に失敗しました");
      setLoading(false);
      return;
    }

    setMessage("お問い合わせを送信しました。運営が確認後に対応します。");
    setLoading(false);
  }

  return (
    <section className="card stack" style={{ maxWidth: 760, margin: "0 auto" }}>
      <h1>お問い合わせ</h1>
      <p className="meta">不具合報告・要望・ご相談はこちらから送信できます。</p>
      <form action={onSubmit} className="stack">
        <label>
          件名
          <input name="subject" required maxLength={120} placeholder="例: ログインできない件" />
        </label>
        <label>
          本文
          <textarea name="message" required maxLength={4000} placeholder="状況を詳しく入力してください" />
        </label>
        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? "送信中..." : "送信する"}
        </button>
      </form>
      {message ? <p className="meta">{message}</p> : null}
      {error ? <p className="meta">{error}</p> : null}
    </section>
  );
}

