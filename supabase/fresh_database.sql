-- ============================================================================
-- MedTrack : FRESH DATABASE  (core schema + admin tools)
-- Paste this whole file into a NEW Supabase project: SQL Editor -> New query -> Run.
-- ============================================================================

-- ============================================================================
-- MedTrack  -  CORE SCHEMA FOR A BRAND-NEW SUPABASE PROJECT
-- ----------------------------------------------------------------------------
-- Part 1 of fresh_database.sql (part 2 = admin tools).  Run on an EMPTY project.
--   * tables + foreign keys (deleting a user / medication cleans up their data)
--   * Row Level Security: every member can only see and change their own rows
--   * sign-up trigger: creates the profile + notification settings automatically
--   * the database functions the app calls:
--       record_missed_dose, update_medication_with_schedule,
--       claim_caregiver_invitations, respond_to_caregiver_invitation,
--       get_caregiver_patient_summary / _medications / _adherence_history / _missed_doses
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tables
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  medication_reminders boolean not null default true,
  missed_dose_alerts boolean not null default true,
  refill_alerts boolean not null default true,
  sound_enabled boolean not null default true,
  vibration_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  dosage text,
  medication_form text,
  instructions text,
  current_quantity numeric,
  refill_threshold numeric default 5,
  start_date date,
  end_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists medications_user_idx on public.medications (user_id, is_active);

create table if not exists public.medication_schedules (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references public.medications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  frequency text,
  dose_time time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists schedules_user_idx on public.medication_schedules (user_id, is_active);
create unique index if not exists schedules_unique_active_time
  on public.medication_schedules (medication_id, dose_time) where is_active;

create table if not exists public.dose_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  medication_id uuid not null references public.medications (id) on delete cascade,
  schedule_id uuid references public.medication_schedules (id) on delete set null,
  scheduled_for timestamptz not null,
  taken_at timestamptz,
  status text not null check (status in ('taken', 'missed', 'skipped')),
  created_at timestamptz not null default now()
);
create index if not exists dose_logs_user_time_idx on public.dose_logs (user_id, scheduled_for desc);
create index if not exists dose_logs_schedule_idx on public.dose_logs (schedule_id, scheduled_for);

create table if not exists public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  contact_name text not null,
  phone_number text not null,
  relationship text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists emergency_contacts_user_idx on public.emergency_contacts (user_id);

create table if not exists public.caregiver_relationships (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  caregiver_user_id uuid references auth.users (id) on delete cascade,
  caregiver_email text not null,
  relationship_name text,
  can_view_medications boolean not null default true,
  can_view_adherence boolean not null default true,
  can_view_missed_doses boolean not null default true,
  receive_missed_dose_alerts boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'revoked')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
create index if not exists caregiver_owner_idx on public.caregiver_relationships (owner_user_id);
create index if not exists caregiver_caregiver_idx on public.caregiver_relationships (caregiver_user_id);
-- one live invitation / relationship per owner + caregiver email (app expects error 23505)
create unique index if not exists caregiver_unique_live
  on public.caregiver_relationships (owner_user_id, lower(caregiver_email))
  where status in ('pending', 'accepted');

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic text not null default 'General',
  content text not null check (char_length(content) between 1 and 2000),
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists community_posts_created_idx on public.community_posts (created_at desc);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists community_comments_post_idx on public.community_comments (post_id, created_at);

create table if not exists public.community_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reason text,
  details text,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);


