import { NextRequest } from "next/server";
import { applyRateLimit } from "@/lib/rate-limit";
import { jsonError, jsonOk } from "@/lib/http";
import { supabaseAdmin, supabasePublic } from "@/lib/supabase";
import { safeText } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin || origin !== req.nextUrl.origin) return jsonError("Forbidden", 403);

  const rate = applyRateLimit(req.headers, "account_delete", 10, 60_000);
  if (!rate.allowed) return jsonError("試行回数が多すぎます", 429);

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return jsonError("認証が必要です", 401);

  const body = (await req.json().catch(() => null)) as { password?: string } | null;
  const password = safeText(body?.password, 8, 200);
  if (!password) return jsonError("パスワードを入力してください", 400);

  const {
    data: { user },
    error: userErr
  } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !user || !user.email) return jsonError("認証が無効です", 401);

  const { error: passwordErr } = await supabasePublic.auth.signInWithPassword({
    email: user.email,
    password
  });
  if (passwordErr) return jsonError("パスワードが正しくありません", 401);

  const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(user.id);
  if (deleteErr) return jsonError("アカウント削除に失敗しました", 500);

  return jsonOk({ ok: true });
}
