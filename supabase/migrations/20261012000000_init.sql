-- Choreo Review schema
-- Two video kinds:
--   practice  : whole team; every member can view + comment; comments may tag people.
--   retention : one dancer (subject_id); only the dancer + captains can view; only captains comment.

create type public.role as enum ('member', 'captain');
create type public.video_kind as enum ('practice', 'retention');

-- ---------------------------------------------------------------- invite list
create table public.allowed_emails (
  email text primary key check (email = lower(email)),
  display_name text,
  role public.role not null default 'member',
  added_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text not null,
  role public.role not null default 'member',
  color text not null default '#b91c1c',
  created_at timestamptz not null default now()
);

-- Only invited emails may sign up; their profile is created on signup.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  invite public.allowed_emails;
  palette text[] := array['#b91c1c','#c2410c','#a16207','#15803d','#0e7490','#1d4ed8','#7e22ce','#be185d','#4d7c0f','#0f766e'];
begin
  select * into invite from public.allowed_emails where email = lower(new.email);
  if not found then
    raise exception 'This email is not on the team invite list';
  end if;
  insert into public.profiles (id, email, display_name, role, color)
  values (
    new.id,
    lower(new.email),
    coalesce(invite.display_name, split_part(new.email, '@', 1)),
    invite.role,
    palette[1 + floor(random() * array_length(palette, 1))::int]
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- songs / jathis
create table public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz not null default now()
);

create table public.jathis (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs (id) on delete cascade,
  name text not null,
  position int not null,
  unique (song_id, position) deferrable initially deferred
);

-- ---------------------------------------------------------------- videos
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  kind public.video_kind not null,
  youtube_id text not null check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  title text not null,
  song_id uuid references public.songs (id) on delete set null,
  recorded_on date,
  uploaded_by uuid not null default auth.uid() references public.profiles (id),
  subject_id uuid references public.profiles (id),
  duration_sec numeric,
  created_at timestamptz not null default now(),
  check ((kind = 'retention') = (subject_id is not null))
);
create index on public.videos (subject_id);

-- who is in a practice video (drives dashboards + tag suggestions)
create table public.video_participants (
  video_id uuid not null references public.videos (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (video_id, user_id)
);
create index on public.video_participants (user_id);

-- where each jathi starts in a given video; a jathi ends where the next starts
create table public.video_jathi_marks (
  video_id uuid not null references public.videos (id) on delete cascade,
  jathi_id uuid not null references public.jathis (id) on delete cascade,
  start_sec numeric not null check (start_sec >= 0),
  primary key (video_id, jathi_id)
);

-- ---------------------------------------------------------------- comments
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id),
  t_sec numeric not null check (t_sec >= 0),
  body text not null check (length(trim(body)) > 0),
  -- tagged user ids; empty array = general comment
  tags uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.comments (video_id, t_sec);
create index on public.comments using gin (tags);

create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger comments_touch before update on public.comments
  for each row execute function public.touch_updated_at();

-- last time a user opened a video, for "new comments" badges
create table public.video_views (
  video_id uuid not null references public.videos (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  primary key (video_id, user_id)
);

-- ---------------------------------------------------------------- auth helpers
create function public.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid())
$$;

create function public.is_captain() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'captain')
$$;

create function public.can_view_video(vid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.videos v
    where v.id = vid
      and public.is_member()
      and (v.kind = 'practice' or v.subject_id = auth.uid() or public.is_captain())
  )
$$;

create function public.can_comment_video(vid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.videos v
    where v.id = vid
      and public.is_member()
      and (v.kind = 'practice' or public.is_captain())
  )
$$;

create function public.can_edit_video(vid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.videos v
    where v.id = vid and (v.uploaded_by = auth.uid() or public.is_captain())
  )
$$;

-- ---------------------------------------------------------------- RLS
alter table public.allowed_emails enable row level security;
alter table public.profiles enable row level security;
alter table public.songs enable row level security;
alter table public.jathis enable row level security;
alter table public.videos enable row level security;
alter table public.video_participants enable row level security;
alter table public.video_jathi_marks enable row level security;
alter table public.comments enable row level security;
alter table public.video_views enable row level security;

create policy "captains manage invites" on public.allowed_emails
  for all using (public.is_captain()) with check (public.is_captain());

create policy "members see the team" on public.profiles
  for select using (public.is_member());
