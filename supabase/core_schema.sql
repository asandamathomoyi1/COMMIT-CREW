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
