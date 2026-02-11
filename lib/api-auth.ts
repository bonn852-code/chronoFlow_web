import { NextRequest } from "next/server";
import { verifyAdminSessionToken } from "@/lib/admin-auth";
import { adminCookieName } from "@/lib/constants";

export function checkAdminRequest(req: NextRequest): boolean {
  const token = req.cookies.get(adminCookieName)?.value;
  if (!token) return false;
  return verifyAdminSessionToken(token);
}
