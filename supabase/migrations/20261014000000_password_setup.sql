-- Captains create accounts (Team page, admin API, no email). On first visit the member
-- claims theirs by choosing a password; until then the app sends them to set one.

-- Whether the member has chosen their own password. Not derived from
-- auth.users.encrypted_password, which can hold a random value for accounts created by
-- captains or reset by them.
alter table public.profiles add column password_set boolean not null default false;

-- Only this function may flip it (profiles column grants don't include password_set).
create function public.mark_password_set() returns void
language sql security definer set search_path = '' as $$
  update public.profiles set password_set = true where id = auth.uid()
$$;
