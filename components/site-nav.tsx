"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import Image from "next/image";

export function SiteNav({ mobile }: { mobile?: boolean } = {}) {
  const supabase = createSupabaseBrowserClient();
  const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "bonnedits852@gmail.com").toLowerCase();
  const [loggedIn, setLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  async function syncAdminSession(sessionToken?: string) {
    if (!sessionToken) {
      await fetch("/api/admin/session/clear", { method: "POST" });
      return;
    }
    await fetch("/api/admin/session/sync", {
      method: "POST",
      headers: { Authorization: `Bearer ${sessionToken}` }
    });
  }

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      if (!mounted) return;
      setLoggedIn(Boolean(session));
      const email = session?.user?.email?.toLowerCase() || "";
      const admin = email === adminEmail;
      setIsAdmin(admin);
      void syncAdminSession(admin ? session?.access_token : undefined);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(Boolean(session));
      const email = session?.user?.email?.toLowerCase() || "";
      const admin = email === adminEmail;
      setIsAdmin(admin);
      void syncAdminSession(admin ? session?.access_token : undefined);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [adminEmail, supabase.auth]);

  return (
    <nav className={`nav site-nav${mobile ? " mobile-bottom-nav" : ""}`}>
      <Link href="/members" className="nav-link" aria-label="メンバー">
        <span className="nav-icon" aria-hidden="true">
          <Image src="/icons/team.png" alt="" width={22} height={22} />
        </span>
        <span className="nav-text">メンバー</span>
      </Link>
      <Link href="/rankings" className="nav-link" aria-label="ランキング">
        <span className="nav-icon" aria-hidden="true">
          <Image src="/icons/crown.png" alt="" width={22} height={22} />
        </span>
        <span className="nav-text">ランキング</span>
      </Link>
      <Link href="/auditions" className="nav-link" aria-label="審査">
        <span className="nav-icon" aria-hidden="true">
          <Image src="/icons/audition.png" alt="" width={22} height={22} />
        </span>
        <span className="nav-text">審査</span>
      </Link>
      <Link href="/learn/ae" className="nav-link" aria-label="AE学習">
        <span className="nav-icon" aria-hidden="true">
          <Image src="/icons/learn.png" alt="" width={22} height={22} />
        </span>
        <span className="nav-text">AE学習</span>
      </Link>
      {!loggedIn ? (
        <>
          <Link href="/auth/login" className="nav-link" aria-label="ログイン">
            <span className="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M10 17v-2H4V9h6V7L15 12l-5 5z" />
                <path d="M20 4h-8v2h8v12h-8v2h8a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
              </svg>
            </span>
            <span className="nav-text">ログイン</span>
          </Link>
          <Link href="/auth/register" className="nav-link" aria-label="新規登録">
            <span className="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 14c-2.2 0-4 1.6-4 3.5V20h8v-2.5C11 15.6 9.2 14 7 14z" />
                <circle cx="7" cy="7" r="3" />
                <path d="M14 11h3V8h2v3h3v2h-3v3h-2v-3h-3z" />
              </svg>
            </span>
            <span className="nav-text">新規登録</span>
          </Link>
        </>
      ) : null}
      {isAdmin ? (
        <Link href="/admin" className="nav-link" aria-label="管理">
          <span className="nav-icon" aria-hidden="true">
            <Image src="/icons/admin.png" alt="" width={22} height={22} />
          </span>
          <span className="nav-text">管理</span>
        </Link>
      ) : null}
    </nav>
  );
}
