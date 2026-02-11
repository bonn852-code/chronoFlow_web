"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function AuditionForm() {
  const supabase = createSupabaseBrowserClient();
  const [applicationCode, setApplicationCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [periodText, setPeriodText] = useState<string>("");

  useEffect(() => {
    async function loadPeriod() {
      const res = await fetch("/api/auditions/apply", { cache: "no-store" });
      const data = (await res.json()) as {
        batch?: { applyOpenAt: string; applyCloseAt: string };
        isOpen?: boolean;
      };
      if (res.ok && data.batch) {
        setIsOpen(Boolean(data.isOpen));
        setPeriodText(
          `${new Date(data.batch.applyOpenAt).toLocaleString("ja-JP")} 〜 ${new Date(data.batch.applyCloseAt).toLocaleString("ja-JP")}`
        );
      }
    }
    void loadPeriod();
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setIsLoggedIn(Boolean(data.session));
    });
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session));
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  async function onSubmit(formData: FormData) {
    if (!isOpen) {
      setMessage("現在は募集期間外のため申請できません。募集開始までお待ちください。");
      return;
    }

    if (!isLoggedIn) {
      setMessage("審査申請にはログインが必要です。先にログインしてください。");
      return;
    }

    setLoading(true);
    setMessage(null);
    setApplicationCode(null);

    const snsRaw = (formData.get("sns_urls") as string)
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

    const payload = {
      display_name: formData.get("display_name"),
      video_url: formData.get("video_url"),
      sns_urls: snsRaw,
      consent_public_profile: formData.get("consent_public_profile") === "on",
      consent_advice: formData.get("consent_advice") === "on"
    };

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      const response = await fetch("/api/auditions/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      const data = (await response.json()) as { applicationCode?: string | null; error?: string };

      if (!response.ok) {
        setMessage(data.error || "送信に失敗しました");
        return;
      }

      setApplicationCode(data.applicationCode || null);
      if (!data.applicationCode) {
        setMessage("申請を受け付けました。アドバイス希望をONにした方のみ申請コードが発行されます。");
      }
    } catch {
      setMessage("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card stack">
      <h1>審査申請</h1>
      {!isOpen ? (
        <div className="alert-banner">
          <strong>現在は募集期間外です。</strong> 次回の募集開始までお待ちください。
        </div>
      ) : null}
      <p className="notice">申請期間: {periodText || "読み込み中..."}</p>
      <form action={onSubmit}>
        <fieldset disabled={loading || !isOpen} style={{ margin: 0, padding: 0, border: 0, display: "grid", gap: 14 }}>
          <label>
            表示名
            <input name="display_name" required maxLength={120} />
          </label>
          <label>
            審査用動画URL
            <input name="video_url" required type="url" placeholder="https://..." />
          </label>
          <label>
            SNS URL（任意・1行に1つ）
            <textarea name="sns_urls" placeholder="https://tiktok.com/..." />
          </label>
          <label>
            <input type="checkbox" name="consent_public_profile" required />
            合格時に表示名/作品の掲載に同意する
          </label>
          <label>
            <input type="checkbox" name="consent_advice" />
            不合格時のアドバイスを希望する
          </label>
          <button className="btn primary" type="submit" disabled={loading || !isOpen || !isLoggedIn}>
            {loading ? "送信中..." : "申請する"}
          </button>
        </fieldset>
      </form>
      {!isLoggedIn ? (
        <p className="meta">審査申請にはログインが必要です。ログイン後に申請してください。</p>
      ) : null}

      {applicationCode ? (
        <div className="card">
          <p>申請コード</p>
          <p>
            <strong className="kbd">{applicationCode}</strong>
          </p>
          <p className="meta">不合格時アドバイスの確認に必要です（本人のみ）。</p>
        </div>
      ) : null}
      {message ? <p className="meta">{message}</p> : null}
    </div>
  );
}
