import { NextRequest } from "next/server";

export function hasSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (origin) return origin === req.nextUrl.origin;

  // Some same-origin POST requests may omit Origin.
  const referer = req.headers.get("referer");
  if (!referer) {
    const secFetchSite = req.headers.get("sec-fetch-site");
    return secFetchSite === "same-origin" || secFetchSite === "same-site";
  }
  try {
    return new URL(referer).origin === req.nextUrl.origin;
  } catch {
    return false;
  }
}
