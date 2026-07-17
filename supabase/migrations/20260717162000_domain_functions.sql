create or replace function public.vmm_cost(
  p_home_probability double precision,
  p_home_inventory double precision,
  p_away_inventory double precision,
  p_liquidity_b double precision
)
returns double precision
language plpgsql
immutable
strict
as $$
declare
  v_home_term double precision;
  v_away_term double precision;
  v_max_term double precision;
begin
  if p_home_probability <= 0 or p_home_probability >= 1 then
    raise exception 'INVALID_ORACLE_PROBABILITY';
  end if;
  if p_liquidity_b <= 0 then
    raise exception 'INVALID_LIQUIDITY';
  end if;

  v_home_term := ln(p_home_probability) + (p_home_inventory / p_liquidity_b);
  v_away_term := ln(1 - p_home_probability) + (p_away_inventory / p_liquidity_b);
  v_max_term := greatest(v_home_term, v_away_term);

  return p_liquidity_b * (
    v_max_term + ln(exp(v_home_term - v_max_term) + exp(v_away_term - v_max_term))
  );
end;
$$;

create or replace function public.vmm_delta_cost(
  p_home_probability double precision,
  p_home_inventory double precision,
  p_away_inventory double precision,
  p_liquidity_b double precision,
  p_side public.market_side,
  p_delta_shares double precision
)
returns double precision
language sql
immutable
strict
as $$
  select public.vmm_cost(
    p_home_probability,
    p_home_inventory + case when p_side = 'home' then p_delta_shares else 0 end,
    p_away_inventory + case when p_side = 'away' then p_delta_shares else 0 end,
    p_liquidity_b
  ) - public.vmm_cost(
    p_home_probability,
    p_home_inventory,
    p_away_inventory,
    p_liquidity_b
  );
$$;

create or replace function public.vmm_shares_for_budget(
  p_home_probability double precision,
  p_home_inventory double precision,
  p_away_inventory double precision,
  p_liquidity_b double precision,
  p_side public.market_side,
  p_budget double precision
)
returns double precision
language plpgsql
immutable
strict
as $$
declare
  v_low double precision := 0;
  v_high double precision;
  v_mid double precision;
  v_cost double precision;
  v_probability double precision;
  i integer;
begin
  if p_budget <= 0 then
    raise exception 'INVALID_BUDGET';
  end if;

  v_probability := case
    when p_side = 'home' then p_home_probability
    else 1 - p_home_probability
  end;
  v_high := greatest(1, (p_budget / greatest(v_probability, 0.01)) * 1.25);

  for i in 1..30 loop
    v_cost := public.vmm_delta_cost(
      p_home_probability,
      p_home_inventory,
      p_away_inventory,
      p_liquidity_b,
      p_side,
      v_high
    );
    exit when v_cost >= p_budget;
    v_high := v_high * 2;
  end loop;

  for i in 1..80 loop
    v_mid := (v_low + v_high) / 2;
    v_cost := public.vmm_delta_cost(
      p_home_probability,
      p_home_inventory,
      p_away_inventory,
      p_liquidity_b,
      p_side,
      v_mid
    );
    if v_cost < p_budget then
      v_low := v_mid;
    else
      v_high := v_mid;
    end if;
  end loop;

  return v_low;
end;
$$;

create or replace function public.refresh_leaderboard_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.event_users%rowtype;
  v_position_value bigint;
begin
  select * into v_user
  from public.event_users
  where id = p_user_id;

  if not found then
    return;
  end if;

  select coalesce(sum(
    round(
      (
        p.home_shares_micro::numeric * m.oracle_home_probability_ppm::numeric
        + p.away_shares_micro::numeric * m.oracle_away_probability_ppm::numeric
      ) / 1000000
    )::bigint
  ), 0)
  into v_position_value
  from public.positions p
  join public.markets m on m.id = p.market_id
  where p.user_id = p_user_id
    and m.status not in ('settled', 'voided');

  insert into public.leaderboard_entries (
    user_id,
    masked_uid,
    balance_micro,
    position_value_micro,
    equity_micro,
    pnl_micro,
    updated_at
  )
  values (
    v_user.id,
    public.mask_uid(v_user.uid),
    v_user.balance_micro,
    v_position_value,
    v_user.balance_micro + v_position_value,
    (v_user.balance_micro + v_position_value) - v_user.initial_points_micro,
    now()
  )
  on conflict (user_id) do update set
    masked_uid = excluded.masked_uid,
    balance_micro = excluded.balance_micro,
    position_value_micro = excluded.position_value_micro,
    equity_micro = excluded.equity_micro,
    pnl_micro = excluded.pnl_micro,
    updated_at = excluded.updated_at;
