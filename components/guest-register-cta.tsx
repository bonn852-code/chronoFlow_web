"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export function GuestRegisterCta() {
  const supabase = createSupabaseBrowserClient();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setLoggedIn(Boolean(data.session));
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(Boolean(session));
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  if (loggedIn) return null;

  return (
    <div className="hero-cta">
      <p className="meta">活動参加を始めるなら</p>
      <div className="split">
        <Link href="/auth/register" className="btn primary">
          無料で新規登録
        </Link>
        <Link href="/auth/login" className="btn">
          ログイン
        </Link>
      </div>
    </div>
  );
}