create policy "edit own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
-- members may only change their own name/color; roles change via set_role()
revoke update on public.profiles from authenticated;
grant update (display_name, color) on public.profiles to authenticated;

create policy "members read songs" on public.songs for select using (public.is_member());
create policy "members add songs" on public.songs for insert with check (public.is_member());
create policy "captains edit songs" on public.songs for update using (public.is_captain());
create policy "captains delete songs" on public.songs for delete using (public.is_captain());

create policy "members read jathis" on public.jathis for select using (public.is_member());
create policy "members add jathis" on public.jathis for insert with check (public.is_member());
create policy "captains edit jathis" on public.jathis for update using (public.is_captain());
create policy "captains delete jathis" on public.jathis for delete using (public.is_captain());

-- Checks the row's own columns rather than can_view_video(id): a lookup by id can't
-- see a row inserted by the same statement, which would break INSERT ... RETURNING.
create policy "view videos" on public.videos
  for select using (
    public.is_member()
    and (kind = 'practice' or subject_id = auth.uid() or public.is_captain())
  );
create policy "add videos" on public.videos
  for insert with check (
    public.is_member()
    and uploaded_by = auth.uid()
    and (kind = 'practice' or subject_id = auth.uid() or public.is_captain())
  );
create policy "uploader or captain edits video" on public.videos
  for update using (uploaded_by = auth.uid() or public.is_captain());
create policy "uploader or captain deletes video" on public.videos
  for delete using (uploaded_by = auth.uid() or public.is_captain());

create policy "view participants" on public.video_participants
  for select using (public.can_view_video(video_id));
create policy "edit participants" on public.video_participants
  for all using (public.can_edit_video(video_id)) with check (public.can_edit_video(video_id));

create policy "view marks" on public.video_jathi_marks
  for select using (public.can_view_video(video_id));
create policy "edit marks" on public.video_jathi_marks
  for all using (public.can_edit_video(video_id)) with check (public.can_edit_video(video_id));

create policy "view comments" on public.comments
  for select using (public.can_view_video(video_id));
create policy "post comments" on public.comments
  for insert with check (author_id = auth.uid() and public.can_comment_video(video_id));
create policy "edit own comments" on public.comments
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "delete own comments, captains moderate" on public.comments
  for delete using (author_id = auth.uid() or public.is_captain());
-- the video and author of a comment never change
revoke update on public.comments from authenticated;
grant update (body, t_sec, tags) on public.comments to authenticated;

create policy "own views" on public.video_views
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------- RPCs
create function public.set_role(target uuid, new_role public.role) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_captain() then
    raise exception 'Only captains can change roles';
  end if;
  update public.profiles set role = new_role where id = target;
  update public.allowed_emails set role = new_role
    where email = (select email from public.profiles where id = target);
end $$;

-- One row per video the caller can see, with the counts the dashboard shows.
-- security invoker: RLS still decides which videos/comments are visible.
create function public.my_dashboard()
returns table (
  id uuid,
  kind public.video_kind,
  youtube_id text,
  title text,
  song_title text,
  recorded_on date,
  subject_id uuid,
  subject_name text,
  created_at timestamptz,
  is_participant boolean,
  comment_count bigint,
  tagged_me bigint,
  new_count bigint,
  captain_comments bigint
)
language sql stable security invoker set search_path = '' as $$
  select
    v.id, v.kind, v.youtube_id, v.title, s.title, v.recorded_on,
    v.subject_id, sp.display_name, v.created_at,
    exists (select 1 from public.video_participants p
            where p.video_id = v.id and p.user_id = auth.uid()),
    count(c.id),
    count(c.id) filter (where auth.uid() = any (c.tags)),
    count(c.id) filter (where c.author_id <> auth.uid()
                          and (vw.last_seen_at is null or c.created_at > vw.last_seen_at)),
    count(c.id) filter (where ap.role = 'captain')
  from public.videos v
  left join public.songs s on s.id = v.song_id
  left join public.profiles sp on sp.id = v.subject_id
  left join public.video_views vw on vw.video_id = v.id and vw.user_id = auth.uid()
  left join public.comments c on c.video_id = v.id
  left join public.profiles ap on ap.id = c.author_id
  group by v.id, s.title, sp.display_name, vw.last_seen_at
  order by coalesce(v.recorded_on, v.created_at::date) desc, v.created_at desc
$$;

-- ---------------------------------------------------------------- realtime
alter publication supabase_realtime add table public.comments;
