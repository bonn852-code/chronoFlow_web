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
  const [iconUploading, setIconUploading] = useState(false);

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
      const metadataName = String(session.user.user_metadata?.display_name || "").trim();
      if (metadataName) setDisplayName(metadataName);
      setLoading(false);

      void (async () => {
        const statusRes = await fetch("/api/me/status", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          credentials: "same-origin"
        });
        if (!statusRes.ok) return;
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
      })();
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

  async function uploadIcon(file: File) {
    setIconUploading(true);
    setError(null);
    setMessage(null);
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setError("再ログインしてください。");
      setIconUploading(false);
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/profile/icon", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
      credentials: "same-origin",
      body: formData
    });
    const data = (await res.json()) as { iconUrl?: string; error?: string };
    if (!res.ok) {
      setError(data.error || "アイコンのアップロードに失敗しました。");
      setIconUploading(false);
      return;
    }
    setIconUrl(data.iconUrl || "");
    setMessage("アイコンを更新しました。公開表示にも反映されます。");
    setIconUploading(false);
  }

  async function clearIcon() {
    setIconUrl("");
    await saveProfile();
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
              アイコン画像（任意）
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadIcon(file);
                }}
              />
            </label>
            <p className="meta">PNG / JPG / WebP、2MBまで。スマホ・PCどちらでも選択できます。</p>
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
            <button className="btn" type="button" onClick={clearIcon} disabled={savingProfile || iconUploading}>
              アイコンを削除
            </button>
            {iconUploading ? <p className="meta">アイコンをアップロード中です...</p> : null}
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