end;
$$;

create or replace function public.refresh_leaderboard_for_market(p_market_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  for v_user_id in
    select distinct user_id
    from public.positions
    where market_id = p_market_id
  loop
    perform public.refresh_leaderboard_for_user(v_user_id);
  end loop;
end;
$$;

create or replace function public.create_or_get_event_user(p_uid text)
returns public.event_users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.event_users%rowtype;
begin
  if p_uid is null or p_uid !~ '^[0-9]{8}$' then
    raise exception 'INVALID_UID';
  end if;

  insert into public.event_users(uid)
  values (p_uid)
  on conflict (uid) do nothing;

  select * into v_user
  from public.event_users
  where uid = p_uid;

  insert into public.ledger_entries (
    user_id,
    kind,
    amount_micro,
    balance_after_micro,
    note
  )
  values (
    v_user.id,
    'initial_grant',
    v_user.initial_points_micro,
    v_user.balance_micro,
    'Initial event points'
  )
  on conflict do nothing;

  perform public.refresh_leaderboard_for_user(v_user.id);
  return v_user;
end;
$$;

create or replace function public.place_trade(
  p_user_id uuid,
  p_market_id uuid,
  p_side public.market_side,
  p_action public.trade_action,
  p_amount_micro bigint,
  p_quote_id uuid,
  p_idempotency_key text,
  p_expected_oracle_version bigint,
  p_expected_vmm_version bigint
)
returns table (
  trade_id uuid,
  user_balance_micro bigint,
  executed_shares_micro bigint,
  executed_cash_delta_micro bigint,
  executed_average_price_ppm integer,
  current_oracle_version bigint,
  current_vmm_version bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market public.markets%rowtype;
  v_user public.event_users%rowtype;
  v_position public.positions%rowtype;
  v_existing public.trades%rowtype;
  v_trade_id uuid := gen_random_uuid();
  v_q_home double precision;
  v_home_inventory double precision;
  v_away_inventory double precision;
  v_liquidity_b double precision;
  v_spread_half double precision;
  v_base_budget double precision;
  v_shares double precision;
  v_shares_micro bigint;
  v_cash_delta_micro bigint;
  v_proceeds_points double precision;
  v_average_price_ppm integer;
  v_cost_released_micro bigint := 0;
  v_new_balance bigint;
  v_new_vmm_version bigint;
begin
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 100 then
    raise exception 'INVALID_IDEMPOTENCY_KEY';
  end if;

  select * into v_existing
  from public.trades t
  where t.user_id = p_user_id
    and t.idempotency_key = p_idempotency_key;

  if found then
    select balance_micro into v_new_balance
    from public.event_users
    where id = p_user_id;

    return query select
      v_existing.id,
      v_new_balance,
      v_existing.shares_micro,
      v_existing.cash_delta_micro,
      v_existing.average_price_ppm,
      v_existing.oracle_version,
      v_existing.vmm_version;
    return;
  end if;

  select * into v_market
  from public.markets
  where id = p_market_id
  for update;

  if not found then
    raise exception 'MARKET_NOT_FOUND';
  end if;

  select * into v_user
  from public.event_users
  where id = p_user_id
  for update;

  if not found or v_user.status <> 'active' then
    raise exception 'USER_NOT_ACTIVE';
  end if;

  if v_market.status not in ('pre_match_open', 'live_open') then
    raise exception 'MARKET_NOT_OPEN';
  end if;
  if v_market.feed_status <> 'healthy' then
    raise exception 'MARKET_FEED_NOT_HEALTHY';
  end if;
  if now() >= v_market.trading_end_at then
    raise exception 'MARKET_ENDED';
  end if;
  if v_market.provider <> 'replay' and (
    v_market.oracle_source_at is null
    or now() - v_market.oracle_source_at > case
      when v_market.status = 'live_open' then interval '10 seconds'
      else interval '2 minutes'
    end
  ) then
    raise exception 'STALE_ORACLE';
  end if;
  if v_market.oracle_version <> p_expected_oracle_version then
    raise exception 'ORACLE_VERSION_CHANGED';
  end if;
  if v_market.vmm_version <> p_expected_vmm_version then
    raise exception 'VMM_VERSION_CHANGED';
  end if;

  insert into public.positions(user_id, market_id)
  values (p_user_id, p_market_id)
  on conflict (user_id, market_id) do nothing;

  select * into v_position
  from public.positions
  where user_id = p_user_id and market_id = p_market_id
  for update;

  v_q_home := v_market.oracle_home_probability_ppm::double precision / 1000000;
  if v_q_home <= 0 or v_q_home >= 1 then
    raise exception 'MARKET_ALREADY_RESOLVED';
  end if;
  v_home_inventory := v_market.home_inventory_microshares::double precision / 1000000;
  v_away_inventory := v_market.away_inventory_microshares::double precision / 1000000;
  v_liquidity_b := v_market.liquidity_b_microshares::double precision / 1000000;
  v_spread_half := v_market.spread_bps::double precision / 20000;

  if p_action = 'buy' then
    if p_amount_micro < v_market.min_order_micro or p_amount_micro > v_market.max_order_micro then
      raise exception 'ORDER_AMOUNT_OUT_OF_RANGE';
    end if;
    if v_user.balance_micro < p_amount_micro then
      raise exception 'INSUFFICIENT_BALANCE';
    end if;
    if v_position.gross_bought_micro + p_amount_micro > v_market.max_user_exposure_micro then
      raise exception 'MARKET_EXPOSURE_LIMIT';
    end if;

    v_base_budget := (p_amount_micro::double precision / 1000000) / (1 + v_spread_half);
    v_shares := public.vmm_shares_for_budget(
      v_q_home,
      v_home_inventory,
      v_away_inventory,
      v_liquidity_b,
      p_side,
      v_base_budget
    );
    v_shares_micro := floor(v_shares * 1000000)::bigint;
    if v_shares_micro <= 0 then
      raise exception 'ORDER_TOO_SMALL';
    end if;
    v_cash_delta_micro := -p_amount_micro;
    v_average_price_ppm := round(
      p_amount_micro::numeric * 1000000 / v_shares_micro::numeric
    )::integer;

    update public.positions set
      home_shares_micro = home_shares_micro + case when p_side = 'home' then v_shares_micro else 0 end,
      away_shares_micro = away_shares_micro + case when p_side = 'away' then v_shares_micro else 0 end,
      home_cost_micro = home_cost_micro + case when p_side = 'home' then p_amount_micro else 0 end,
      away_cost_micro = away_cost_micro + case when p_side = 'away' then p_amount_micro else 0 end,
      gross_bought_micro = gross_bought_micro + p_amount_micro,
      net_cost_micro = net_cost_micro + p_amount_micro
    where user_id = p_user_id and market_id = p_market_id;
  else
    v_shares_micro := p_amount_micro;
    if v_shares_micro <= 0 then
      raise exception 'INVALID_SHARE_AMOUNT';
    end if;
    if (p_side = 'home' and v_position.home_shares_micro < v_shares_micro)
      or (p_side = 'away' and v_position.away_shares_micro < v_shares_micro) then
      raise exception 'INSUFFICIENT_SHARES';
    end if;

    v_shares := v_shares_micro::double precision / 1000000;
    v_proceeds_points := -public.vmm_delta_cost(
      v_q_home,
      v_home_inventory,
      v_away_inventory,
      v_liquidity_b,
      p_side,
      -v_shares
    ) * (1 - v_spread_half);
    v_cash_delta_micro := floor(v_proceeds_points * 1000000)::bigint;
    if v_cash_delta_micro < v_market.min_order_micro then
      raise exception 'ORDER_TOO_SMALL';
    end if;

    if p_side = 'home' then
      v_cost_released_micro := round(
        v_position.home_cost_micro::numeric
        * v_shares_micro::numeric
        / v_position.home_shares_micro::numeric
      )::bigint;
    else
      v_cost_released_micro := round(
        v_position.away_cost_micro::numeric
        * v_shares_micro::numeric
        / v_position.away_shares_micro::numeric
      )::bigint;
    end if;

    v_average_price_ppm := round(
      v_cash_delta_micro::numeric * 1000000 / v_shares_micro::numeric
    )::integer;

    update public.positions set
      home_shares_micro = home_shares_micro - case when p_side = 'home' then v_shares_micro else 0 end,
      away_shares_micro = away_shares_micro - case when p_side = 'away' then v_shares_micro else 0 end,
      home_cost_micro = home_cost_micro - case when p_side = 'home' then v_cost_released_micro else 0 end,
      away_cost_micro = away_cost_micro - case when p_side = 'away' then v_cost_released_micro else 0 end,
      net_cost_micro = greatest(0, net_cost_micro - v_cost_released_micro),
      realized_pnl_micro = realized_pnl_micro + v_cash_delta_micro - v_cost_released_micro
    where user_id = p_user_id and market_id = p_market_id;
  end if;

  update public.markets set
    home_inventory_microshares = home_inventory_microshares
      + case when p_side = 'home' then (case when p_action = 'buy' then v_shares_micro else -v_shares_micro end) else 0 end,
    away_inventory_microshares = away_inventory_microshares
      + case when p_side = 'away' then (case when p_action = 'buy' then v_shares_micro else -v_shares_micro end) else 0 end,
    vmm_version = vmm_version + 1
  where id = p_market_id
  returning vmm_version into v_new_vmm_version;

  update public.event_users set
    balance_micro = balance_micro + v_cash_delta_micro
  where id = p_user_id
  returning balance_micro into v_new_balance;

  insert into public.trades (
    id,
    user_id,
    market_id,
    side,
    action,
    cash_delta_micro,
    shares_micro,
    average_price_ppm,
    oracle_probability_ppm,
    oracle_version,
    vmm_version,
    quote_id,
    idempotency_key
  )
  values (
    v_trade_id,
    p_user_id,
    p_market_id,
    p_side,
    p_action,
    v_cash_delta_micro,
    v_shares_micro,
    v_average_price_ppm,
    case when p_side = 'home'
      then v_market.oracle_home_probability_ppm
      else v_market.oracle_away_probability_ppm
    end,
    v_market.oracle_version,
    v_new_vmm_version,
    p_quote_id,
    p_idempotency_key
  );

  insert into public.ledger_entries (
    user_id,
    market_id,
    trade_id,
    kind,
    amount_micro,
    balance_after_micro,
    note
  )
  values (
    p_user_id,
    p_market_id,
    v_trade_id,
    case when p_action = 'buy' then 'trade_buy'::public.ledger_kind else 'trade_sell'::public.ledger_kind end,
    v_cash_delta_micro,
    v_new_balance,
    upper(p_action::text) || ' ' || upper(p_side::text)
  );

  perform public.refresh_leaderboard_for_user(p_user_id);

  return query select
    v_trade_id,
    v_new_balance,
    v_shares_micro,
    v_cash_delta_micro,
    v_average_price_ppm,
    v_market.oracle_version,
    v_new_vmm_version;
end;
$$;

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

  if v_market.status = 'suspended' and p_status = 'live_open' then
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
      else 'healthy'::public.feed_status
    end,
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
  if v_market.status = 'suspended' and p_status = 'live_open' then
    raise exception 'RESUME_REQUIRES_FRESH_ODDS';
  end if;
  if p_status in ('pre_match_open', 'live_open')
    and v_market.provider <> 'replay'
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
    jsonb_build_object('status', p_status, 'reason', p_reason)
  );

  return v_market;
end;
$$;

create or replace function public.preview_settlement(
  p_market_id uuid,
  p_kind public.settlement_kind,
  p_outcome public.market_side default null
)
returns table (affected_users bigint, total_payout_micro numeric)
language sql
security definer
set search_path = public
as $$
  select
    count(*) filter (where payout_micro > 0)::bigint,
    coalesce(sum(payout_micro), 0)::numeric
  from (
    select case
      when p_kind = 'void' then (home_shares_micro + away_shares_micro) / 2
      when p_outcome = 'home' then home_shares_micro
      else away_shares_micro
    end as payout_micro
    from public.positions
    where market_id = p_market_id
  ) payouts;
$$;

create or replace function public.settle_market(
  p_market_id uuid,
  p_outcome public.market_side,
  p_result_source text,
  p_result_reference text,
  p_actor text
)
returns public.settlements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market public.markets%rowtype;
  v_existing public.settlements%rowtype;
  v_result public.settlements%rowtype;
  v_position public.positions%rowtype;
  v_payout bigint;
  v_balance bigint;
  v_total bigint := 0;
  v_affected integer := 0;
begin
  select * into v_existing
  from public.settlements
  where market_id = p_market_id;
  if found then
    return v_existing;
  end if;

  select * into v_market
  from public.markets
  where id = p_market_id
  for update;

  if not found then
    raise exception 'MARKET_NOT_FOUND';
  end if;
  if v_market.status not in ('ended', 'suspended') then
    raise exception 'MARKET_NOT_READY_FOR_SETTLEMENT';
  end if;

  for v_position in
    select * from public.positions
    where market_id = p_market_id
    order by user_id
    for update
  loop
    v_payout := case when p_outcome = 'home'
      then v_position.home_shares_micro
      else v_position.away_shares_micro
    end;

    select balance_micro into v_balance
    from public.event_users
    where id = v_position.user_id
    for update;

    if v_payout > 0 then
      update public.event_users set balance_micro = balance_micro + v_payout
      where id = v_position.user_id
      returning balance_micro into v_balance;

      insert into public.ledger_entries (
        user_id, market_id, kind, amount_micro, balance_after_micro, note
      ) values (
        v_position.user_id, p_market_id, 'settlement', v_payout, v_balance,
        'Winning shares redeemed at 1 point'
      );
      v_total := v_total + v_payout;
      v_affected := v_affected + 1;

      update public.leaderboard_entries set
        correct_predictions = correct_predictions + 1
      where user_id = v_position.user_id;
    end if;

    update public.leaderboard_entries set
      settled_predictions = settled_predictions + 1
    where user_id = v_position.user_id;

    update public.positions set
      home_shares_micro = 0,
      away_shares_micro = 0,
      home_cost_micro = 0,
      away_cost_micro = 0,
      net_cost_micro = 0
    where user_id = v_position.user_id and market_id = p_market_id;
  end loop;

  update public.markets set
    status = 'settled',
    outcome = p_outcome,
    oracle_home_probability_ppm = case when p_outcome = 'home' then 1000000 else 0 end,
    oracle_away_probability_ppm = case when p_outcome = 'away' then 1000000 else 0 end,
    oracle_version = oracle_version + 1,
    feed_status = 'offline',
    suspension_reason = null,
    suspended_at = null,
    suspended_oracle_version = null,
    settled_at = now()
  where id = p_market_id;

  insert into public.settlements (
    market_id, kind, outcome, result_source, result_reference,
    settled_by, total_payout_micro, affected_users
  ) values (
    p_market_id, 'result', p_outcome, p_result_source, p_result_reference,
    p_actor, v_total, v_affected
  )
  returning * into v_result;

  insert into public.admin_audit_logs(market_id, actor, action, detail)
  values (
    p_market_id,
    p_actor,
    'settle_market',
    jsonb_build_object('outcome', p_outcome, 'total_payout_micro', v_total, 'affected_users', v_affected)
  );

  perform public.refresh_leaderboard_for_market(p_market_id);
  return v_result;
end;
$$;

create or replace function public.void_market(
  p_market_id uuid,
  p_result_source text,
  p_result_reference text,
  p_actor text
)
returns public.settlements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market public.markets%rowtype;
  v_existing public.settlements%rowtype;
  v_result public.settlements%rowtype;
  v_position public.positions%rowtype;
  v_payout bigint;
  v_balance bigint;
  v_total bigint := 0;
  v_affected integer := 0;
begin
  select * into v_existing
  from public.settlements
  where market_id = p_market_id;
  if found then
    return v_existing;
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

  for v_position in
    select * from public.positions
    where market_id = p_market_id
    order by user_id
    for update
  loop
    v_payout := (v_position.home_shares_micro + v_position.away_shares_micro) / 2;

    select balance_micro into v_balance
    from public.event_users
    where id = v_position.user_id
    for update;

    if v_payout > 0 then
      update public.event_users set balance_micro = balance_micro + v_payout
      where id = v_position.user_id
      returning balance_micro into v_balance;

      insert into public.ledger_entries (
        user_id, market_id, kind, amount_micro, balance_after_micro, note
      ) values (
        v_position.user_id, p_market_id, 'void_redemption', v_payout, v_balance,
        'Voided market shares redeemed at 0.5 point'
      );
      v_total := v_total + v_payout;
      v_affected := v_affected + 1;
    end if;

    update public.positions set
      home_shares_micro = 0,
      away_shares_micro = 0,
      home_cost_micro = 0,
      away_cost_micro = 0,
      net_cost_micro = 0
    where user_id = v_position.user_id and market_id = p_market_id;
  end loop;

  update public.markets set
    status = 'voided',
    outcome = null,
    oracle_home_probability_ppm = 500000,
    oracle_away_probability_ppm = 500000,
    oracle_version = oracle_version + 1,
    feed_status = 'offline',
    suspension_reason = null,
    suspended_at = null,
    suspended_oracle_version = null,
    settled_at = now()
  where id = p_market_id;

  insert into public.settlements (
    market_id, kind, outcome, result_source, result_reference,
    settled_by, total_payout_micro, affected_users
  ) values (
    p_market_id, 'void', null, p_result_source, p_result_reference,
    p_actor, v_total, v_affected
  )
  returning * into v_result;

  insert into public.admin_audit_logs(market_id, actor, action, detail)
  values (
    p_market_id,
    p_actor,
    'void_market',
    jsonb_build_object('total_payout_micro', v_total, 'affected_users', v_affected)
  );

  perform public.refresh_leaderboard_for_market(p_market_id);
  return v_result;
end;
$$;

revoke execute on function public.vmm_cost(double precision, double precision, double precision, double precision) from public, anon, authenticated;
revoke execute on function public.vmm_delta_cost(double precision, double precision, double precision, double precision, public.market_side, double precision) from public, anon, authenticated;
revoke execute on function public.vmm_shares_for_budget(double precision, double precision, double precision, double precision, public.market_side, double precision) from public, anon, authenticated;
revoke execute on function public.refresh_leaderboard_for_user(uuid) from public, anon, authenticated;
revoke execute on function public.refresh_leaderboard_for_market(uuid) from public, anon, authenticated;
revoke execute on function public.create_or_get_event_user(text) from public, anon, authenticated;
revoke execute on function public.place_trade(uuid, uuid, public.market_side, public.trade_action, bigint, uuid, text, bigint, bigint) from public, anon, authenticated;
revoke execute on function public.update_market_oracle(uuid, text, integer, integer, timestamptz, public.market_status, smallint, smallint, smallint, text, text, text, numeric, numeric, jsonb) from public, anon, authenticated;
revoke execute on function public.set_market_status(uuid, public.market_status, text, text) from public, anon, authenticated;
revoke execute on function public.preview_settlement(uuid, public.settlement_kind, public.market_side) from public, anon, authenticated;
revoke execute on function public.settle_market(uuid, public.market_side, text, text, text) from public, anon, authenticated;
revoke execute on function public.void_market(uuid, text, text, text) from public, anon, authenticated;

grant execute on function public.create_or_get_event_user(text) to service_role;
grant execute on function public.place_trade(uuid, uuid, public.market_side, public.trade_action, bigint, uuid, text, bigint, bigint) to service_role;
grant execute on function public.update_market_oracle(uuid, text, integer, integer, timestamptz, public.market_status, smallint, smallint, smallint, text, text, text, numeric, numeric, jsonb) to service_role;
grant execute on function public.set_market_status(uuid, public.market_status, text, text) to service_role;
grant execute on function public.preview_settlement(uuid, public.settlement_kind, public.market_side) to service_role;
grant execute on function public.settle_market(uuid, public.market_side, text, text, text) to service_role;
grant execute on function public.void_market(uuid, text, text, text) to service_role;
