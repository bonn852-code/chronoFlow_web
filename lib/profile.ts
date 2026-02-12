import { supabaseAdmin } from "@/lib/supabase";
import { safeText } from "@/lib/utils";

type AuthLikeUser = {
  id: string;
  user_metadata?: Record<string, unknown> | null;
};

export type UserProfile = {
  user_id: string;
  display_name: string;
  icon_url: string | null;
  icon_focus_x: number;
  icon_focus_y: number;
  bio: string | null;
  updated_at: string;
};

function fallbackDisplayName(user: AuthLikeUser): string {
  const raw = user.user_metadata?.display_name;
  const text = safeText(raw, 1, 120);
  return text || "メンバー";
}

export async function ensureUserProfile(user: AuthLikeUser): Promise<UserProfile | null> {
  const { data: existing, error: existingErr } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id,display_name,icon_url,icon_focus_x,icon_focus_y,bio,updated_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!existingErr && existing) return existing;

  if (existingErr && (existingErr as { code?: string }).code !== "42P01") {
    return null;
  }

  const now = new Date().toISOString();
  const payload = {
    user_id: user.id,
    display_name: fallbackDisplayName(user),
    icon_url: null,
    icon_focus_x: 50,
    icon_focus_y: 50,
    bio: null,
    created_at: now,
    updated_at: now
  };

  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .upsert(payload, { onConflict: "user_id" })
    .select("user_id,display_name,icon_url,icon_focus_x,icon_focus_y,bio,updated_at")
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function getProfilesByUserIds(
  userIds: string[]
): Promise<Map<string, { display_name: string; icon_url: string | null; icon_focus_x: number; icon_focus_y: number }>> {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (!ids.length) return new Map();
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id,display_name,icon_url,icon_focus_x,icon_focus_y")
    .in("user_id", ids);
  if (error || !data) return new Map();
  return new Map(
    data.map((row) => [
      row.user_id,
      {
        display_name: row.display_name,
        icon_url: row.icon_url,
        icon_focus_x: row.icon_focus_x,
        icon_focus_y: row.icon_focus_y
      }
    ])
  );
}

export async function getResolvedProfilesByUserIds(
  userIds: string[]
): Promise<Map<string, { display_name: string; icon_url: string | null; icon_focus_x: number; icon_focus_y: number }>> {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (!ids.length) return new Map();

  const resolved = await getProfilesByUserIds(ids);
  const missing = ids.filter((id) => !resolved.has(id));
  if (!missing.length) return resolved;

  await Promise.all(
    missing.map(async (userId) => {
      const userRes = await supabaseAdmin.auth.admin.getUserById(userId);
      const user = userRes.data?.user;
      const metaName = safeText(user?.user_metadata?.display_name, 1, 120);
      const email = typeof user?.email === "string" ? user.email : "";
      const emailName = email.includes("@") ? email.split("@")[0] : "";
      const name = metaName || safeText(emailName, 1, 120) || "メンバー";
      const iconUrlRaw = typeof user?.user_metadata?.icon_url === "string" ? user.user_metadata.icon_url.trim() : "";
      const iconUrl = iconUrlRaw || null;
      const focusXRaw = Number(user?.user_metadata?.icon_focus_x);
      const focusYRaw = Number(user?.user_metadata?.icon_focus_y);
      const iconFocusX = Number.isFinite(focusXRaw) ? Math.min(100, Math.max(0, Math.round(focusXRaw))) : 50;
      const iconFocusY = Number.isFinite(focusYRaw) ? Math.min(100, Math.max(0, Math.round(focusYRaw))) : 50;
      resolved.set(userId, {
        display_name: name,
        icon_url: iconUrl,
        icon_focus_x: iconFocusX,
        icon_focus_y: iconFocusY
      });
    })
  );

  return resolved;
}
