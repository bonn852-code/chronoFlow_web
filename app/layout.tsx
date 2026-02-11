import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { env } from "@/lib/env";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: `${env.siteName} Web`,
  description: "ChronoFlow 公式サイト"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <header className="site-header">
          <div className="container site-header-inner">
            <Link href="/" className="brand">
              {env.siteName}
            </Link>
            <Link href="/account" className="account-fab" aria-label="アカウント">
              A
            </Link>
            <SiteNav />
          </div>
        </header>
        <main className="container">{children}</main>
        <SiteNav mobile />
      </body>
    </html>
  );
}
