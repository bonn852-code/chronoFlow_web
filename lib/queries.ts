import { supabaseAdmin } from "@/lib/supabase";
import { getProfilesByUserIds } from "@/lib/profile";

type RankingRow = {
  member_id: string;
  reaction_count: number;
  members: {
    id: string;
    display_name: string;
    joined_at: string;
    is_active: boolean;
  };
};

export async function getMembers(query?: string, limit = 100) {
  let q = supabaseAdmin
    .from("members")
    .select("id,user_id,display_name,joined_at,is_active,icon_url,icon_focus_x,icon_focus_y,created_at")
    .eq("is_active", true)
    .order("joined_at", { ascending: true })
    .limit(limit);

  if (query?.trim()) {
    q = q.ilike("display_name", `%${query.trim()}%`);
  }

  let data;
  let error;
  ({ data, error } = await q);
  if (error && (error as { code?: string }).code === "42703") {
    const legacyQuery = supabaseAdmin
      .from("members")
      .select("id,display_name,joined_at,is_active,icon_url,icon_focus_x,icon_focus_y,created_at")
      .eq("is_active", true)
      .order("joined_at", { ascending: true })
      .limit(limit);
    const legacy = query?.trim() ? legacyQuery.ilike("display_name", `%${query.trim()}%`) : legacyQuery;
    const { data: legacyData, error: legacyErr } = await legacy;
    if (legacyErr) throw legacyErr;
    return legacyData || [];
  }
  if (error) throw error;
  const members = data || [];
  const profileMap = await getProfilesByUserIds(members.map((m) => m.user_id).filter(Boolean));
  return members.map((m) => {
    const profile = m.user_id ? profileMap.get(m.user_id) : null;
    return {
      ...m,
      display_name: profile?.display_name || m.display_name,
      icon_url: profile?.icon_url ?? m.icon_url,
      icon_focus_x: profile?.icon_focus_x ?? m.icon_focus_x,
      icon_focus_y: profile?.icon_focus_y ?? m.icon_focus_y
    };
  });
}

export async function getMembersPaged(query = "", page = 1, pageSize = 7) {
  const safePage = Math.max(1, page);
  const safeSize = Math.min(50, Math.max(1, pageSize));
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;

  let countQuery = supabaseAdmin.from("members").select("*", { count: "exact", head: true }).eq("is_active", true);
  let dataQuery = supabaseAdmin
    .from("members")
    .select("id,user_id,display_name,joined_at,is_active,icon_url,icon_focus_x,icon_focus_y,created_at")
    .eq("is_active", true)
    .order("joined_at", { ascending: true })
    .range(from, to);

  if (query.trim()) {
    const pattern = `%${query.trim()}%`;
    countQuery = countQuery.ilike("display_name", pattern);
    dataQuery = dataQuery.ilike("display_name", pattern);
  }

  let [{ count, error: countErr }, { data, error: dataErr }] = await Promise.all([countQuery, dataQuery]);
  if (dataErr && (dataErr as { code?: string }).code === "42703") {
    const legacyDataQuery = supabaseAdmin
      .from("members")
      .select("id,display_name,joined_at,is_active,icon_url,icon_focus_x,icon_focus_y,created_at")
      .eq("is_active", true)
      .order("joined_at", { ascending: true })
      .range(from, to);
    const withQuery = query.trim() ? legacyDataQuery.ilike("display_name", `%${query.trim()}%`) : legacyDataQuery;
    const legacyRes = await withQuery;
    data = (legacyRes.data as typeof data) || [];
    dataErr = legacyRes.error;
  }
  if (countErr) throw countErr;
  if (dataErr) throw dataErr;

  const members = data || [];
  const profileMap = await getProfilesByUserIds(members.map((m) => m.user_id).filter(Boolean));
  const merged = members.map((m) => {
    const profile = m.user_id ? profileMap.get(m.user_id) : null;
    return {
      ...m,
      display_name: profile?.display_name || m.display_name,
      icon_url: profile?.icon_url ?? m.icon_url,
      icon_focus_x: profile?.icon_focus_x ?? m.icon_focus_x,
      icon_focus_y: profile?.icon_focus_y ?? m.icon_focus_y
    };
  });

  return {
    members: merged,
    total: count || 0,
    page: safePage,
    pageSize: safeSize
  };
}

