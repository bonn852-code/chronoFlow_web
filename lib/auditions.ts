import { supabaseAdmin } from "@/lib/supabase";

export async function getCurrentBatch() {
  const { data, error } = await supabaseAdmin
    .from("audition_batches")
    .select("id,title,apply_open_at,apply_close_at,created_at,published_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (data) return data;

  const title = `${new Date().getFullYear()} ${new Date().toLocaleString("en-US", {
    month: "short"
  })} Audition`;
  const now = new Date();
  const close = new Date(now);
  close.setDate(close.getDate() + 30);
  const { data: created, error: createErr } = await supabaseAdmin
    .from("audition_batches")
    .insert({ title, apply_open_at: now.toISOString(), apply_close_at: close.toISOString() })
    .select("id,title,apply_open_at,apply_close_at,created_at,published_at")
    .single();

  if (createErr) throw createErr;
  return created;
}
