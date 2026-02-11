import { supabaseAdmin } from "@/lib/supabase";

type SecuritySeverity = "info" | "warn" | "error";

export async function logSecurityEvent(input: {
  eventType: string;
  severity?: SecuritySeverity;
  actorUserId?: string | null;
  target?: string | null;
  detail?: Record<string, unknown>;
}) {
  const { eventType, severity = "info", actorUserId = null, target = null, detail = {} } = input;
  await supabaseAdmin.from("security_events").insert({
    event_type: eventType,
    severity,
    actor_user_id: actorUserId,
    target,
    detail
  });
}

