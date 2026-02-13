import { NextRequest } from "next/server";
import { verifyAdminSessionToken } from "@/lib/admin-auth";
import { readAdminSessionToken } from "@/lib/constants";
import { hasSameOrigin } from "@/lib/security";

export function checkAdminRequest(req: NextRequest): boolean {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && !hasSameOrigin(req)) return false;
  const token = readAdminSessionToken(req.cookies);
  if (!token) return false;
  return verifyAdminSessionToken(token);
}
