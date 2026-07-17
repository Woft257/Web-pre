create table public.rate_limit_buckets (
  scope text not null,
  key_hash text not null,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (scope, key_hash)
);

create index rate_limit_buckets_updated_idx
  on public.rate_limit_buckets(updated_at);

alter table public.rate_limit_buckets enable row level security;
grant all privileges on public.rate_limit_buckets to service_role;
revoke all on public.rate_limit_buckets from anon, authenticated;

create or replace function public.consume_rate_limit(
  p_scope text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_now timestamptz := now();
begin
  if p_limit <= 0 or p_window_seconds <= 0 then
    raise exception 'INVALID_RATE_LIMIT_CONFIG';
  end if;

  insert into public.rate_limit_buckets (
    scope,
    key_hash,
    window_started_at,
    request_count,
    updated_at
  ) values (
    p_scope,
    p_key_hash,
    v_now,
    1,
    v_now
  )
  on conflict (scope, key_hash) do update set
    request_count = case
      when rate_limit_buckets.window_started_at
        <= v_now - make_interval(secs => p_window_seconds)
      then 1
      else rate_limit_buckets.request_count + 1
    end,
    window_started_at = case
      when rate_limit_buckets.window_started_at
        <= v_now - make_interval(secs => p_window_seconds)
      then v_now
      else rate_limit_buckets.window_started_at
    end,
    updated_at = v_now
  returning request_count into v_count;

  delete from public.rate_limit_buckets
  where updated_at < v_now - interval '2 days';

  return v_count <= p_limit;
end;
$$;

revoke execute on function public.consume_rate_limit(text, text, integer, integer)
from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer)
to service_role;

select pg_notify('pgrst', 'reload schema');