-- ----------------------------------------------------------------------------
-- 2. Sign-up automation: profile + notification settings for every new account
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;

  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'medications', 'notification_preferences', 'community_posts', 'community_comments'] loop
    execute format('drop trigger if exists trg_touch_%1$s on public.%1$s', t);
    execute format('create trigger trg_touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;


-- ----------------------------------------------------------------------------
-- 3. Row Level Security
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.medications enable row level security;
alter table public.medication_schedules enable row level security;
alter table public.dose_logs enable row level security;
alter table public.emergency_contacts enable row level security;
alter table public.caregiver_relationships enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_likes enable row level security;
alter table public.community_reports enable row level security;

-- profiles: you see and edit only yourself (names for Community come from get_community_authors)
drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own" on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- private per-member tables
do $$
declare t text;
begin
  foreach t in array array['notification_preferences', 'medications', 'medication_schedules', 'dose_logs', 'emergency_contacts'] loop
    execute format('drop policy if exists "%1$s own rows" on public.%1$s', t);
    execute format(
      'create policy "%1$s own rows" on public.%1$s for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t);
  end loop;
end $$;

-- a medication / schedule / dose log may only point at the member's own medication
create or replace function public.enforce_own_medication()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.medications m where m.id = new.medication_id and m.user_id = new.user_id) then
    raise exception 'Medication does not belong to this user.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_schedule_own_medication on public.medication_schedules;
create trigger trg_schedule_own_medication before insert on public.medication_schedules
  for each row execute function public.enforce_own_medication();
drop trigger if exists trg_dose_log_own_medication on public.dose_logs;
create trigger trg_dose_log_own_medication before insert on public.dose_logs
  for each row execute function public.enforce_own_medication();

-- caregiver relationships
drop policy if exists "caregiver select" on public.caregiver_relationships;
create policy "caregiver select" on public.caregiver_relationships for select to authenticated
  using (owner_user_id = auth.uid() or caregiver_user_id = auth.uid());

drop policy if exists "caregiver owner insert" on public.caregiver_relationships;
create policy "caregiver owner insert" on public.caregiver_relationships for insert to authenticated
  with check (owner_user_id = auth.uid() and status = 'pending' and caregiver_user_id is null);

drop policy if exists "caregiver owner update" on public.caregiver_relationships;
create policy "caregiver owner update" on public.caregiver_relationships for update to authenticated
  using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

-- Owners may edit permissions or revoke, but cannot accept on the caregiver's behalf
-- or re-point the invitation. Only the SECURITY DEFINER functions below can do that.
create or replace function public.guard_caregiver_relationship()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('app.caregiver_rpc', true), '') = 'on' then
    return new;
  end if;

  if new.owner_user_id is distinct from old.owner_user_id
     or new.caregiver_user_id is distinct from old.caregiver_user_id
     or lower(new.caregiver_email) is distinct from lower(old.caregiver_email) then
    raise exception 'The caregiver cannot be changed. Cancel the invitation and send a new one.'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status and new.status not in ('revoked') then
    raise exception 'Only the invited caregiver can accept or decline.' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_caregiver_relationship on public.caregiver_relationships;
create trigger trg_guard_caregiver_relationship before update on public.caregiver_relationships
  for each row execute function public.guard_caregiver_relationship();

-- community: members read everything, write only their own
drop policy if exists "posts read" on public.community_posts;
create policy "posts read" on public.community_posts for select to authenticated using (true);
drop policy if exists "posts insert own" on public.community_posts;
create policy "posts insert own" on public.community_posts for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "posts update own" on public.community_posts;
create policy "posts update own" on public.community_posts for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "posts delete own" on public.community_posts;
create policy "posts delete own" on public.community_posts for delete to authenticated using (user_id = auth.uid());

drop policy if exists "comments read" on public.community_comments;
create policy "comments read" on public.community_comments for select to authenticated using (true);
drop policy if exists "comments insert own" on public.community_comments;
create policy "comments insert own" on public.community_comments for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "comments update own" on public.community_comments;
create policy "comments update own" on public.community_comments for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "comments delete own" on public.community_comments;
create policy "comments delete own" on public.community_comments for delete to authenticated using (user_id = auth.uid());

drop policy if exists "likes read" on public.community_likes;
create policy "likes read" on public.community_likes for select to authenticated using (true);
drop policy if exists "likes insert own" on public.community_likes;
create policy "likes insert own" on public.community_likes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "likes delete own" on public.community_likes;
create policy "likes delete own" on public.community_likes for delete to authenticated using (user_id = auth.uid());

-- reports: members can file a report and see only their own
drop policy if exists "reports insert own" on public.community_reports;
create policy "reports insert own" on public.community_reports for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "reports select own" on public.community_reports;
create policy "reports select own" on public.community_reports for select to authenticated using (user_id = auth.uid());


-- ----------------------------------------------------------------------------
-- 4. Table privileges for the API roles (RLS above does the real filtering)
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;


-- ----------------------------------------------------------------------------
-- 5. Functions called by the app
-- ----------------------------------------------------------------------------

-- 5.1 Missed doses ----------------------------------------------------------------------
create or replace function public.record_missed_dose(
  p_medication_id uuid,
  p_schedule_id uuid,
  p_scheduled_for timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not signed in.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.medications where id = p_medication_id and user_id = v_user) then
    raise exception 'Medication not found.' using errcode = '42501';
  end if;

  -- already taken / skipped / missed for this slot?
  if exists (
    select 1 from public.dose_logs
    where user_id = v_user
      and schedule_id = p_schedule_id
      and scheduled_for between p_scheduled_for - interval '12 hours' and p_scheduled_for + interval '12 hours'
  ) then
    return false;
  end if;

  insert into public.dose_logs (user_id, medication_id, schedule_id, scheduled_for, status)
  values (v_user, p_medication_id, p_schedule_id, p_scheduled_for, 'missed');

  return true;
end;
$$;

