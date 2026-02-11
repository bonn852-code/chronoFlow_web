"use client";

import Link from "next/link";
import { useEffect, useState, type MouseEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

export function SiteNav({ mobile }: { mobile?: boolean } = {}) {
  const supabase = createSupabaseBrowserClient();
  const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "bonnedits852@gmail.com").toLowerCase();
  const router = useRouter();
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  async function syncAdminSession(sessionToken?: string) {
    if (!sessionToken) return;
    await fetch("/api/admin/session/sync", {
      method: "POST",
      headers: { Authorization: `Bearer ${sessionToken}` },
      credentials: "same-origin"
    });
  }

  async function clearAdminSession() {
    await fetch("/api/admin/session/clear", { method: "POST", credentials: "same-origin" });
  }

  async function checkSuspended(sessionToken?: string) {
    if (!sessionToken) return false;
    const res = await fetch("/api/me/status", {
      method: "GET",
      headers: { Authorization: `Bearer ${sessionToken}` },
      credentials: "same-origin"
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { suspended?: boolean };
    return data.suspended === true;
  }

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session;
      if (!mounted) return;
      const suspended = await checkSuspended(session?.access_token);
      if (suspended) {
        await supabase.auth.signOut();
        if (mounted) {
          setLoggedIn(false);
          setIsAdmin(false);
          await clearAdminSession().catch(() => undefined);
          router.replace("/auth/login?blocked=1");
        }
        return;
      }
      setLoggedIn(Boolean(session));
      const email = session?.user?.email?.toLowerCase() || "";
      const admin = email === adminEmail;
      setIsAdmin(admin);
      if (admin) {
        void syncAdminSession(session?.access_token).catch(() => undefined);
      } else if (session) {
        void clearAdminSession().catch(() => undefined);
      }
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        await clearAdminSession().catch(() => undefined);
      }
      const suspended = await checkSuspended(session?.access_token);
      if (suspended) {
        await supabase.auth.signOut();
        setLoggedIn(false);
        setIsAdmin(false);
        await clearAdminSession().catch(() => undefined);
        router.replace("/auth/login?blocked=1");
        return;
      }
      setLoggedIn(Boolean(session));
      const email = session?.user?.email?.toLowerCase() || "";
      const admin = email === adminEmail;
      setIsAdmin(admin);
      if (admin) {
        void syncAdminSession(session?.access_token).catch(() => undefined);
      } else {
        void clearAdminSession().catch(() => undefined);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [adminEmail, supabase.auth, router]);

  async function openAdmin(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      await syncAdminSession(session.access_token).catch(() => undefined);
    }
    router.push("/admin");
  }

  function navClass(match: (path: string) => boolean) {
    return `nav-link${match(pathname) ? " active" : ""}`;
  }

  return (
    <nav className={`nav site-nav${mobile ? " mobile-bottom-nav" : ""}`}>
      <Link href="/members" className={navClass((p) => p.startsWith("/members"))} aria-label="メンバー">
        <span className="nav-icon" aria-hidden="true">
          <Image src="/icons/team.png" alt="" width={22} height={22} />
        </span>
        <span className="nav-text">メンバー</span>
      </Link>
      <Link href="/rankings" className={navClass((p) => p.startsWith("/rankings"))} aria-label="ランキング">
        <span className="nav-icon" aria-hidden="true">
          <Image src="/icons/crown.png" alt="" width={22} height={22} />
        </span>
        <span className="nav-text">ランキング</span>
      </Link>
      <Link href="/auditions" className={navClass((p) => p.startsWith("/auditions"))} aria-label="審査">
        <span className="nav-icon" aria-hidden="true">
          <Image src="/icons/audition.png" alt="" width={22} height={22} />
        </span>
        <span className="nav-text">審査</span>
      </Link>
      <Link href="/learn/ae" className={navClass((p) => p.startsWith("/learn/ae"))} aria-label="AE学習">
        <span className="nav-icon" aria-hidden="true">
          <Image src="/icons/learn.png" alt="" width={22} height={22} />
        </span>
        <span className="nav-text">AE学習</span>
      </Link>
      <Link href="/contact" className={navClass((p) => p.startsWith("/contact"))} aria-label="お問い合わせ">
        <span className="nav-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 5h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8l-4 3V7a2 2 0 0 1 2-2z" />
          </svg>
        </span>
        <span className="nav-text">お問い合わせ</span>
      </Link>
      {!loggedIn ? (
        <>
          <Link href="/auth/login" className={navClass((p) => p.startsWith("/auth/login"))} aria-label="ログイン">
            <span className="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M10 17v-2H4V9h6V7L15 12l-5 5z" />
                <path d="M20 4h-8v2h8v12h-8v2h8a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
              </svg>
            </span>
            <span className="nav-text">ログイン</span>
          </Link>
          <Link href="/auth/register" className={navClass((p) => p.startsWith("/auth/register"))} aria-label="新規登録">
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
      {loggedIn ? (
        <Link href="/account" className={navClass((p) => p.startsWith("/account"))} aria-label="アカウント">
          <span className="nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4.2 3.6-7 8-7s8 2.8 8 7" />
            </svg>
          </span>
          <span className="nav-text">アカウント</span>
        </Link>
      ) : null}
      {isAdmin ? (
        <Link href="/admin" className={navClass((p) => p.startsWith("/admin"))} aria-label="管理" onClick={openAdmin}>
          <span className="nav-icon" aria-hidden="true">
            <Image src="/icons/admin.png" alt="" width={22} height={22} />
          </span>
          <span className="nav-text">管理</span>
        </Link>
      ) : null}
    </nav>
  );
}
