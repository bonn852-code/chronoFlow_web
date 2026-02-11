import { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { applyRateLimit } from "@/lib/rate-limit";
import { jsonError, jsonOk } from "@/lib/http";
import { setAdminCookie } from "@/lib/admin-auth";
import { hasSameOrigin } from "@/lib/security";

export async function POST(req: NextRequest) {
  if (!hasSameOrigin(req)) return jsonError("Forbidden", 403);

  if (!env.enableAdminPasswordLogin) {
    return jsonError("Not Found", 404);
  }

  const rate = applyRateLimit(req.headers, "admin_login", 10, 60_000);
  if (!rate.allowed) return jsonError("試行回数が多すぎます", 429);

  const body = (await req.json().catch(() => null)) as { email?: string; password?: string; accessKey?: string } | null;
  if (!body?.email || !body?.password) return jsonError("メールアドレスとパスワードを入力してください", 400);
  if (process.env.ADMIN_LOGIN_KEY && body.accessKey !== process.env.ADMIN_LOGIN_KEY) {
    return jsonError("認証に失敗しました", 401);
  }
  if (body.email.toLowerCase() !== env.adminEmail.toLowerCase()) {
    return jsonError("認証に失敗しました", 401);
  }

  if (body.password !== env.adminPassword) return jsonError("認証に失敗しました", 401);

  await setAdminCookie();
  return jsonOk({ ok: true });
}
