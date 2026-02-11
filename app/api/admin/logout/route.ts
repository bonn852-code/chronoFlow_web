import { NextRequest } from "next/server";
import { clearAdminCookie } from "@/lib/admin-auth";
import { jsonError, jsonOk } from "@/lib/http";
import { hasSameOrigin } from "@/lib/security";

export async function POST(req: NextRequest) {
  if (!hasSameOrigin(req)) return jsonError("Forbidden", 403);

  await clearAdminCookie();
  return jsonOk({ ok: true });
}
