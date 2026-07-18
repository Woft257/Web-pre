alter table public.markets
  add column manual_hold boolean not null default false,
  add column official_winner public.market_side,
  add column official_result_type smallint;

create or replace function public.update_market_oracle(
  p_market_id uuid,
  p_provider text,
  p_home_probability_ppm integer,
  p_away_probability_ppm integer,
  p_source_at timestamptz,
  p_status public.market_status,
  p_home_score smallint,
  p_away_score smallint,
  p_match_minute smallint default null,
  p_match_period text default null,
  p_latest_event text default null,
  p_suspension_reason text default null,
  p_home_decimal_odds numeric default null,
  p_away_decimal_odds numeric default null,
  p_raw_payload jsonb default null
)
returns public.markets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market public.markets%rowtype;
  v_effective_status public.market_status := p_status;
  v_effective_suspension_reason text := p_suspension_reason;
  v_confirmation_count bigint := 0;
begin
  select * into v_market
  from public.markets
  where id = p_market_id
  for update;

  if not found then
    raise exception 'MARKET_NOT_FOUND';
  end if;
  if v_market.status in ('settled', 'voided') then
    raise exception 'MARKET_ALREADY_RESOLVED';
  end if;
  if v_market.status = 'ended' and p_status <> 'ended' then
    raise exception 'MARKET_ALREADY_ENDED';
  end if;
  if p_home_probability_ppm + p_away_probability_ppm <> 1000000
    or p_home_probability_ppm not between 10000 and 990000
    or p_away_probability_ppm not between 10000 and 990000 then
    raise exception 'INVALID_ORACLE_PROBABILITY';
  end if;
  if p_status not in ('pre_match_open', 'live_open', 'suspended', 'ended') then
    raise exception 'INVALID_MARKET_STATUS';
  end if;
  if v_market.oracle_source_at is not null and p_source_at <= v_market.oracle_source_at then
    raise exception 'STALE_ORACLE_UPDATE';
  end if;
  if p_home_score < v_market.home_score or p_away_score < v_market.away_score then
    raise exception 'SCORE_REGRESSION';
  end if;

  if v_market.manual_hold and p_status <> 'ended' then
    v_effective_status := 'suspended';
    v_effective_suspension_reason := coalesce(v_market.suspension_reason, 'Manual admin hold');
  elsif v_market.status = 'suspended' and p_status in ('pre_match_open', 'live_open') then
    select count(*) into v_confirmation_count
    from public.odds_snapshots
    where market_id = p_market_id
      and oracle_version > coalesce(
        v_market.suspended_oracle_version,
        v_market.oracle_version
      )
      and source_at < p_source_at;

    if v_confirmation_count < 1 then
      v_effective_status := 'suspended';
      v_effective_suspension_reason := 'Awaiting second fresh odds snapshot';
    end if;
  end if;

  update public.markets set
    provider = p_provider,
    oracle_home_probability_ppm = p_home_probability_ppm,
    oracle_away_probability_ppm = p_away_probability_ppm,
    oracle_version = oracle_version + 1,
    oracle_source_at = p_source_at,
    oracle_received_at = now(),
    status = v_effective_status,
    feed_status = case
      when v_effective_status = 'suspended' then 'suspended'::public.feed_status
      when v_effective_status = 'ended' then 'offline'::public.feed_status
      else 'healthy'::public.feed_status
    end,
    manual_hold = case when v_effective_status = 'ended' then false else manual_hold end,
    suspension_reason = case
      when v_effective_status = 'suspended' then v_effective_suspension_reason
      else null
    end,
    suspended_at = case
      when v_effective_status = 'suspended' then coalesce(suspended_at, now())
      else null
    end,
    suspended_oracle_version = case
      when v_effective_status = 'suspended'
        then coalesce(suspended_oracle_version, oracle_version + 1)
      else null
    end,
    home_score = p_home_score,
    away_score = p_away_score,
    match_minute = p_match_minute,
    match_period = p_match_period,
    latest_event = p_latest_event
  where id = p_market_id
  returning * into v_market;

  insert into public.odds_snapshots (
    market_id,
    provider,
    provider_event_id,
    home_decimal_odds,
    away_decimal_odds,
    home_probability_ppm,
    away_probability_ppm,
    oracle_version,
    source_at,
    raw_payload
  )
  values (
    v_market.id,
    p_provider,
    v_market.provider_event_id,
    p_home_decimal_odds,
    p_away_decimal_odds,
    p_home_probability_ppm,
    p_away_probability_ppm,
    v_market.oracle_version,
    p_source_at,
    p_raw_payload
  );

  perform public.refresh_leaderboard_for_market(p_market_id);
  return v_market;
end;
$$;

