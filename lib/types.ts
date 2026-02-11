export type Platform = "youtube" | "tiktok" | "instagram" | "other";
export type AuditionStatus = "pending" | "approved" | "rejected";
export type AnnouncementScope = "public" | "members";

export type Member = {
  id: string;
  display_name: string;
  joined_at: string;
  is_active: boolean;
  portal_token: string;
  created_from_application_id: string | null;
  created_at: string;
};

export type MemberLink = {
  id: string;
  member_id: string;
  platform: Platform;
  url: string;
  created_at: string;
};

export type Reaction = {
  id: string;
  member_id: string;
  device_id: string;
  reacted_on: string;
  created_at: string;
};

export type AuditionApplication = {
  id: string;
  batch_id: string;
  display_name: string;
  video_url: string;
  sns_urls: string[];
  consent_public_profile: boolean;
  consent_advice: boolean;
  status: AuditionStatus;
  advice_text: string | null;
  application_code: string;
  created_at: string;
  reviewed_at: string | null;
};

export type AuditionBatch = {
  id: string;
  title: string;
  created_at: string;
  published_at: string | null;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  scope: AnnouncementScope;
  created_at: string;
};

export type Asset = {
  id: string;
  name: string;
  external_url: string;
  description: string | null;
  scope: "members";
  created_at: string;
};

export type LessonAe = {
  id: string;
  title: string;
  youtube_url: string;
  sort_order: number;
  created_at: string;
};
