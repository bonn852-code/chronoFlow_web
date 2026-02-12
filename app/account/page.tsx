"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { MemberAvatar } from "@/components/member-avatar";

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
  const [savingProfile, setSavingProfile] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [iconFocusX, setIconFocusX] = useState(50);
  const [iconFocusY, setIconFocusY] = useState(50);
  const [isMember, setIsMember] = useState(false);
  const [suspended, setSuspended] = useState(false);

  useEffect(() => {
    async function init() {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        router.push("/auth/login");
        return;
      }
      setEmail(session.user.email);

      const [statusRes, profileRes] = await Promise.all([
        fetch("/api/me/status", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          credentials: "same-origin"
        }),
        fetch("/api/profile", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          credentials: "same-origin"
        })
      ]);

      if (statusRes.ok) {
        const statusData = (await statusRes.json()) as {
          suspended?: boolean;
          isMember?: boolean;
          profile?: { displayName?: string; iconUrl?: string | null; iconFocusX?: number; iconFocusY?: number; bio?: string | null };
        };
        if (statusData.suspended) {
          await supabase.auth.signOut();
          router.replace("/auth/login?blocked=1");
          return;
        }
        setIsMember(Boolean(statusData.isMember));
        setSuspended(Boolean(statusData.suspended));
        if (statusData.profile) {
          setDisplayName(statusData.profile.displayName || "");
          setIconUrl(statusData.profile.iconUrl || "");
          setIconFocusX(typeof statusData.profile.iconFocusX === "number" ? statusData.profile.iconFocusX : 50);
          setIconFocusY(typeof statusData.profile.iconFocusY === "number" ? statusData.profile.iconFocusY : 50);
          setBio(statusData.profile.bio || "");
        }
      }

      if (profileRes.ok) {
        const profileData = (await profileRes.json()) as {
          profile?: { display_name?: string; icon_url?: string | null; icon_focus_x?: number; icon_focus_y?: number; bio?: string | null };
        };
        if (profileData.profile) {
          setDisplayName(profileData.profile.display_name || "");
          setIconUrl(profileData.profile.icon_url || "");
          setIconFocusX(typeof profileData.profile.icon_focus_x === "number" ? profileData.profile.icon_focus_x : 50);
          setIconFocusY(typeof profileData.profile.icon_focus_y === "number" ? profileData.profile.icon_focus_y : 50);
          setBio(profileData.profile.bio || "");
        }
      }

      setLoading(false);
    }
    void init();
  }, [router, supabase.auth]);

  async function saveProfile() {
    setSavingProfile(true);
    setError(null);
    setMessage(null);
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setError("再ログインしてください。");
      setSavingProfile(false);
      return;
    }
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`
      },
      credentials: "same-origin",
      body: JSON.stringify({
        displayName,
        bio,
        iconUrl: iconUrl.trim() || null,
        iconFocusX,
        iconFocusY
      })
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error || "プロフィールの更新に失敗しました。");
      setSavingProfile(false);
      return;
    }
    setMessage("プロフィールを更新しました。公開表示にも反映されます。");
    setSavingProfile(false);
  }

  async function logout() {
    setLogoutLoading(true);
    await Promise.all([
      supabase.auth.signOut(),
      fetch("/api/admin/session/clear", { method: "POST", credentials: "same-origin" }).catch(() => undefined)
    ]);
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

    await Promise.all([
      supabase.auth.signOut(),
      fetch("/api/admin/session/clear", { method: "POST", credentials: "same-origin" }).catch(() => undefined)
    ]);
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
        <p className="meta">状態: {suspended ? "停止中" : isMember ? "メンバー" : "一般ユーザー"}</p>
      </section>

      <section className="card stack">
        <h2>プロフィール</h2>
        <p className="meta">表示名とアイコンは、公開されるメンバー表示に反映されます。</p>
        <div className="split admin-actions">
          <MemberAvatar name={displayName || "U"} iconUrl={iconUrl || null} focusX={iconFocusX} focusY={iconFocusY} size={72} />
          <div className="stack" style={{ flex: 1 }}>
            <label>
              表示名
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={120} />
            </label>
            <label>
              自己紹介（任意）
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} />
            </label>
            <label>
              アイコン画像URL（任意）
              <input value={iconUrl} onChange={(e) => setIconUrl(e.target.value)} placeholder="https://..." />
            </label>
            <label>
              アイコン位置 X: {iconFocusX}%
              <input type="range" min={0} max={100} value={iconFocusX} onChange={(e) => setIconFocusX(Number(e.target.value))} />
            </label>
            <label>
              アイコン位置 Y: {iconFocusY}%
              <input type="range" min={0} max={100} value={iconFocusY} onChange={(e) => setIconFocusY(Number(e.target.value))} />
            </label>
            <button className="btn primary" type="button" onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? "保存中..." : "プロフィールを保存"}
            </button>
          </div>
        </div>
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