-- 5.2 Edit a medication and its dose times in one step -------------------------------------
create or replace function public.update_medication_with_schedule(
  p_medication_id uuid,
  p_name text,
  p_dosage text,
  p_medication_form text,
  p_instructions text,
  p_current_quantity numeric,
  p_frequency text,
  p_dose_times text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_time time;
  v_times time[] := '{}';
begin
  if v_user is null then
    raise exception 'Not signed in.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.medications where id = p_medication_id and user_id = v_user) then
    raise exception 'Medication not found.' using errcode = '42501';
  end if;

  if p_dose_times is null or array_length(p_dose_times, 1) is null then
    raise exception 'At least one dose time is required.';
  end if;

  foreach v_time in array (select array_agg(t::time) from unnest(p_dose_times) as t) loop
    if not (v_time = any (v_times)) then
      v_times := v_times || v_time;
    end if;
  end loop;

  update public.medications
     set name = p_name,
         dosage = p_dosage,
         medication_form = p_medication_form,
         instructions = p_instructions,
         current_quantity = p_current_quantity,
         updated_at = now()
   where id = p_medication_id and user_id = v_user;

  -- retire schedules that were removed (history stays attached to them)
  update public.medication_schedules
     set is_active = false
   where medication_id = p_medication_id and user_id = v_user and is_active
     and not (dose_time = any (v_times));

  -- keep matching schedules, refreshing frequency
  update public.medication_schedules
     set frequency = p_frequency
   where medication_id = p_medication_id and user_id = v_user and is_active;

  -- add the new times
  foreach v_time in array v_times loop
    if not exists (
      select 1 from public.medication_schedules
      where medication_id = p_medication_id and user_id = v_user and is_active and dose_time = v_time
    ) then
      insert into public.medication_schedules (medication_id, user_id, frequency, dose_time, is_active)
      values (p_medication_id, v_user, p_frequency, v_time, true);
    end if;
  end loop;
end;
$$;

-- 5.3 Caregivers -------------------------------------------------------------------------------
create or replace function public.claim_caregiver_invitations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_email text;
  v_count integer;
begin
  if v_user is null then
    return 0;
  end if;

  select email into v_email from auth.users where id = v_user;

  perform set_config('app.caregiver_rpc', 'on', true);

  update public.caregiver_relationships
     set caregiver_user_id = v_user
   where caregiver_user_id is null
     and lower(caregiver_email) = lower(v_email)
     and status = 'pending';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.respond_to_caregiver_invitation(
  p_relationship_id uuid,
  p_accept boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.caregiver_rpc', 'on', true);

  update public.caregiver_relationships
     set status = case when p_accept then 'accepted' else 'declined' end,
         responded_at = now()
   where id = p_relationship_id
     and caregiver_user_id = auth.uid()
     and status = 'pending';

  if not found then
    raise exception 'This invitation is no longer available.';
  end if;
end;
$$;

-- internal: returns the relationship if the caller is its accepted caregiver
create or replace function public.caregiver_access(p_relationship_id uuid)
returns public.caregiver_relationships
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rel public.caregiver_relationships;
begin
  select * into v_rel
  from public.caregiver_relationships
  where id = p_relationship_id
    and caregiver_user_id = auth.uid()
    and status = 'accepted';

  if not found then
    raise exception 'You do not have access to this caregiver profile.' using errcode = '42501';
  end if;

  return v_rel;
end;
$$;

create or replace function public.get_caregiver_patient_summary(p_relationship_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rel public.caregiver_relationships := public.caregiver_access(p_relationship_id);
  v_name text;
  v_active bigint := 0;
  v_taken bigint := 0;
  v_total bigint := 0;
  v_missed bigint := 0;
begin
  select coalesce(nullif(full_name, ''), 'MedTrack user') into v_name
  from public.profiles where id = v_rel.owner_user_id;

  if v_rel.can_view_medications then
    select count(*) into v_active from public.medications
    where user_id = v_rel.owner_user_id and is_active;
  end if;

  if v_rel.can_view_adherence then
    select count(*) filter (where status = 'taken'), count(*)
      into v_taken, v_total
    from public.dose_logs
    where user_id = v_rel.owner_user_id and scheduled_for >= now() - interval '30 days';
  end if;

  if v_rel.can_view_missed_doses then
    select count(*) into v_missed from public.dose_logs
    where user_id = v_rel.owner_user_id and status = 'missed'
      and scheduled_for >= now() - interval '30 days';
  end if;

  return jsonb_build_object(
    'relationship_id', v_rel.id,
    'owner_name', coalesce(v_name, 'MedTrack user'),
    'relationship_name', v_rel.relationship_name,
    'permissions', jsonb_build_object(
      'can_view_medications', v_rel.can_view_medications,
      'can_view_adherence', v_rel.can_view_adherence,
      'can_view_missed_doses', v_rel.can_view_missed_doses,
      'receive_missed_dose_alerts', v_rel.receive_missed_dose_alerts
    ),
    'stats', jsonb_build_object(
      'active_medications', v_active,
      'adherence', case when v_total = 0 then 0 else round(100.0 * v_taken / v_total) end,
      'missed_doses', v_missed
    )
  );
end;
$$;

create or replace function public.get_caregiver_medications(p_relationship_id uuid)
returns table (
  id uuid,
  name text,
  dosage text,
  medication_form text,
  instructions text,
  current_quantity numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rel public.caregiver_relationships := public.caregiver_access(p_relationship_id);
begin
  if not v_rel.can_view_medications then
    raise exception 'The medication owner has not allowed you to view medications.' using errcode = '42501';
  end if;

  return query
  select m.id, m.name, m.dosage, m.medication_form, m.instructions, m.current_quantity
  from public.medications m
  where m.user_id = v_rel.owner_user_id and m.is_active
  order by m.name;
end;
$$;

create or replace function public.get_caregiver_adherence_history(
  p_relationship_id uuid,
  p_days integer default 30
)
returns table (
  dose_log_id uuid,
  medication_name text,
  dosage text,
  scheduled_for timestamptz,
  status text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rel public.caregiver_relationships := public.caregiver_access(p_relationship_id);
begin
  if not v_rel.can_view_adherence then
    raise exception 'The medication owner has not allowed you to view adherence.' using errcode = '42501';
  end if;

  return query
  select l.id, m.name, m.dosage, l.scheduled_for, l.status
  from public.dose_logs l
  join public.medications m on m.id = l.medication_id
  where l.user_id = v_rel.owner_user_id
    and l.scheduled_for >= now() - make_interval(days => greatest(least(p_days, 365), 1))
  order by l.scheduled_for desc
  limit 300;
end;
$$;

create or replace function public.get_caregiver_missed_doses(
  p_relationship_id uuid,
  p_limit integer default 20
)
returns table (
  dose_log_id uuid,
  medication_name text,
  dosage text,
  scheduled_for timestamptz,
  status text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rel public.caregiver_relationships := public.caregiver_access(p_relationship_id);
begin
  if not v_rel.can_view_missed_doses then
    raise exception 'The medication owner has not allowed you to view missed doses.' using errcode = '42501';
  end if;

  return query
  select l.id, m.name, m.dosage, l.scheduled_for, l.status
  from public.dose_logs l
  join public.medications m on m.id = l.medication_id
  where l.user_id = v_rel.owner_user_id and l.status = 'missed'
  order by l.scheduled_for desc
  limit greatest(least(p_limit, 100), 1);
end;
$$;

-- permissions: signed-in members only
do $$
declare fn text;
begin
  foreach fn in array array[
    'record_missed_dose(uuid,uuid,timestamptz)',
    'update_medication_with_schedule(uuid,text,text,text,text,numeric,text,text[])',
    'claim_caregiver_invitations()',
    'respond_to_caregiver_invitation(uuid,boolean)',
    'get_caregiver_patient_summary(uuid)',
    'get_caregiver_medications(uuid)',
    'get_caregiver_adherence_history(uuid,integer)',
    'get_caregiver_missed_doses(uuid,integer)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;

  revoke all on function public.caregiver_access(uuid) from public, anon, authenticated;
  revoke all on function public.handle_new_user() from public, anon, authenticated;
end $$;


-- ============================================================================
-- MedTrack  -  ADMIN SETUP
-- ----------------------------------------------------------------------------
-- Run this ONCE in the Supabase dashboard:  SQL Editor -> New query -> paste -> Run
-- It is safe to run again (everything is idempotent) and it only ADDS things:
-- it never drops your existing tables, columns or policies.
--
-- What it adds
--   * profiles.role / is_suspended / suspended_at / suspended_reason
--   * a guard so normal users can NEVER make themselves admin or un-suspend themselves
--   * app_logs  - activity + admin audit log (signups, posts, comments, reports, admin actions)
--   * community_reports.status etc. so reports can be reviewed
--   * admin_* functions used by the Admin screens in the app (all check is_admin())
--   * get_community_authors() so member names show in Community
--   * restrictive policies so suspended users cannot post / comment / like / report
--
-- After running, make yourself the first admin (replace the email):
--   update public.profiles set role = 'admin' where email = 'you@example.com';
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Columns
-- ----------------------------------------------------------------------------
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles add column if not exists is_suspended boolean not null default false;
alter table public.profiles add column if not exists suspended_at timestamptz;
alter table public.profiles add column if not exists suspended_reason text;
-- created_at: backfill existing members from their real sign-up date (not "now")
alter table public.profiles add column if not exists created_at timestamptz;
update public.profiles p set created_at = u.created_at
  from auth.users u where u.id = p.id and p.created_at is null;
update public.profiles set created_at = now() where created_at is null;
alter table public.profiles alter column created_at set default now();
alter table public.profiles alter column created_at set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_role_check') then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('user', 'admin'));
  end if;
end $$;

alter table public.community_reports add column if not exists id uuid default gen_random_uuid();
alter table public.community_reports add column if not exists created_at timestamptz not null default now();
alter table public.community_reports add column if not exists status text not null default 'open';
alter table public.community_reports add column if not exists resolved_by uuid;
alter table public.community_reports add column if not exists resolved_at timestamptz;
alter table public.community_reports add column if not exists resolution text;


-- ----------------------------------------------------------------------------
-- 2. Helper functions used by policies and RPCs
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and not is_suspended
  );
$$;

create or replace function public.current_user_is_suspended()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_suspended from public.profiles where id = auth.uid()), false);
$$;


-- ----------------------------------------------------------------------------
-- 3. Guard: only admins (or the SQL editor / service role) may change privileged columns
-- ----------------------------------------------------------------------------
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null and not public.is_admin() then
      new.role := 'user';
      new.is_suspended := false;
      new.suspended_at := null;
      new.suspended_reason := null;
    end if;
    return new;
  end if;

  if (new.role is distinct from old.role
      or new.is_suspended is distinct from old.is_suspended
      or new.suspended_at is distinct from old.suspended_at
      or new.suspended_reason is distinct from old.suspended_reason) then
    if auth.uid() is not null and not public.is_admin() then
      raise exception 'You are not allowed to change role or suspension status.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_profile_privileged_columns on public.profiles;
create trigger trg_protect_profile_privileged_columns
  before insert or update on public.profiles
  for each row execute function public.protect_profile_privileged_columns();


-- ----------------------------------------------------------------------------
-- 4. Activity / audit log
-- ----------------------------------------------------------------------------
create table if not exists public.app_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  category text not null,          -- 'account' | 'community' | 'admin' | 'system'
  event text not null,             -- e.g. 'signup', 'post_created', 'user_suspended'
  actor_id uuid,
  actor_label text,
  target_type text,
  target_id text,
  message text,
  details jsonb not null default '{}'::jsonb
);

create index if not exists app_logs_created_at_idx on public.app_logs (created_at desc);
create index if not exists app_logs_category_idx on public.app_logs (category, created_at desc);

alter table public.app_logs enable row level security;

drop policy if exists "admins can read logs" on public.app_logs;
create policy "admins can read logs" on public.app_logs
  for select to authenticated using (public.is_admin());
-- No insert/update/delete policies: rows are written only by the trigger/RPC functions below.

create or replace function public.write_log(
  p_category text,
  p_event text,
  p_actor_id uuid,
  p_target_type text,
  p_target_id text,
  p_message text,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label text;
begin
  if p_actor_id is not null then
    select coalesce(nullif(email, ''), nullif(full_name, ''), p_actor_id::text)
      into v_label from public.profiles where id = p_actor_id;
  end if;

  insert into public.app_logs (category, event, actor_id, actor_label, target_type, target_id, message, details)
  values (p_category, p_event, p_actor_id, v_label, p_target_type, p_target_id, p_message, coalesce(p_details, '{}'::jsonb));
end;
$$;

-- Triggers that record normal activity ------------------------------------------------
create or replace function public.log_profile_signup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.app_logs (category, event, actor_id, actor_label, target_type, target_id, message)
  values ('account', 'signup', new.id, coalesce(nullif(new.email, ''), new.full_name, new.id::text),
          'user', new.id::text, 'New account created');
  return new;
end;
$$;

drop trigger if exists trg_log_profile_signup on public.profiles;
create trigger trg_log_profile_signup
  after insert on public.profiles
  for each row execute function public.log_profile_signup();

create or replace function public.log_post_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.write_log('community', 'post_created', new.user_id, 'post', new.id::text,
    'Posted in ' || coalesce(new.topic::text, 'General') || ': ' || left(new.content, 80),
    jsonb_build_object('anonymous', new.is_anonymous));
  return new;
end;
$$;

drop trigger if exists trg_log_post_created on public.community_posts;
create trigger trg_log_post_created
  after insert on public.community_posts
  for each row execute function public.log_post_created();

create or replace function public.log_comment_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.write_log('community', 'comment_created', new.user_id, 'comment', new.id::text,
    'Commented: ' || left(new.content, 80),
    jsonb_build_object('post_id', new.post_id::text, 'anonymous', new.is_anonymous));
  return new;
end;
$$;

drop trigger if exists trg_log_comment_created on public.community_comments;
create trigger trg_log_comment_created
  after insert on public.community_comments
  for each row execute function public.log_comment_created();

create or replace function public.log_report_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.write_log('community', 'report_filed', new.user_id, 'post', new.post_id::text,
    'Post reported: ' || coalesce(new.reason, 'no reason'),
    jsonb_build_object('details', new.details));
  return new;
end;
$$;

drop trigger if exists trg_log_report_created on public.community_reports;
create trigger trg_log_report_created
  after insert on public.community_reports
  for each row execute function public.log_report_created();


-- ----------------------------------------------------------------------------
-- 5. Suspended users cannot take part in the community
-- ----------------------------------------------------------------------------
drop policy if exists "suspended users cannot post" on public.community_posts;
create policy "suspended users cannot post" on public.community_posts
  as restrictive for insert to authenticated
  with check (not public.current_user_is_suspended());

drop policy if exists "suspended users cannot comment" on public.community_comments;
create policy "suspended users cannot comment" on public.community_comments
  as restrictive for insert to authenticated
  with check (not public.current_user_is_suspended());

drop policy if exists "suspended users cannot like" on public.community_likes;
create policy "suspended users cannot like" on public.community_likes
  as restrictive for insert to authenticated
  with check (not public.current_user_is_suspended());

drop policy if exists "suspended users cannot report" on public.community_reports;
create policy "suspended users cannot report" on public.community_reports
  as restrictive for insert to authenticated
  with check (not public.current_user_is_suspended());


-- ----------------------------------------------------------------------------
-- 6. Member names for Community (only id + full_name are exposed)
-- ----------------------------------------------------------------------------
create or replace function public.get_community_authors(p_user_ids uuid[])
returns table (id uuid, full_name text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name
  from public.profiles p
  where p.id = any (p_user_ids)
    and auth.uid() is not null;
$$;


-- ----------------------------------------------------------------------------
-- 7. Admin RPCs  (every one starts with the same admin check)
-- ----------------------------------------------------------------------------
create or replace function public.require_admin()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
end;
$$;

-- 7.1 Dashboard numbers -----------------------------------------------------------------
create or replace function public.admin_get_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_taken bigint;
  v_missed bigint;
  v_total bigint;
begin
  perform public.require_admin();

  select count(*) filter (where status = 'taken'),
         count(*) filter (where status = 'missed'),
         count(*)
    into v_taken, v_missed, v_total
  from public.dose_logs
  where scheduled_for >= now() - interval '7 days';

  return jsonb_build_object(
    'total_users',        (select count(*) from public.profiles),
    'new_users_7d',       (select count(*) from public.profiles where created_at >= now() - interval '7 days'),
    'admins',             (select count(*) from public.profiles where role = 'admin'),
    'suspended_users',    (select count(*) from public.profiles where is_suspended),
    'active_medications', (select count(*) from public.medications where is_active),
    'doses_taken_7d',     v_taken,
    'doses_missed_7d',    v_missed,
    'adherence_7d',       case when v_total = 0 then null else round(100.0 * v_taken / v_total) end,
    'posts_total',        (select count(*) from public.community_posts),
    'posts_7d',           (select count(*) from public.community_posts where created_at >= now() - interval '7 days'),
    'comments_7d',        (select count(*) from public.community_comments where created_at >= now() - interval '7 days'),
    'open_reports',       (select count(*) from public.community_reports where status = 'open'),
    'logs_24h',           (select count(*) from public.app_logs where created_at >= now() - interval '24 hours')
  );
end;
$$;

-- 7.2 Users ----------------------------------------------------------------------------
create or replace function public.admin_list_users(
  p_search text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  full_name text,
  email text,
  role text,
  is_suspended boolean,
  suspended_reason text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  medication_count bigint,
  post_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.require_admin();

  return query
  select
    p.id,
    p.full_name,
    coalesce(nullif(p.email, ''), u.email::text) as email,
    p.role,
    p.is_suspended,
    p.suspended_reason,
    coalesce(p.created_at, u.created_at) as created_at,
    u.last_sign_in_at,
    (select count(*) from public.medications m where m.user_id = p.id and m.is_active) as medication_count,
    (select count(*) from public.community_posts cp where cp.user_id = p.id) as post_count
  from public.profiles p
  left join auth.users u on u.id = p.id
  where p_search is null
     or p_search = ''
     or p.full_name ilike '%' || p_search || '%'
     or coalesce(p.email, u.email::text) ilike '%' || p_search || '%'
  order by coalesce(p.created_at, u.created_at) desc
  limit greatest(least(p_limit, 200), 1)
  offset greatest(p_offset, 0);
end;
$$;

create or replace function public.admin_set_user_suspended(
  p_user_id uuid,
  p_suspended boolean,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target public.profiles%rowtype;
begin
  perform public.require_admin();

  if p_user_id = auth.uid() then
    raise exception 'You cannot suspend your own account.';
  end if;

  select * into v_target from public.profiles where id = p_user_id;

  if not found then
    raise exception 'User not found.';
  end if;

  if v_target.role = 'admin' and p_suspended then
    raise exception 'Demote this admin to a normal user before suspending them.';
  end if;

  update public.profiles
     set is_suspended = p_suspended,
         suspended_at = case when p_suspended then now() else null end,
         suspended_reason = case when p_suspended then nullif(trim(p_reason), '') else null end
   where id = p_user_id;

  perform public.write_log(
    'admin',
    case when p_suspended then 'user_suspended' else 'user_restored' end,
    auth.uid(), 'user', p_user_id::text,
    case when p_suspended then 'Suspended ' else 'Restored ' end || coalesce(v_target.email, v_target.full_name, p_user_id::text),
    jsonb_build_object('reason', p_reason)
  );
end;
$$;

create or replace function public.admin_set_user_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target public.profiles%rowtype;
begin
  perform public.require_admin();

  if p_role not in ('user', 'admin') then
    raise exception 'Invalid role.';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'You cannot change your own role.';
  end if;

  select * into v_target from public.profiles where id = p_user_id;

  if not found then
    raise exception 'User not found.';
  end if;

  update public.profiles set role = p_role where id = p_user_id;

  perform public.write_log(
    'admin', 'role_changed', auth.uid(), 'user', p_user_id::text,
    'Set role of ' || coalesce(v_target.email, v_target.full_name, p_user_id::text) || ' to ' || p_role,
    jsonb_build_object('from', v_target.role, 'to', p_role)
  );
end;
$$;

-- 7.3 Community moderation ---------------------------------------------------------------
create or replace function public.admin_list_posts(
  p_search text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  post_id text,
  topic text,
  content text,
  is_anonymous boolean,
  created_at timestamptz,
  author_id uuid,
  author_name text,
  author_email text,
  author_suspended boolean,
  like_count bigint,
  comment_count bigint,
  report_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.require_admin();

  return query
  select
    cp.id::text,
    cp.topic::text,
    cp.content,
    cp.is_anonymous,
    cp.created_at,
    cp.user_id,
    p.full_name,
    coalesce(nullif(p.email, ''), u.email::text),
    coalesce(p.is_suspended, false),
    (select count(*) from public.community_likes l where l.post_id = cp.id),
    (select count(*) from public.community_comments c where c.post_id = cp.id),
    (select count(*) from public.community_reports r where r.post_id = cp.id)
  from public.community_posts cp
  left join public.profiles p on p.id = cp.user_id
  left join auth.users u on u.id = cp.user_id
  where p_search is null
     or p_search = ''
     or cp.content ilike '%' || p_search || '%'
     or p.full_name ilike '%' || p_search || '%'
  order by cp.created_at desc
  limit greatest(least(p_limit, 200), 1)
  offset greatest(p_offset, 0);
end;
$$;

create or replace function public.admin_list_comments(p_post_id text)
returns table (
  comment_id text,
  content text,
  is_anonymous boolean,
  created_at timestamptz,
  author_id uuid,
  author_name text,
  author_email text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.require_admin();

  return query
  select c.id::text, c.content, c.is_anonymous, c.created_at, c.user_id,
         p.full_name, coalesce(nullif(p.email, ''), u.email::text)
  from public.community_comments c
  left join public.profiles p on p.id = c.user_id
  left join auth.users u on u.id = c.user_id
  where c.post_id::text = p_post_id
  order by c.created_at asc;
end;
$$;

create or replace function public.admin_list_reports(p_status text default 'open')
returns table (
  report_id text,
  created_at timestamptz,
  status text,
  reason text,
  details text,
  reporter_id uuid,
  reporter_name text,
  post_id text,
  post_content text,
  post_topic text,
  post_author_id uuid,
  post_author_name text,
  post_author_email text,
  post_author_suspended boolean,
  reports_on_post bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.require_admin();

  return query
  select
    r.id::text,
    r.created_at,
    r.status,
    r.reason,
    r.details,
    r.user_id,
    rp.full_name,
    r.post_id::text,
    cp.content,
    cp.topic::text,
    cp.user_id,
    ap.full_name,
    coalesce(nullif(ap.email, ''), au.email::text),
    coalesce(ap.is_suspended, false),
    (select count(*) from public.community_reports r2 where r2.post_id = r.post_id)
  from public.community_reports r
  left join public.community_posts cp on cp.id = r.post_id
  left join public.profiles rp on rp.id = r.user_id
  left join public.profiles ap on ap.id = cp.user_id
  left join auth.users au on au.id = cp.user_id
  where p_status is null or p_status = 'all' or r.status = p_status
  order by r.created_at desc
  limit 200;
end;
$$;

-- Internal: remove a post and everything attached to it, with a log entry.
create or replace function public.admin_remove_post_internal(p_post_id text, p_reason text, p_event text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post public.community_posts%rowtype;
begin
  select * into v_post from public.community_posts where id::text = p_post_id;

  if not found then
    raise exception 'Post not found (it may already have been removed).';
  end if;

  perform public.write_log(
    'admin', p_event, auth.uid(), 'post', p_post_id,
    'Removed post by ' || coalesce((select coalesce(email, full_name) from public.profiles where id = v_post.user_id), v_post.user_id::text)
      || ': ' || left(v_post.content, 80),
    jsonb_build_object('reason', p_reason, 'author_id', v_post.user_id, 'content', left(v_post.content, 500))
  );

  delete from public.community_likes where post_id = v_post.id;
  delete from public.community_comments where post_id = v_post.id;
  delete from public.community_reports where post_id = v_post.id;
  delete from public.community_posts where id = v_post.id;

  return v_post.user_id;
end;
$$;

create or replace function public.admin_delete_post(p_post_id text, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin();
  perform public.admin_remove_post_internal(p_post_id, p_reason, 'post_removed');
end;
$$;

create or replace function public.admin_delete_comment(p_comment_id text, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comment public.community_comments%rowtype;
begin
  perform public.require_admin();

  select * into v_comment from public.community_comments where id::text = p_comment_id;

  if not found then
    raise exception 'Comment not found (it may already have been removed).';
  end if;

  perform public.write_log(
    'admin', 'comment_removed', auth.uid(), 'comment', p_comment_id,
    'Removed comment: ' || left(v_comment.content, 80),
    jsonb_build_object('reason', p_reason, 'author_id', v_comment.user_id)
  );

  delete from public.community_comments where id = v_comment.id;
end;
$$;

-- p_action: 'dismiss' | 'remove_post' | 'remove_post_and_suspend'
create or replace function public.admin_resolve_report(
  p_report_id text,
  p_action text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report public.community_reports%rowtype;
  v_author uuid;
begin
  perform public.require_admin();

  if p_action not in ('dismiss', 'remove_post', 'remove_post_and_suspend') then
    raise exception 'Unknown action.';
  end if;

  select * into v_report from public.community_reports where id::text = p_report_id;

  if not found then
    raise exception 'Report not found (it may already have been handled).';
  end if;

  if p_action = 'dismiss' then
    update public.community_reports
       set status = 'dismissed', resolved_by = auth.uid(), resolved_at = now(), resolution = p_note
     where post_id = v_report.post_id and status = 'open';

    perform public.write_log('admin', 'report_dismissed', auth.uid(), 'post', v_report.post_id::text,
      'Dismissed report(s): ' || coalesce(v_report.reason, ''), jsonb_build_object('note', p_note));
    return;
  end if;

  v_author := public.admin_remove_post_internal(v_report.post_id::text, coalesce(p_note, v_report.reason), 'post_removed_via_report');

  if p_action = 'remove_post_and_suspend' and v_author is not null then
    if v_author = auth.uid() then
      raise exception 'You cannot suspend your own account.';
    end if;

    if (select role from public.profiles where id = v_author) = 'admin' then
      raise exception 'The author is an admin. Demote them first.';
    end if;

    update public.profiles
       set is_suspended = true, suspended_at = now(),
           suspended_reason = coalesce(nullif(trim(p_note), ''), 'Violation of community guidelines')
     where id = v_author;

    perform public.write_log('admin', 'user_suspended', auth.uid(), 'user', v_author::text,
      'Suspended author after report', jsonb_build_object('reason', p_note));
  end if;
end;
$$;

-- 7.4 Logs ---------------------------------------------------------------------------------
create or replace function public.admin_list_logs(
  p_category text default null,
  p_limit int default 100,
  p_before timestamptz default null
)
returns table (
  id uuid,
  created_at timestamptz,
  category text,
  event text,
  actor_id uuid,
  actor_label text,
  target_type text,
  target_id text,
  message text,
  details jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.require_admin();

  return query
  select l.id, l.created_at, l.category, l.event, l.actor_id, l.actor_label,
         l.target_type, l.target_id, l.message, l.details
  from public.app_logs l
  where (p_category is null or p_category = 'all' or l.category = p_category)
    and (p_before is null or l.created_at < p_before)
  order by l.created_at desc
  limit greatest(least(p_limit, 300), 1);
end;
$$;


-- ----------------------------------------------------------------------------
-- 8. Permissions: only signed-in users may call these; the admin check does the rest
-- ----------------------------------------------------------------------------
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'is_admin()',
    'current_user_is_suspended()',
    'get_community_authors(uuid[])',
    'require_admin()',
    'admin_get_stats()',
    'admin_list_users(text,int,int)',
    'admin_set_user_suspended(uuid,boolean,text)',
    'admin_set_user_role(uuid,text)',
    'admin_list_posts(text,int,int)',
    'admin_list_comments(text)',
    'admin_list_reports(text)',
    'admin_delete_post(text,text)',
    'admin_delete_comment(text,text)',
    'admin_resolve_report(text,text,text)',
    'admin_list_logs(text,int,timestamptz)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;

  -- internal helpers: not callable from the app at all
  revoke all on function public.write_log(text,text,uuid,text,text,text,jsonb) from public, anon, authenticated;
  revoke all on function public.admin_remove_post_internal(text,text,text) from public, anon, authenticated;
end $$;

-- Done.  Now promote yourself:
--   update public.profiles set role = 'admin' where email = 'you@example.com';
