"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export function AccountFabLink() {
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

  if (loggedIn) {
    return (
      <Link href="/account" className="account-fab" aria-label="アカウント">
        A
      </Link>
    );
  }

  return (
    <Link href="/auth/login" className="account-fab" aria-label="ログイン">
      ログイン
    </Link>
  );
}
