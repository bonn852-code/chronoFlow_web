const store = new Map<string, { count: number; resetAt: number }>();

function getClientIp(headers: Headers): string {
  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf.trim();

  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  return headers.get("x-real-ip") || "unknown";
}

export function applyRateLimit(
  headers: Headers,
  scope: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const ip = getClientIp(headers);
  const ua = (headers.get("user-agent") || "unknown").slice(0, 120);
  const key = `${scope}:${ip}:${ua}`;
  const current = store.get(key);

  // Opportunistic cleanup to avoid unbounded memory growth.
  if (store.size > 5000) {
    for (const [k, v] of store.entries()) {
      if (v.resetAt <= now) store.delete(k);
    }
  }

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }

  if (current.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }

  current.count += 1;
  store.set(key, current);
  return { allowed: true, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) };
}