export async function getMemberById(memberId: string) {
  const { data: member, error: memberErr } = await supabaseAdmin
    .from("members")
    .select("id,user_id,display_name,joined_at,is_active,icon_url,icon_focus_x,icon_focus_y,created_at")
    .eq("id", memberId)
    .eq("is_active", true)
    .maybeSingle();
  if (memberErr && (memberErr as { code?: string }).code === "42703") {
    const legacy = await supabaseAdmin
      .from("members")
      .select("id,display_name,joined_at,is_active,icon_url,icon_focus_x,icon_focus_y,created_at")
      .eq("id", memberId)
      .eq("is_active", true)
      .maybeSingle();
    if (legacy.error) throw legacy.error;
    if (!legacy.data) return null;
    const linksOnly = await supabaseAdmin
      .from("member_links")
      .select("id,platform,url,created_at")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false });
    if (linksOnly.error) throw linksOnly.error;
    const linkIdsOnly = (linksOnly.data || []).map((x) => x.id);
    const likesOnly = linkIdsOnly.length
      ? await supabaseAdmin.from("link_reactions").select("member_link_id").in("member_link_id", linkIdsOnly)
      : { data: [], error: null };
    if (likesOnly.error) throw likesOnly.error;
    const likeMapOnly = new Map<string, number>();
    for (const row of likesOnly.data || []) likeMapOnly.set(row.member_link_id, (likeMapOnly.get(row.member_link_id) || 0) + 1);
    const decoratedOnly = (linksOnly.data || []).map((link) => ({ ...link, like_count: likeMapOnly.get(link.id) || 0 }));
    return {
      member: legacy.data,
      links: decoratedOnly,
      reactionCount: decoratedOnly.reduce((acc, link) => acc + link.like_count, 0)
    };
  }
  if (memberErr) throw memberErr;
  if (!member) return null;

  let mergedMember = member;
  if (member.user_id) {
    const profileMap = await getProfilesByUserIds([member.user_id]);
    const profile = profileMap.get(member.user_id);
    if (profile) {
      mergedMember = {
        ...member,
        display_name: profile.display_name,
        icon_url: profile.icon_url ?? member.icon_url,
        icon_focus_x: profile.icon_focus_x ?? member.icon_focus_x,
        icon_focus_y: profile.icon_focus_y ?? member.icon_focus_y
      };
    }
  }

  const { data: links, error: linksErr } = await supabaseAdmin
    .from("member_links")
    .select("id,platform,url,created_at")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });

  if (linksErr) throw linksErr;
  const linkIds = (links || []).map((x) => x.id);

  const { data: likes, error: likesErr } = linkIds.length
    ? await supabaseAdmin.from("link_reactions").select("member_link_id").in("member_link_id", linkIds)
    : { data: [], error: null };
  if (likesErr) throw likesErr;

  const likeMap = new Map<string, number>();
  for (const row of likes || []) {
    likeMap.set(row.member_link_id, (likeMap.get(row.member_link_id) || 0) + 1);
  }
  const decoratedLinks = (links || []).map((link) => ({
    ...link,
    like_count: likeMap.get(link.id) || 0
  }));
  const reactionCount = decoratedLinks.reduce((acc, link) => acc + link.like_count, 0);

  return { member: mergedMember, links: decoratedLinks, reactionCount };
}

