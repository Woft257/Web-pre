create or replace function public.heartbeat_market_feed(
  p_market_id uuid,
  p_provider text,
  p_source_at timestamptz,
  p_match_minute smallint default null,
  p_match_period text default null
)
returns void
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
  if v_market.provider <> p_provider then
    raise exception 'PROVIDER_MISMATCH';
  end if;
  if v_market.oracle_source_at is not null and p_source_at <= v_market.oracle_source_at then
    raise exception 'STALE_ORACLE_UPDATE';
  end if;

  update public.markets set
    oracle_source_at = p_source_at,
    oracle_received_at = now(),
    match_minute = p_match_minute,
    match_period = p_match_period
  where id = p_market_id;
end;
$$;

revoke execute on function public.heartbeat_market_feed(uuid, text, timestamptz, smallint, text)
  from public, anon, authenticated;
grant execute on function public.heartbeat_market_feed(uuid, text, timestamptz, smallint, text)
  to service_role;
