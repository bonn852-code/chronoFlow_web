const primaryAdminCookieName =
  process.env.NODE_ENV === "production" ? "__Host-cf_admin_session" : "cf_admin_session";
const legacyAdminCookieName = "cf_admin_session";

export const adminCookieName = primaryAdminCookieName;
export const adminCookieNames = Array.from(
  new Set([primaryAdminCookieName, legacyAdminCookieName].filter(Boolean))
);
export const adminSessionMaxAgeSeconds = 60 * 60 * 12;

type CookieValue = { value?: string } | undefined;
type CookieLike = { get: (name: string) => CookieValue };

export function readAdminSessionToken(cookieStore: CookieLike): string | null {
  for (const name of adminCookieNames) {
    const token = cookieStore.get(name)?.value;
    if (token) return token;
  }
  return null;
}
