function must(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

const adminSessionSecret = must("ADMIN_SESSION_SECRET");
const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@example.com").trim();
const enableAdminPasswordLogin = process.env.ENABLE_ADMIN_PASSWORD_LOGIN === "true";
const adminPassword = process.env.ADMIN_PASSWORD || "";

const isProduction = process.env.NODE_ENV === "production";

if (enableAdminPasswordLogin && !adminPassword) {
  throw new Error("ADMIN_PASSWORD is required when ENABLE_ADMIN_PASSWORD_LOGIN=true");
}

if (isProduction && enableAdminPasswordLogin && adminPassword.length < 16) {
  throw new Error("ADMIN_PASSWORD must be at least 16 characters for production-grade security");
}

if (isProduction && adminSessionSecret.length < 32) {
  throw new Error("ADMIN_SESSION_SECRET must be at least 32 characters");
}

export const env = {
  siteName: process.env.SITE_NAME ?? "ChronoFlow",
  supabaseUrl: must("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: must("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: must("SUPABASE_SERVICE_ROLE_KEY"),
  adminEmail,
  adminPassword,
  adminSessionSecret,
  enableAdminPasswordLogin
};
