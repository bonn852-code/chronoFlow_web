import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readAdminSessionToken } from "@/lib/constants";
import { verifyAdminSessionTokenEdge } from "@/lib/admin-auth-edge";

const ADMIN_PATHS = ["/admin", "/api/admin"];
const maintenanceMode = process.env.MAINTENANCE_MODE === "true";
const STATIC_PREFIXES = ["/_next", "/favicon.ico", "/robots.txt", "/sitemap.xml", "/icons", "/brand"];

function needsAdmin(pathname: string): boolean {
  if (
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/api/admin/login") ||
    pathname.startsWith("/api/admin/logout") ||
    pathname.startsWith("/api/admin/session/sync") ||
    pathname.startsWith("/api/admin/session/clear")
  ) {
    return false;
  }
  return ADMIN_PATHS.some((prefix) => pathname.startsWith(prefix));
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method.toUpperCase();

  if (STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  if (maintenanceMode) {
    const isAdminPath = ADMIN_PATHS.some((prefix) => pathname.startsWith(prefix));
    const isMaintenancePage = pathname === "/maintenance";
    const isAdminLogin = pathname.startsWith("/enter-admin") || pathname.startsWith("/auth/login");
    if (!isAdminPath && !isMaintenancePage && !isAdminLogin) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "メンテナンス中です" }, { status: 503 });
      }
      const url = req.nextUrl.clone();
      url.pathname = "/maintenance";
      return NextResponse.redirect(url);
    }
  }

  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-site");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  response.headers.set("Origin-Agent-Cluster", "?1");
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "img-src 'self' data: https:",
      "media-src 'self' https:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline'",
      "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "worker-src 'self' blob:",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : [])
    ].join("; ")
  );

  if (!needsAdmin(pathname)) {
    if (pathname.startsWith("/admin/login")) {
      const loginKey = process.env.ADMIN_LOGIN_KEY;
      const hasSession = Boolean(readAdminSessionToken(req.cookies));
      if (!hasSession && loginKey) {
        const queryKey = req.nextUrl.searchParams.get("k");
        if (queryKey !== loginKey) {
          return NextResponse.rewrite(new URL("/not-found", req.url), { status: 404 });
        }
      }
    }
    return response;
  }

  if (pathname.startsWith("/api/admin") && method !== "GET") {
    const origin = req.headers.get("origin");
    if (!origin || origin !== req.nextUrl.origin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const token = readAdminSessionToken(req.cookies);
  const secret = process.env.ADMIN_SESSION_SECRET || "";
  const valid = token && secret ? await verifyAdminSessionTokenEdge(token, secret) : false;

  if (valid) {
    return response;
  }

  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/enter-admin";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|robots.txt|sitemap.xml|icons/|brand/).*)"]
};
