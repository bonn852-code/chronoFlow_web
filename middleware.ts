import { NextRequest, NextResponse } from "next/server";
import { adminCookieNames } from "@/lib/constants";

const textEncoder = new TextEncoder();

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function verifyAdminToken(token: string, secret: string): Promise<boolean> {
  const [payloadPart, signature] = token.split(".");
  if (!payloadPart || !signature) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signed = await crypto.subtle.sign("HMAC", key, textEncoder.encode(payloadPart));
  const expected = bytesToBase64Url(new Uint8Array(signed));
  if (!constantTimeEqual(signature, expected)) return false;

  try {
    const payloadText = new TextDecoder().decode(base64UrlToBytes(payloadPart));
    const payload = JSON.parse(payloadText) as { role?: string; exp?: number };
    return payload.role === "admin" && typeof payload.exp === "number" && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function isAdminCookiePresent(req: NextRequest): string | null {
  for (const name of adminCookieNames) {
    const value = req.cookies.get(name)?.value;
    if (value) return value;
  }
  return null;
}

function isAllowedPath(pathname: string): boolean {
  if (pathname === "/admin/login") return true;
  if (pathname.startsWith("/api/admin/login")) return true;
  if (pathname.startsWith("/api/admin/logout")) return true;
  if (pathname.startsWith("/api/admin/session/sync")) return true;
  if (pathname.startsWith("/api/admin/session/clear")) return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");

  if (!(isAdminPage || isAdminApi)) return NextResponse.next();
  if (isAllowedPath(pathname)) return NextResponse.next();

  const token = isAdminCookiePresent(req);
  const secret = process.env.ADMIN_SESSION_SECRET || "";
  if (!token || !secret || !(await verifyAdminToken(token, secret))) {
    if (isAdminApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const nextUrl = req.nextUrl.clone();
    nextUrl.pathname = "/enter-admin";
    nextUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(nextUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"]
};