create or replace function public.set_market_status(
  p_market_id uuid,
  p_status public.market_status,
  p_reason text,
  p_actor text
)
returns public.markets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market public.markets%rowtype;
begin
  if p_status not in ('pre_match_open', 'live_open', 'suspended', 'ended') then
    raise exception 'INVALID_MARKET_STATUS';
  end if;

  select * into v_market
  from public.markets
  where id = p_market_id
  for update;

  if not found then
    raise exception 'MARKET_NOT_FOUND';
  end if;
  if v_market.status in ('settled', 'voided') then
    raise exception 'MARKET_ALREADY_RESOLVED';
  end if;
  if v_market.status = 'ended' and p_status <> 'ended' then
    raise exception 'MARKET_ALREADY_ENDED';
  end if;
  if v_market.status = 'suspended' and p_status in ('pre_match_open', 'live_open') then
    raise exception 'RESUME_REQUIRES_FRESH_ODDS';
  end if;
  if p_status in ('pre_match_open', 'live_open')
    and (v_market.oracle_source_at is null or now() - v_market.oracle_source_at > interval '10 seconds') then
    raise exception 'CANNOT_RESUME_STALE_FEED';
  end if;

  update public.markets set
    status = p_status,
    feed_status = case
      when p_status = 'suspended' then 'suspended'::public.feed_status
      when p_status = 'ended' then 'offline'::public.feed_status
      else 'healthy'::public.feed_status
    end,
    manual_hold = case
      when p_status = 'suspended' then p_actor <> 'live-feed-worker'
      else false
    end,
    suspension_reason = case when p_status = 'suspended' then p_reason else null end,
    suspended_at = case
      when p_status = 'suspended' then coalesce(suspended_at, now())
      else null
    end,
    suspended_oracle_version = case
      when p_status = 'suspended' then coalesce(suspended_oracle_version, oracle_version)
      else null
    end
  where id = p_market_id
  returning * into v_market;

  insert into public.admin_audit_logs(market_id, actor, action, detail)
  values (
    p_market_id,
    p_actor,
    'set_market_status',
    jsonb_build_object(
      'status', p_status,
      'reason', p_reason,
      'manual_hold', v_market.manual_hold
    )
  );

  return v_market;
end;
$$;

create or replace function public.release_market_hold(
  p_market_id uuid,
  p_actor text
)
returns public.markets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market public.markets%rowtype;
begin
  select * into v_market
  from public.markets
  where id = p_market_id
  for update;

  if not found then
    raise exception 'MARKET_NOT_FOUND';
  end if;
  if v_market.status <> 'suspended' or not v_market.manual_hold then
    raise exception 'MARKET_NOT_ON_MANUAL_HOLD';
  end if;

  update public.markets set
    manual_hold = false,
    suspension_reason = 'Manual hold released; awaiting fresh odds snapshots',
    suspended_oracle_version = oracle_version,
    suspended_at = now()
  where id = p_market_id
  returning * into v_market;

  insert into public.admin_audit_logs(market_id, actor, action, detail)
  values (p_market_id, p_actor, 'release_market_hold', '{}'::jsonb);

  return v_market;
end;
$$;

create or replace function public.end_market_from_fifa(
  p_market_id uuid,
  p_provider text,
  p_home_probability_ppm integer,
  p_away_probability_ppm integer,
  p_source_at timestamptz,
  p_home_score smallint,
  p_away_score smallint,
  p_match_minute smallint,
  p_match_period text,
  p_latest_event text,
  p_official_winner public.market_side,
  p_official_result_type smallint,
  p_raw_payload jsonb
)
returns public.markets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market public.markets%rowtype;
begin
  if p_official_winner is null then
    raise exception 'FIFA_WINNER_REQUIRED';
  end if;

  select * into v_market
  from public.update_market_oracle(
    p_market_id,
    p_provider,
    p_home_probability_ppm,
    p_away_probability_ppm,
    p_source_at,
    'ended',
    p_home_score,
    p_away_score,
    p_match_minute,
    p_match_period,
    p_latest_event,
    null,
    null,
    null,
    p_raw_payload
  );

  update public.markets set
    official_winner = p_official_winner,
    official_result_type = p_official_result_type
  where id = p_market_id
  returning * into v_market;

  return v_market;
end;
$$;

create or replace function public.enforce_market_resolution_transition()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'settled' and old.status <> 'ended' then
    raise exception 'MARKET_MUST_BE_ENDED';
  end if;
  if new.status = 'settled'
    and old.official_winner is not null
    and new.outcome is distinct from old.official_winner then
    raise exception 'SETTLEMENT_OUTCOME_MISMATCH';
  end if;
  if new.status = 'voided' and old.status not in ('suspended', 'ended') then
    raise exception 'MARKET_NOT_READY_FOR_VOID';
  end if;
  return new;
end;
$$;

create trigger markets_resolution_transition_guard
before update of status, outcome on public.markets
for each row execute function public.enforce_market_resolution_transition();

revoke execute on function public.release_market_hold(uuid, text)
  from public, anon, authenticated;
grant execute on function public.release_market_hold(uuid, text)
  to service_role;

revoke execute on function public.end_market_from_fifa(
  uuid, text, integer, integer, timestamptz, smallint, smallint, smallint,
  text, text, public.market_side, smallint, jsonb
) from public, anon, authenticated;
grant execute on function public.end_market_from_fifa(
  uuid, text, integer, integer, timestamptz, smallint, smallint, smallint,
  text, text, public.market_side, smallint, jsonb
) to service_role;

select pg_notify('pgrst', 'reload schema');