export async function getRankings(range: "all" | "30d", limit = 50, offset = 0) {
  const view = range === "30d" ? "view_member_video_likes_30d" : "view_member_video_likes_all";
  const { data, error } = await supabaseAdmin
    .from(view)
    .select("member_id,reaction_count")
    .order("reaction_count", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;

  const memberIds = (data || []).map((row) => row.member_id);
  if (!memberIds.length) return [];

  const { data: members, error: membersError } = await supabaseAdmin
    .from("members")
    .select("id,user_id,display_name,joined_at,is_active")
    .in("id", memberIds)
    .eq("is_active", true);
  if (membersError && (membersError as { code?: string }).code === "42703") {
    const legacyMembersRes = await supabaseAdmin
      .from("members")
      .select("id,display_name,joined_at,is_active")
      .in("id", memberIds)
      .eq("is_active", true);
    if (legacyMembersRes.error) throw legacyMembersRes.error;
    const legacyMap = new Map((legacyMembersRes.data || []).map((m) => [m.id, m]));
    const legacyMerged = (data || [])
      .map((row) => ({
        member_id: row.member_id,
        reaction_count: row.reaction_count,
        members: legacyMap.get(row.member_id)
      }))
      .filter((row) => Boolean(row.members));
    legacyMerged.sort((a, b) => {
      if (a.reaction_count !== b.reaction_count) return b.reaction_count - a.reaction_count;
      return new Date(a.members!.joined_at).getTime() - new Date(b.members!.joined_at).getTime();
    });
    return legacyMerged.slice(0, limit) as RankingRow[];
  }
  if (membersError) throw membersError;

  const profileMap = await getProfilesByUserIds((members || []).map((m) => m.user_id).filter(Boolean));
  const memberMap = new Map(
    (members || []).map((m) => {
      const profile = m.user_id ? profileMap.get(m.user_id) : null;
      return [
        m.id,
        {
          ...m,
          display_name: profile?.display_name || m.display_name
        }
      ];
    })
  );
  const merged = (data || [])
    .map((row) => ({
      member_id: row.member_id,
      reaction_count: row.reaction_count,
      members: memberMap.get(row.member_id)
    }))
    .filter((row) => Boolean(row.members));

  // Tie-break: older joined_at first when reaction counts are the same.
  merged.sort((a, b) => {
    if (a.reaction_count !== b.reaction_count) return b.reaction_count - a.reaction_count;
    return new Date(a.members!.joined_at).getTime() - new Date(b.members!.joined_at).getTime();
  });

  return merged.slice(0, limit) as RankingRow[];
}

export async function getLatestPublicAnnouncements(limit = 10) {
  const { data, error } = await supabaseAdmin
    .from("announcements")
    .select("id,title,body,scope,created_at")
    .eq("scope", "public")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getPublicAnnouncementsPaged(page = 1, pageSize = 3) {
  const safePage = Math.max(1, page);
  const safeSize = Math.min(30, Math.max(1, pageSize));
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;

  const [{ data, error }, { count, error: countErr }] = await Promise.all([
    supabaseAdmin
      .from("announcements")
      .select("id,title,body,scope,created_at")
      .eq("scope", "public")
      .order("created_at", { ascending: false })
      .range(from, to),
    supabaseAdmin.from("announcements").select("*", { count: "exact", head: true }).eq("scope", "public")
  ]);

  if (error) throw error;
  if (countErr) throw countErr;
  return {
    announcements: data || [],
    total: count || 0,
    page: safePage,
    pageSize: safeSize
  };
}

export async function getAuditionBatchesPaged(page = 1, pageSize = 7, publishedOnly = false) {
  const safePage = Math.max(1, page);
  const safeSize = Math.min(30, Math.max(1, pageSize));
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;

  let listQuery = supabaseAdmin
    .from("audition_batches")
    .select("id,title,apply_open_at,apply_close_at,published_at,created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);
  let countQuery = supabaseAdmin.from("audition_batches").select("*", { count: "exact", head: true }).is("deleted_at", null);

  if (publishedOnly) {
    listQuery = listQuery.not("published_at", "is", null);
    countQuery = countQuery.not("published_at", "is", null);
  }

  const [{ data: batches, error }, { count, error: countErr }] = await Promise.all([listQuery, countQuery]);
  if (error) throw error;
  if (countErr) throw countErr;
  return {
    batches: batches || [],
    total: count || 0,
    page: safePage,
    pageSize: safeSize
  };
}
