import { NextRequest } from "next/server";

export function hasSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  return Boolean(origin && origin === req.nextUrl.origin);
}

