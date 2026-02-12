create extension if not exists pgcrypto;

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  display_name text not null check (char_length(display_name) between 1 and 120),
  joined_at timestamptz not null default now(),
  is_active boolean not null default true,
  icon_url text null,
  icon_focus_x int not null default 50 check (icon_focus_x between 0 and 100),
  icon_focus_y int not null default 50 check (icon_focus_y between 0 and 100),
  portal_token uuid not null unique default gen_random_uuid(),
  created_from_application_id uuid null,
  created_at timestamptz not null default now()
);

alter table members add column if not exists icon_url text null;
alter table members add column if not exists icon_focus_x int not null default 50;
alter table members add column if not exists icon_focus_y int not null default 50;
alter table members add column if not exists user_id uuid null;

create table if not exists user_profiles (
  user_id uuid primary key,
  display_name text not null check (char_length(display_name) between 1 and 120),
  bio text null check (bio is null or char_length(bio) <= 500),
  icon_url text null,
  icon_focus_x int not null default 50 check (icon_focus_x between 0 and 100),
  icon_focus_y int not null default 50 check (icon_focus_y between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists member_links (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  platform text not null check (platform in ('youtube', 'tiktok', 'instagram', 'other')),
  url text not null,
  created_at timestamptz not null default now()
);

create table if not exists reactions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  device_id text not null check (char_length(device_id) between 8 and 120),
  reacted_on date not null,
  created_at timestamptz not null default now(),
  unique(member_id, device_id, reacted_on)
);

create table if not exists link_reactions (
  id uuid primary key default gen_random_uuid(),
  member_link_id uuid not null references member_links(id) on delete cascade,
  device_id text not null check (char_length(device_id) between 8 and 120),
  reacted_on date not null,
  created_at timestamptz not null default now(),
  unique(member_link_id, device_id, reacted_on)
);

create table if not exists audition_batches (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  apply_open_at timestamptz not null default now(),
  apply_close_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  published_at timestamptz null,
  deleted_at timestamptz null,
  check (apply_open_at < apply_close_at)
);

alter table audition_batches add column if not exists apply_open_at timestamptz not null default now();
alter table audition_batches add column if not exists apply_close_at timestamptz not null default (now() + interval '30 days');
alter table audition_batches add column if not exists deleted_at timestamptz null;

create table if not exists audition_applications (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references audition_batches(id) on delete cascade,
  applied_by_user_id uuid null,
  display_name text not null check (char_length(display_name) between 1 and 120),
  video_url text not null,
  sns_urls jsonb not null default '[]'::jsonb,
  consent_public_profile boolean not null,
  consent_advice boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  advice_text text null,
  application_code text not null unique,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz null
);

create table if not exists audition_resubmit_permissions (
  batch_id uuid not null references audition_batches(id) on delete cascade,
  user_id uuid not null,
  granted_by_application_id uuid null references audition_applications(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (batch_id, user_id)
);

alter table audition_applications add column if not exists applied_by_user_id uuid null;
create index if not exists idx_audition_applications_user_id on audition_applications(applied_by_user_id);

alter table audition_applications drop constraint if exists audition_applications_batch_id_fkey;
alter table audition_applications
  add constraint audition_applications_batch_id_fkey
  foreign key (batch_id) references audition_batches(id) on delete cascade;

alter table members drop constraint if exists fk_members_application;
alter table members
  add constraint fk_members_application
  foreign key (created_from_application_id) references audition_applications(id) on delete set null;

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  external_url text not null,
  description text null,
  storage_path text unique,
  scope text not null default 'members' check (scope in ('members')),
  created_at timestamptz not null default now()
);

alter table assets add column if not exists external_url text;
alter table assets add column if not exists description text;
alter table assets alter column storage_path drop not null;

create table if not exists lessons_ae (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  youtube_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  scope text not null check (scope in ('public', 'members')),
  created_at timestamptz not null default now()
);

create table if not exists user_account_controls (
  user_id uuid primary key,
  is_suspended boolean not null default false,
  suspend_reason text null,
  suspended_at timestamptz null,
  is_member boolean not null default false,
  member_granted_at timestamptz null,
  member_granted_by uuid null,
  suspended_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table user_account_controls add column if not exists is_member boolean not null default false;
alter table user_account_controls add column if not exists member_granted_at timestamptz null;
alter table user_account_controls add column if not exists member_granted_by uuid null;

create table if not exists contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text not null,
  subject text not null check (char_length(subject) between 3 and 120),
  message text not null check (char_length(message) between 10 and 4000),
  created_at timestamptz not null default now()
);

create table if not exists security_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid null,
  event_type text not null,
  severity text not null default 'info' check (severity in ('info', 'warn', 'error')),
  target text null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_members_active_joined on members(is_active, joined_at);
create index if not exists idx_members_user_id on members(user_id);
create index if not exists idx_user_profiles_display_name on user_profiles(display_name);
create index if not exists idx_member_links_member_id on member_links(member_id);
create index if not exists idx_reactions_member_created on reactions(member_id, created_at);
create index if not exists idx_reactions_reacted_on on reactions(reacted_on);
create index if not exists idx_link_reactions_link_created on link_reactions(member_link_id, created_at);
create index if not exists idx_link_reactions_reacted_on on link_reactions(reacted_on);
create index if not exists idx_applications_batch_status on audition_applications(batch_id, status);
create index if not exists idx_announcements_scope_created on announcements(scope, created_at);
create index if not exists idx_user_account_controls_suspended on user_account_controls(is_suspended, updated_at);
create index if not exists idx_contact_inquiries_created_at on contact_inquiries(created_at desc);
create index if not exists idx_security_events_created_at on security_events(created_at desc);
create index if not exists idx_security_events_event on security_events(event_type, created_at desc);
create index if not exists idx_resubmit_permissions_user on audition_resubmit_permissions(user_id, granted_at desc);

create or replace view view_member_reactions_all
with (security_invoker = true) as
select
  m.id as member_id,
  count(r.id)::int as reaction_count
from members m
left join reactions r on r.member_id = m.id
group by m.id;

create or replace view view_member_reactions_30d
with (security_invoker = true) as
select
  m.id as member_id,
  count(r.id)::int as reaction_count
from members m
left join reactions r
  on r.member_id = m.id
  and r.created_at >= now() - interval '30 days'
group by m.id;

create or replace view view_member_video_likes_all
with (security_invoker = true) as
select
  m.id as member_id,
  count(lr.id)::int as reaction_count
from members m
left join member_links ml on ml.member_id = m.id
left join link_reactions lr on lr.member_link_id = ml.id
group by m.id;

create or replace view view_member_video_likes_30d
with (security_invoker = true) as
select
  m.id as member_id,
  count(lr.id)::int as reaction_count
from members m
left join member_links ml on ml.member_id = m.id
left join link_reactions lr
  on lr.member_link_id = ml.id
  and lr.created_at >= now() - interval '30 days'
group by m.id;

alter view if exists public.view_member_reactions_all set (security_invoker = true);
alter view if exists public.view_member_reactions_30d set (security_invoker = true);
alter view if exists public.view_member_video_likes_all set (security_invoker = true);
alter view if exists public.view_member_video_likes_30d set (security_invoker = true);

insert into audition_batches(title)
select to_char(now(), 'YYYY Mon') || ' Audition'
where not exists (select 1 from audition_batches);

update members m
set user_id = a.applied_by_user_id
from audition_applications a
where m.created_from_application_id = a.id
  and m.user_id is null
  and a.applied_by_user_id is not null;

insert into storage.buckets (id, name, public, file_size_limit)
values ('member-assets', 'member-assets', false, 52428800)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit)
values ('profile-icons', 'profile-icons', true, 2097152)
on conflict (id) do nothing;

