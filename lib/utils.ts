import { randomBytes } from "node:crypto";

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function toDayDiff(fromISO: string): number {
  const from = new Date(fromISO);
  const now = new Date();
  const diffMs = now.getTime() - from.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function safeText(value: unknown, min = 1, max = 120): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) return null;
  return trimmed;
}

export function safeStringArray(value: unknown, max = 10): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0)
    .slice(0, max);
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function makeApplicationCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(12);
  let out = "";
  for (let i = 0; i < 12; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

export function platformFromUrl(url: string): "youtube" | "tiktok" | "instagram" | "other" {
  const host = new URL(url).hostname.toLowerCase();
  if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
  if (host.includes("tiktok.com")) return "tiktok";
  if (host.includes("instagram.com")) return "instagram";
  return "other";
}

const auditionAllowedDomains = [
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "tiktok.com",
  "www.tiktok.com",
  "m.tiktok.com",
  "instagram.com",
  "www.instagram.com"
];

function hostnameMatchesAllowed(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return auditionAllowedDomains.some((domain) => lower === domain || lower.endsWith(`.${domain}`));
}

export function isAllowedAuditionUrl(url: string): boolean {
  if (!isValidUrl(url)) return false;
  try {
    const parsed = new URL(url);
    return hostnameMatchesAllowed(parsed.hostname);
  } catch {
    return false;
  }
}

export function hasSamePlatformSns(videoUrl: string, snsUrls: string[]): boolean {
  const platform = platformFromUrl(videoUrl);
  if (platform === "other") return true;
  return snsUrls.some((url) => platformFromUrl(url) === platform);
}

export function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
