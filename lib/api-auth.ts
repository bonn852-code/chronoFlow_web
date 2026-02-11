import { NextRequest } from "next/server";
import { verifyAdminSessionToken } from "@/lib/admin-auth";
import { readAdminSessionToken } from "@/lib/constants";

export function checkAdminRequest(req: NextRequest): boolean {
  const token = readAdminSessionToken(req.cookies);
  if (!token) return false;
  return verifyAdminSessionToken(token);
}