-- RLS
alter table members enable row level security;
alter table member_links enable row level security;
alter table user_profiles enable row level security;
alter table reactions enable row level security;
alter table link_reactions enable row level security;
alter table audition_batches enable row level security;
alter table audition_applications enable row level security;
alter table assets enable row level security;
alter table lessons_ae enable row level security;
alter table announcements enable row level security;
alter table user_account_controls enable row level security;
alter table contact_inquiries enable row level security;
alter table security_events enable row level security;
alter table audition_resubmit_permissions enable row level security;

drop policy if exists members_public_select on members;
drop policy if exists member_links_public_select on member_links;
drop policy if exists reactions_public_insert on reactions;
drop policy if exists reactions_public_select on reactions;
drop policy if exists link_reactions_public_insert on link_reactions;
drop policy if exists link_reactions_public_select on link_reactions;
drop policy if exists lessons_public_select on lessons_ae;
drop policy if exists announcements_public_select on announcements;
drop policy if exists auditions_public_insert on audition_applications;

do $$
declare
  p record;
begin
  for p in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'members',
        'member_links',
        'user_profiles',
        'reactions',
        'link_reactions',
        'audition_batches',
        'audition_applications',
        'assets',
        'lessons_ae',
        'announcements',
        'user_account_controls',
        'contact_inquiries',
        'security_events',
        'audition_resubmit_permissions'
      )
  loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- Hardened mode: no public RLS policies.
-- All reads/writes are expected to go through server-side APIs using Service Role.
