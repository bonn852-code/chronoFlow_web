import { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { jsonError, jsonOk } from "@/lib/http";
import { setAdminCookie, clearAdminCookie } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { hasSameOrigin } from "@/lib/security";

export async function POST(req: NextRequest) {
  if (!hasSameOrigin(req)) return jsonError("Forbidden", 403);

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    await clearAdminCookie();
    return jsonError("認証が必要です", 401);
  }

  const {
    data: { user },
    error
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user?.email) {
    await clearAdminCookie();
    return jsonError("認証が無効です", 401);
  }

  if (user.email.toLowerCase() !== env.adminEmail.toLowerCase()) {
    await clearAdminCookie();
    return jsonError("管理者権限がありません", 403);
  }

  await setAdminCookie();
  return jsonOk({ ok: true });
}
