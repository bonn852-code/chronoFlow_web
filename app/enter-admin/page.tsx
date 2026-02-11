"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Phase = "checking" | "syncing" | "error";

export default function EnterAdminPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@example.com").trim().toLowerCase();
  const [phase, setPhase] = useState<Phase>("checking");
  const [message, setMessage] = useState("管理者認証を確認しています...");

  async function syncAdminSession(token?: string) {
    if (!token) return false;
    for (let i = 0; i < 3; i += 1) {
      const response = await fetch("/api/admin/session/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "same-origin"
      });
      if (response.ok) return true;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return false;
  }

  const proceed = useCallback(async () => {
    setPhase("checking");
    setMessage("管理者認証を確認しています...");

    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session?.access_token || !session.user?.email) {
      router.replace("/auth/login?next=/enter-admin");
      return;
    }

    if (session.user.email.toLowerCase() !== adminEmail) {
      router.replace("/");
      return;
    }

    setPhase("syncing");
    setMessage("管理者セッションを同期しています...");

    let ok = await syncAdminSession(session.access_token);
    if (!ok) {
      const refreshed = await supabase.auth.refreshSession();
      ok = await syncAdminSession(refreshed.data.session?.access_token);
    }

    if (!ok) {
      setPhase("error");
      setMessage("管理者セッションの同期に失敗しました。再試行してください。");
      return;
    }

    window.location.replace("/admin");
  }, [adminEmail, router, supabase.auth]);

  useEffect(() => {
    void proceed();
  }, [proceed]);

  return (
    <section className="card stack" style={{ maxWidth: 560, margin: "30px auto" }}>
      <h1>管理ページへ移動</h1>
      <p className="meta">{message}</p>
      {phase === "error" ? (
        <button className="btn primary" type="button" onClick={() => void proceed()}>
          再試行
        </button>
      ) : null}
    </section>
  );
}
