import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export type AuthUser = {
  id: string;
  email: string | null;
};

export async function getAuthUserFromRequest(req: NextRequest): Promise<{ user: AuthUser | null; error?: string }> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return { user: null, error: "認証が必要です" };

  const {
    data: { user },
    error
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) return { user: null, error: "認証が無効です。再ログインしてください" };
  return { user: { id: user.id, email: user.email ?? null } };
}

export async function getSuspensionState(userId: string): Promise<{ suspended: boolean; reason: string | null }> {
  const { data, error } = await supabaseAdmin
    .from("user_account_controls")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    // Fail-open for environments where the new table is not migrated yet.
    if ((error as { code?: string }).code === "42P01") {
      return { suspended: false, reason: null };
    }
    return { suspended: false, reason: null };
  }
  return {
    suspended: Boolean(data?.is_suspended),
    reason: data?.suspend_reason ?? null
  };
}

export async function getUserAccessState(
  userId: string
): Promise<{ suspended: boolean; reason: string | null; isMember: boolean }> {
  const { data, error } = await supabaseAdmin.from("user_account_controls").select("*").eq("user_id", userId).maybeSingle();
  if (error) {
    if ((error as { code?: string }).code === "42P01") {
      return { suspended: false, reason: null, isMember: false };
    }
    return { suspended: false, reason: null, isMember: false };
  }
  return {
    suspended: Boolean(data?.is_suspended),
    reason: data?.suspend_reason ?? null,
    isMember: Boolean(data?.is_member)
  };
}
