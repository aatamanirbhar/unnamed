create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'question_status') then
    create type public.question_status as enum ('open', 'sealed');
  end if;

  if not exists (select 1 from pg_type where typname = 'vote_choice') then
    create type public.vote_choice as enum ('yes', 'no');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]{8,40}$'),
  question_text text not null check (char_length(question_text) between 3 and 240),
  response_limit integer not null default 7 check (response_limit between 1 and 250),
  status public.question_status not null default 'open',
  visit_count integer not null default 0 check (visit_count >= 0),
  view_count integer not null default 0 check (view_count >= 0),
  created_at timestamptz not null default now(),
  sealed_at timestamptz,
  results_email_sent_at timestamptz
);

create table if not exists public.question_visits (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  visitor_key_hash text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (question_id, visitor_key_hash)
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  visitor_key_hash text not null,
  choice public.vote_choice not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (question_id, visitor_key_hash)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  visitor_key_hash text not null,
  body text not null check (char_length(body) between 1 and 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (question_id, visitor_key_hash)
);

create table if not exists public.machine_signs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  question_text text not null check (char_length(question_text) between 3 and 240),
  answer public.vote_choice not null,
  created_at timestamptz not null default now()
);

create index if not exists questions_owner_id_idx on public.questions(owner_id);
create index if not exists questions_slug_idx on public.questions(slug);
create index if not exists question_visits_question_id_idx on public.question_visits(question_id);
create index if not exists votes_question_id_idx on public.votes(question_id);
create index if not exists messages_question_id_created_at_idx on public.messages(question_id, created_at desc);
create index if not exists machine_signs_owner_id_idx on public.machine_signs(owner_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_profiles_updated_at on public.profiles;
create trigger touch_profiles_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists touch_votes_updated_at on public.votes;
create trigger touch_votes_updated_at
before update on public.votes
for each row execute function public.touch_updated_at();

drop trigger if exists touch_messages_updated_at on public.messages;
create trigger touch_messages_updated_at
before update on public.messages
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update on auth.users
for each row execute function public.handle_new_user();

create or replace function public.hash_visitor_key(p_visitor_key text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select encode(digest(coalesce(p_visitor_key, ''), 'sha256'), 'hex')
$$;

create or replace function public.claim_question_visit(p_slug text, p_visitor_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.questions%rowtype;
  owner_profile public.profiles%rowtype;
  v_hash text;
  has_slot boolean := false;
  remaining integer := 0;
begin
  if p_visitor_key is null or char_length(p_visitor_key) < 8 or char_length(p_visitor_key) > 180 then
    return jsonb_build_object('found', false, 'message', 'Invalid visitor key.');
  end if;

  v_hash := public.hash_visitor_key(p_visitor_key);

  select * into q
  from public.questions
  where slug = p_slug
  for update;

  if not found then
    return jsonb_build_object('found', false);
  end if;

  update public.questions
  set view_count = view_count + 1
  where id = q.id
  returning * into q;

  select exists (
    select 1
    from public.question_visits
    where question_id = q.id and visitor_key_hash = v_hash
  ) into has_slot;

  if has_slot then
    update public.question_visits
    set last_seen_at = now()
    where question_id = q.id and visitor_key_hash = v_hash;
  end if;

  if q.results_email_sent_at is not null or ((q.status = 'sealed' or q.visit_count >= q.response_limit) and not has_slot) then
    select * into owner_profile from public.profiles where id = q.owner_id;

    return jsonb_build_object(
      'found', true,
      'expired', true,
      'canRespond', false,
      'ownerName', coalesce(owner_profile.display_name, 'Someone'),
      'question', jsonb_build_object(
        'id', q.id,
        'slug', q.slug,
        'questionText', q.question_text,
        'responseLimit', q.response_limit,
        'visitCount', q.visit_count,
        'viewCount', q.view_count,
        'status', q.status,
        'sealedAt', q.sealed_at
      )
    );
  end if;

  select * into owner_profile from public.profiles where id = q.owner_id;
  remaining := greatest(q.response_limit - q.visit_count, 0);

  return jsonb_build_object(
    'found', true,
    'expired', false,
    'canRespond', q.status = 'open' or has_slot,
    'alreadyClaimed', has_slot,
    'remainingSlots', remaining,
    'ownerName', coalesce(owner_profile.display_name, 'Someone'),
    'question', jsonb_build_object(
      'id', q.id,
      'slug', q.slug,
      'questionText', q.question_text,
      'responseLimit', q.response_limit,
      'visitCount', q.visit_count,
      'viewCount', q.view_count,
      'status', q.status,
      'sealedAt', q.sealed_at
    )
  );
end;
$$;

create or replace function public.submit_vote(
  p_slug text,
  p_visitor_key text,
  p_choice public.vote_choice
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.questions%rowtype;
  v_hash text;
  has_slot boolean;
  remaining integer := 0;
begin
  if p_visitor_key is null or char_length(p_visitor_key) < 8 or char_length(p_visitor_key) > 180 then
    return jsonb_build_object('status', 'invalid', 'message', 'Invalid visitor key.');
  end if;

  v_hash := public.hash_visitor_key(p_visitor_key);

  select * into q
  from public.questions
  where slug = p_slug
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found', 'message', 'This sign does not exist.');
  end if;

  select exists (
    select 1
    from public.question_visits
    where question_id = q.id and visitor_key_hash = v_hash
  ) into has_slot;

  if q.results_email_sent_at is not null then
    return jsonb_build_object(
      'status', 'finalized',
      'message', 'The final sign has already been sent.',
      'sealed', true,
      'remainingSlots', 0
    );
  end if;

  if not has_slot and (q.status <> 'open' or q.visit_count >= q.response_limit) then
    return jsonb_build_object(
      'status', 'expired',
      'message', 'This sign has already closed.',
      'sealed', true,
      'remainingSlots', 0
    );
  end if;

  if not has_slot then
    insert into public.question_visits (question_id, visitor_key_hash)
    values (q.id, v_hash);

    update public.questions
    set
      visit_count = visit_count + 1,
      status = case when visit_count + 1 >= response_limit then 'sealed'::public.question_status else status end,
      sealed_at = case when visit_count + 1 >= response_limit then coalesce(sealed_at, now()) else sealed_at end
    where id = q.id
    returning * into q;
  end if;

  insert into public.votes (question_id, visitor_key_hash, choice)
  values (q.id, v_hash, p_choice)
  on conflict (question_id, visitor_key_hash)
  do update set choice = excluded.choice, updated_at = now();

  remaining := greatest(q.response_limit - q.visit_count, 0);

  return jsonb_build_object(
    'status', 'ok',
    'message', 'Your vote was placed in the sky.',
    'sealed', q.status = 'sealed',
    'remainingSlots', remaining
  );
end;
$$;

create or replace function public.submit_message(
  p_slug text,
  p_visitor_key text,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.questions%rowtype;
  v_hash text;
  has_slot boolean;
  clean_body text;
  remaining integer := 0;
begin
  clean_body := trim(p_body);

  if clean_body is null or char_length(clean_body) < 1 or char_length(clean_body) > 280 then
    return jsonb_build_object('status', 'invalid', 'message', 'Message must be 1 to 280 characters.');
  end if;

  if p_visitor_key is null or char_length(p_visitor_key) < 8 or char_length(p_visitor_key) > 180 then
    return jsonb_build_object('status', 'invalid', 'message', 'Invalid visitor key.');
  end if;

  v_hash := public.hash_visitor_key(p_visitor_key);

  select * into q
  from public.questions
  where slug = p_slug
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found', 'message', 'This sign does not exist.');
  end if;

  select exists (
    select 1
    from public.question_visits
    where question_id = q.id and visitor_key_hash = v_hash
  ) into has_slot;

  if q.results_email_sent_at is not null then
    return jsonb_build_object(
      'status', 'finalized',
      'message', 'The final sign has already been sent.',
      'sealed', true,
      'remainingSlots', 0
    );
  end if;

  if not has_slot and (q.status <> 'open' or q.visit_count >= q.response_limit) then
    return jsonb_build_object(
      'status', 'expired',
      'message', 'This sign has already closed.',
      'sealed', true,
      'remainingSlots', 0
    );
  end if;

  if not has_slot then
    insert into public.question_visits (question_id, visitor_key_hash)
    values (q.id, v_hash);

    update public.questions
    set
      visit_count = visit_count + 1,
      status = case when visit_count + 1 >= response_limit then 'sealed'::public.question_status else status end,
      sealed_at = case when visit_count + 1 >= response_limit then coalesce(sealed_at, now()) else sealed_at end
    where id = q.id
    returning * into q;
  end if;

  insert into public.messages (question_id, visitor_key_hash, body)
  values (q.id, v_hash, clean_body)
  on conflict (question_id, visitor_key_hash)
  do update set body = excluded.body, updated_at = now();

  remaining := greatest(q.response_limit - q.visit_count, 0);

  return jsonb_build_object(
    'status', 'ok',
    'message', 'Your anonymous message was added.',
    'sealed', q.status = 'sealed',
    'remainingSlots', remaining
  );
end;
$$;

create or replace function public.get_public_messages(p_slug text, p_visitor_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.questions%rowtype;
  v_hash text;
  has_slot boolean;
  message_list jsonb;
begin
  v_hash := public.hash_visitor_key(p_visitor_key);

  select * into q
  from public.questions
  where slug = p_slug;

  if not found then
    return jsonb_build_object('found', false);
  end if;

  select exists (
    select 1
    from public.question_visits
    where question_id = q.id and visitor_key_hash = v_hash
  ) into has_slot;

  if (q.status = 'sealed' or q.visit_count >= q.response_limit or q.results_email_sent_at is not null) and not has_slot then
    return jsonb_build_object('found', true, 'expired', true, 'messages', '[]'::jsonb);
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'body', m.body,
        'createdAt', m.created_at
      )
      order by m.created_at desc
    ),
    '[]'::jsonb
  )
  into message_list
  from public.messages m
  where m.question_id = q.id;

  return jsonb_build_object('found', true, 'expired', false, 'messages', message_list);
end;
$$;

alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.question_visits enable row level security;
alter table public.votes enable row level security;
alter table public.messages enable row level security;
alter table public.machine_signs enable row level security;

drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own"
on public.profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "questions owner select" on public.questions;
create policy "questions owner select"
on public.questions for select
to authenticated
using (auth.uid() = owner_id);

drop policy if exists "questions owner insert" on public.questions;
create policy "questions owner insert"
on public.questions for insert
to authenticated
with check (auth.uid() = owner_id);

drop policy if exists "questions owner update" on public.questions;
drop policy if exists "questions owner delete" on public.questions;

drop policy if exists "question visits owner select" on public.question_visits;
create policy "question visits owner select"
on public.question_visits for select
to authenticated
using (
  exists (
    select 1
    from public.questions q
    where q.id = question_visits.question_id
      and q.owner_id = auth.uid()
  )
);

drop policy if exists "votes owner select" on public.votes;
create policy "votes owner select"
on public.votes for select
to authenticated
using (
  exists (
    select 1
    from public.questions q
    where q.id = votes.question_id
      and q.owner_id = auth.uid()
  )
);

drop policy if exists "messages owner select" on public.messages;
create policy "messages owner select"
on public.messages for select
to authenticated
using (
  exists (
    select 1
    from public.questions q
    where q.id = messages.question_id
      and q.owner_id = auth.uid()
  )
);

drop policy if exists "machine signs owner select" on public.machine_signs;
create policy "machine signs owner select"
on public.machine_signs for select
to authenticated
using (auth.uid() = owner_id);

drop policy if exists "machine signs owner insert" on public.machine_signs;
create policy "machine signs owner insert"
on public.machine_signs for insert
to authenticated
with check (auth.uid() = owner_id);

drop policy if exists "machine signs owner delete" on public.machine_signs;
create policy "machine signs owner delete"
on public.machine_signs for delete
to authenticated
using (auth.uid() = owner_id);

grant usage on schema public to anon, authenticated;
grant execute on function public.claim_question_visit(text, text) to anon, authenticated;
grant execute on function public.submit_vote(text, text, public.vote_choice) to anon, authenticated;
grant execute on function public.submit_message(text, text, text) to anon, authenticated;
grant execute on function public.get_public_messages(text, text) to anon, authenticated;
