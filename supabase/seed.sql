-- Local dev seed. All users have password "password123".
--   captain@team.test  (captain)
--   anika@team.test, ravi@team.test, meera@team.test  (members)

insert into public.allowed_emails (email, display_name, role) values
  ('captain@team.test', 'Priya (captain)', 'captain'),
  ('anika@team.test', 'Anika', 'member'),
  ('ravi@team.test', 'Ravi', 'member'),
  ('meera@team.test', 'Meera', 'member');

-- auth users (the on_auth_user_created trigger creates their profiles)
with u(id, email) as (values
  ('00000000-0000-0000-0000-00000000000c'::uuid, 'captain@team.test'),
  ('00000000-0000-0000-0000-00000000000a'::uuid, 'anika@team.test'),
  ('00000000-0000-0000-0000-00000000000b'::uuid, 'ravi@team.test'),
  ('00000000-0000-0000-0000-00000000000d'::uuid, 'meera@team.test')
)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
  crypt('password123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
from u;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text, jsonb_build_object('sub', id::text, 'email', email), 'email', now(), now(), now()
from auth.users where email like '%@team.test';

-- one song with six jathis
insert into public.songs (id, title) values
  ('10000000-0000-0000-0000-000000000001', 'Thillana – Dhanashree');

insert into public.jathis (song_id, name, position)
select '10000000-0000-0000-0000-000000000001', name, ord
from unnest(array['Opening', 'Jathi 1', 'Jathi 2', 'Sahityam', 'Jathi 3', 'Finale'])
  with ordinality as t(name, ord);

-- a practice video with everyone in it, and a retention video for Anika
insert into public.videos (id, kind, youtube_id, title, song_id, recorded_on, uploaded_by, subject_id, duration_sec) values
  ('20000000-0000-0000-0000-000000000001', 'practice', 'aqz-KE-bpKQ', 'Full run – Sunday practice',
   '10000000-0000-0000-0000-000000000001', current_date - 1, '00000000-0000-0000-0000-00000000000c', null, 634),
  ('20000000-0000-0000-0000-000000000002', 'retention', 'aqz-KE-bpKQ', 'Anika – retention check',
   '10000000-0000-0000-0000-000000000001', current_date, '00000000-0000-0000-0000-00000000000a',
   '00000000-0000-0000-0000-00000000000a', 634);

insert into public.video_participants (video_id, user_id)
select '20000000-0000-0000-0000-000000000001', id from public.profiles;

insert into public.video_jathi_marks (video_id, jathi_id, start_sec)
select v.id, j.id, (j.position - 1) * 100 + 8
from public.jathis j
cross join (values ('20000000-0000-0000-0000-000000000001'::uuid), ('20000000-0000-0000-0000-000000000002'::uuid)) as v(id);

insert into public.comments (video_id, author_id, t_sec, body, tags) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 12, 'Formation is drifting left in the opening walk-on, everyone watch spacing', '{}'),
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 25, 'Araimandi is too high here', '{00000000-0000-0000-0000-00000000000a}'),
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 31, 'I was late on the tha-dhi-gi-na-thom, will fix', '{00000000-0000-0000-0000-00000000000a}'),
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 118, 'Ravi and Meera, your arms are at different heights in the second korvai', '{00000000-0000-0000-0000-00000000000b,00000000-0000-0000-0000-00000000000d}'),
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d', 215, 'Expressions are great in this part!', '{}'),
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 420, 'Meera, the turn is on the wrong foot', '{00000000-0000-0000-0000-00000000000d}'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000c', 140, 'You forgot the second half of this jathi, reviewing it together next practice', '{}');
