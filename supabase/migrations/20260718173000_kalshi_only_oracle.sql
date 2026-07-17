alter table public.markets
  alter column provider set default 'kalshi-fifa';

alter table public.markets
  add constraint markets_provider_kalshi_only
  check (provider = 'kalshi-fifa');

alter table public.odds_snapshots
  add constraint odds_snapshots_provider_kalshi_only
  check (provider = 'kalshi-fifa');

create or replace function public.admin_update_match_state(
  p_market_id uuid,
  p_home_score smallint,
  p_away_score smallint,
  p_match_minute smallint default null,
  p_latest_event text default null,
  p_actor text default 'admin'
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
  if p_home_score < v_market.home_score or p_away_score < v_market.away_score then
    raise exception 'SCORE_REGRESSION';
  end if;
  if p_match_minute is not null and p_match_minute not between 0 and 150 then
    raise exception 'INVALID_MATCH_MINUTE';
  end if;

  update public.markets set
    home_score = p_home_score,
    away_score = p_away_score,
    match_minute = p_match_minute,
    latest_event = p_latest_event
  where id = p_market_id
  returning * into v_market;

  insert into public.admin_audit_logs(market_id, actor, action, detail)
  values (
    p_market_id,
    p_actor,
    'update_match_state',
    jsonb_build_object(
      'home_score', p_home_score,
      'away_score', p_away_score,
      'match_minute', p_match_minute,
      'latest_event', p_latest_event
    )
  );

  return v_market;
end;
$$;

revoke execute on function public.admin_update_match_state(uuid, smallint, smallint, smallint, text, text)
  from public, anon, authenticated;
grant execute on function public.admin_update_match_state(uuid, smallint, smallint, smallint, text, text)
  to service_role;

select pg_notify('pgrst', 'reload schema');
