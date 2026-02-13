"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AdminRoute =
  | "/admin"
  | "/admin/auditions"
  | "/admin/members"
  | "/admin/users"
  | "/admin/inquiries"
  | "/admin/security"
  | "/admin/assets"
  | "/admin/learn/ae"
  | "/admin/announcements";

export function AdminNav() {
  const pathname = usePathname();
  const items: Array<{ href: AdminRoute; label: string; match: (p: string) => boolean }> = [
    { href: "/admin", label: "ダッシュボード", match: (p: string) => p === "/admin" },
    { href: "/admin/auditions", label: "審査管理", match: (p: string) => p.startsWith("/admin/auditions") },
    { href: "/admin/members", label: "メンバー管理", match: (p: string) => p.startsWith("/admin/members") },
    { href: "/admin/users", label: "アカウント管理", match: (p: string) => p.startsWith("/admin/users") },
    { href: "/admin/inquiries", label: "お問い合わせ管理", match: (p: string) => p.startsWith("/admin/inquiries") },
    { href: "/admin/security", label: "運用監査", match: (p: string) => p.startsWith("/admin/security") },
    { href: "/admin/assets", label: "素材管理", match: (p: string) => p.startsWith("/admin/assets") },
    { href: "/admin/learn/ae", label: "AE学習管理", match: (p: string) => p.startsWith("/admin/learn/ae") },
    { href: "/admin/announcements", label: "お知らせ管理", match: (p: string) => p.startsWith("/admin/announcements") }
  ];
  return (
    <nav className="nav admin-nav" aria-label="管理メニュー">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`nav-link${item.match(pathname) ? " active" : ""}`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
