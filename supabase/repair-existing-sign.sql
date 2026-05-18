-- One-time repair for signs that were sealed by the old "page view consumes a slot" logic.
-- Change the slug below in both places if you need to repair a different sign.
--
-- This also reinstalls the fixed public loader RPC first. Without that, the repair can appear
-- to work and then the next page view immediately consumes another slot and seals the sign again.

create extension if not exists pgcrypto;

create or replace function public.hash_visitor_key(p_visitor_key text)
returns text
language sql
immutable
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

  if q.results_email_sent_at is not null or (q.status = 'sealed' and not has_slot) then
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

begin;

with target as (
  select id, response_limit
  from public.questions
  where slug = 'e4r42bcbw7vb'
),
clear_stale_slots as (
  delete from public.question_visits qv
  using target t
  where qv.question_id = t.id
  returning qv.question_id
),
real_responders as (
  select distinct v.question_id, v.visitor_key_hash
  from public.votes v
  join target t on t.id = v.question_id
  union
  select distinct m.question_id, m.visitor_key_hash
  from public.messages m
  join target t on t.id = m.question_id
),
restore_real_slots as (
  insert into public.question_visits (question_id, visitor_key_hash)
  select question_id, visitor_key_hash
  from real_responders
  on conflict (question_id, visitor_key_hash) do nothing
  returning question_id
),
counts as (
  select
    t.id,
    t.response_limit,
    count(qv.id)::integer as response_count
  from target t
  left join public.question_visits qv on qv.question_id = t.id
  group by t.id, t.response_limit
)
update public.questions q
set
  visit_count = counts.response_count,
  status = case
    when counts.response_count >= counts.response_limit then 'sealed'::public.question_status
    else 'open'::public.question_status
  end,
  sealed_at = case
    when counts.response_count >= counts.response_limit then coalesce(q.sealed_at, now())
    else null
  end,
  results_email_sent_at = case
    when counts.response_count >= counts.response_limit then q.results_email_sent_at
    else null
  end
from counts
where q.id = counts.id;

commit;

select
  slug,
  status,
  visit_count as response_count,
  response_limit,
  sealed_at,
  results_email_sent_at
from public.questions
where slug = 'e4r42bcbw7vb';
