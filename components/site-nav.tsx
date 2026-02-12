"use client";

import Link from "next/link";
import { useEffect, useState, type MouseEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

export function SiteNav({ mobile }: { mobile?: boolean } = {}) {
  const supabase = createSupabaseBrowserClient();
  const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@example.com").toLowerCase();
  const router = useRouter();
  const pathname = usePathname();
  const [authReady, setAuthReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMember, setIsMember] = useState(false);

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

  async function getUserStatus(sessionToken?: string, userId?: string) {
    if (!sessionToken) return { suspended: false, isMember: false };
    const cacheKey = userId ? `cf_user_status:${userId}` : "";
    if (cacheKey && typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem(cacheKey);
        if (raw) {
          const parsed = JSON.parse(raw) as { expiresAt: number; suspended: boolean; isMember: boolean };
          if (parsed.expiresAt > Date.now()) {
            return { suspended: parsed.suspended, isMember: parsed.isMember };
          }
        }
      } catch {
        // ignore cache parse errors
      }
    }

    const res = await fetch("/api/me/status", {
      method: "GET",
      headers: { Authorization: `Bearer ${sessionToken}` },
      credentials: "same-origin"
    });
    if (!res.ok) return { suspended: false, isMember: false };
    const data = (await res.json()) as { suspended?: boolean; isMember?: boolean };
    const result = { suspended: data.suspended === true, isMember: data.isMember === true };
    if (cacheKey && typeof window !== "undefined") {
      try {
        sessionStorage.setItem(
          cacheKey,
          JSON.stringify({
            ...result,
            expiresAt: Date.now() + 15_000
          })
        );
      } catch {
        // ignore cache write errors
      }
    }
    return result;
  }

  useEffect(() => {
    let mounted = true;
    async function applySession(session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) {
      if (!mounted) return;
      setLoggedIn(Boolean(session));
      const email = session?.user?.email?.toLowerCase() || "";
      const admin = email === adminEmail;
      setIsAdmin(admin);
      setAuthReady(true);
      if (admin) {
        void syncAdminSession(session?.access_token).catch(() => undefined);
      } else if (session) {
        void clearAdminSession().catch(() => undefined);
      }

      const status = await getUserStatus(session?.access_token, session?.user?.id);
      if (!mounted) return;
      if (status.suspended) {
        await supabase.auth.signOut();
        if (!mounted) return;
        setLoggedIn(false);
        setIsAdmin(false);
        setIsMember(false);
        setAuthReady(true);
        await clearAdminSession().catch(() => undefined);
        router.replace("/auth/login?blocked=1");
        return;
      }
      setIsMember(Boolean(session) && status.isMember);
    }

    supabase.auth.getSession().then(async ({ data }) => {
      await applySession(data.session);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        await clearAdminSession().catch(() => undefined);
      }
      await applySession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [adminEmail, supabase.auth, router]);

  useEffect(() => {
    const routes = ["/", "/members", "/rankings", "/auditions", "/learn/ae", "/contact", "/account", "/auth/login", "/auth/register"];
    if (isMember) routes.push("/assets");
    if (isAdmin) routes.push("/enter-admin", "/admin");
    routes.forEach((path) => {
      router.prefetch(path as never);
    });
  }, [isAdmin, isMember, router]);

  async function openAdmin(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    router.push("/enter-admin");
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
      {authReady && loggedIn && isMember ? (
        <Link href="/assets" className={navClass((p) => p.startsWith("/assets"))} aria-label="Assets">
          <span className="nav-icon" aria-hidden="true">
            <Image src="/icons/assets.png" alt="" width={22} height={22} />
          </span>
          <span className="nav-text">Assets</span>
        </Link>
      ) : null}
      <Link href="/contact" className={navClass((p) => p.startsWith("/contact"))} aria-label="お問い合わせ">
        <span className="nav-icon" aria-hidden="true">
          <Image src="/icons/contact.png" alt="" width={22} height={22} />
        </span>
        <span className="nav-text">お問い合わせ</span>
      </Link>
      {authReady && !loggedIn ? (
        <>
          <Link href="/auth/login" className={navClass((p) => p.startsWith("/auth/login"))} aria-label="ログイン">
            <span className="nav-icon" aria-hidden="true">
              <Image src="/icons/login.png" alt="" width={22} height={22} />
            </span>
            <span className="nav-text">ログイン</span>
          </Link>
          <Link href="/auth/register" className={navClass((p) => p.startsWith("/auth/register"))} aria-label="新規登録">
            <span className="nav-icon" aria-hidden="true">
              <Image src="/icons/register.png" alt="" width={22} height={22} />
            </span>
            <span className="nav-text">新規登録</span>
          </Link>
        </>
      ) : null}
      {authReady && loggedIn ? (
        <Link href="/account" className={navClass((p) => p.startsWith("/account"))} aria-label="アカウント">
          <span className="nav-icon nav-icon-account" aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="8" r="3.8" />
              <path d="M4.6 20c0-4.1 3.3-6.8 7.4-6.8s7.4 2.7 7.4 6.8" />
            </svg>
          </span>
          <span className="nav-text">アカウント</span>
        </Link>
      ) : null}
      {authReady && isAdmin ? (
        <Link
          href="/enter-admin"
          className={navClass((p) => p.startsWith("/admin") || p.startsWith("/enter-admin"))}
          aria-label="管理"
          onClick={openAdmin}
        >
          <span className="nav-icon" aria-hidden="true">
            <Image src="/icons/admin.png" alt="" width={22} height={22} />
          </span>
          <span className="nav-text">管理</span>
        </Link>
      ) : null}
    </nav>
  );
}
