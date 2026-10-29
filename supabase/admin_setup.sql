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
