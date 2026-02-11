import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import { env } from "@/lib/env";
import { SiteNav } from "@/components/site-nav";
import { AccountFabLink } from "@/components/account-fab-link";

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
              <Image
                src="/brand/chronoflow-logo.png"
                alt={`${env.siteName} ロゴ`}
                width={180}
                height={38}
                priority
                className="brand-logo"
              />
            </Link>
            <SiteNav />
            <AccountFabLink />
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="site-footer">
          <div className="container site-footer-inner">
            <Link href="/" className="footer-brand" aria-label={`${env.siteName} トップへ`}>
              <Image src="/brand/chronoflow-logo.png" alt="" width={148} height={30} className="footer-logo" />
            </Link>
            <p className="meta">© {new Date().getFullYear()} {env.siteName}</p>
          </div>
        </footer>
        <SiteNav mobile />
      </body>
    </html>
  );
}
