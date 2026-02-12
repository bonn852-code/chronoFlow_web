"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function AuditionForm() {
  const supabase = createSupabaseBrowserClient();
  const adviceCodeStoragePrefix = "cf_latest_advice_code";
  const [applicationCode, setApplicationCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState<boolean | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [viewerUserId, setViewerUserId] = useState<string | null>(null);
  const [periodText, setPeriodText] = useState<string>("");
  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [profileName, setProfileName] = useState<string>("");

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
      if (!mounted) return;
      setIsLoggedIn(Boolean(data.session));
      setViewerUserId(data.session?.user.id ?? null);
      const name = String(data.session?.user?.user_metadata?.display_name || "").trim();
      setProfileName(name);
      if (data.session?.user.id) {
        try {
          const saved = localStorage.getItem(`${adviceCodeStoragePrefix}:${data.session.user.id}`);
          setApplicationCode(saved || null);
        } catch {
          setApplicationCode(null);
        }
      } else {
        setApplicationCode(null);
      }
    });
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session));
      setViewerUserId(session?.user.id ?? null);
      const name = String(session?.user?.user_metadata?.display_name || "").trim();
      setProfileName(name);
      if (session?.user.id) {
        try {
          const saved = localStorage.getItem(`${adviceCodeStoragePrefix}:${session.user.id}`);
          setApplicationCode(saved || null);
        } catch {
          setApplicationCode(null);
        }
      } else {
        setApplicationCode(null);
      }
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  async function onSubmit(formData: FormData) {
    if (isOpen === false) {
      setMessage("現在は募集期間外のため申請できません。募集開始までお待ちください。");
      setSubmitStatus("error");
      return;
    }

    if (!isLoggedIn) {
      setMessage("審査申請にはログインが必要です。先にログインしてください。");
      setSubmitStatus("error");
      return;
    }

    setLoading(true);
    setMessage("申請送信を開始しました。数秒お待ちください。");
    setSubmitStatus("submitting");
    setApplicationCode(null);
    setWarnings([]);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const snsRaw = (formData.get("sns_urls") as string)
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

    const payload = {
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
      const data = (await response.json()) as { applicationCode?: string | null; error?: string; warnings?: string[] };

      if (!response.ok) {
        setMessage(data.error || "送信に失敗しました");
        setSubmitStatus("error");
        return;
      }

      setApplicationCode(data.applicationCode || null);
      setWarnings(Array.isArray(data.warnings) ? data.warnings : []);
      if (data.applicationCode) {
        try {
          const userId = session?.user?.id || viewerUserId;
          if (userId) {
            localStorage.setItem(`${adviceCodeStoragePrefix}:${userId}`, data.applicationCode);
          }
        } catch {
          // noop
        }
      } else {
        try {
          const userId = session?.user?.id || viewerUserId;
          if (userId) {
            localStorage.removeItem(`${adviceCodeStoragePrefix}:${userId}`);
          }
        } catch {
          // noop
        }
      }
      setMessage(
        data.applicationCode
          ? "申請を受け付けました。下の申請コードを保存してください。"
          : "申請を受け付けました。アドバイス希望をONにした方のみ申請コードが発行されます。"
      );
      setSubmitStatus("success");
    } catch {
      setMessage("通信エラーが発生しました");
      setSubmitStatus("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card stack">
      <h1>審査申請</h1>
      {!isLoggedIn ? (
        <div className="alert-banner alert-banner-login">
          <strong>審査申請にはログインが必要です。</strong> ログイン後に申請してください。
        </div>
      ) : null}
      {isOpen === false ? (
        <div className="alert-banner">
          <strong>現在は募集期間外です。</strong> 次回の募集開始までお待ちください。
        </div>
      ) : null}
      <p className="notice">申請期間: {periodText || "読み込み中..."}</p>
      <form action={onSubmit}>
        <fieldset disabled={loading || isOpen !== true} style={{ margin: 0, padding: 0, border: 0, display: "grid", gap: 14 }}>
          <label>
            審査用動画URL
            <input name="video_url" required type="url" placeholder="https://..." />
          </label>
          <label>
            SNS URL（任意・1行に1つ）
            <textarea name="sns_urls" placeholder="https://tiktok.com/..." />
          </label>
          <p className="meta">動画URL/SNS URLは YouTube・TikTok・Instagram のみ受け付けます。</p>
          <label>
            <input type="checkbox" name="consent_public_profile" required />
            合格時に表示名/作品の掲載に同意する
          </label>
          <label>
            <input type="checkbox" name="consent_advice" />
            不合格時のアドバイスを希望する
          </label>
          <button className="btn primary" type="submit" disabled={loading || isOpen !== true || !isLoggedIn}>
            {loading ? "送信中..." : "申請する"}
          </button>
          <p className="meta">
            公開表示名はプロフィールの設定を使用します: <strong>{profileName || "未設定（プロフィールで設定してください）"}</strong>
          </p>
        </fieldset>
      </form>

      {message ? (
        <div
          className={`submit-feedback ${
            submitStatus === "success"
              ? "submit-feedback-success"
              : submitStatus === "submitting"
                ? "submit-feedback-pending"
                : submitStatus === "error"
                  ? "submit-feedback-error"
                  : ""
          }`}
        >
          <strong>
            {submitStatus === "success"
              ? "申請送信が完了しました"
              : submitStatus === "submitting"
                ? "送信処理中です"
                : submitStatus === "error"
                  ? "送信できませんでした"
                  : "お知らせ"}
          </strong>
          <p>{message}</p>
        </div>
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
      {warnings.length ? (
        <div className="card stack">
          <strong>確認メモ（推奨）</strong>
          {warnings.map((warning, index) => (
            <p key={`${warning}-${index}`} className="meta">
              {warning}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
