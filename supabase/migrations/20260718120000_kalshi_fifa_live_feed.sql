update public.markets
set
  provider = 'kalshi-fifa',
  provider_event_id = '{"kalshi":{"homeTicker":"KXWCADVANCE-26JUL18FRAENG-FRA","awayTicker":"KXWCADVANCE-26JUL18FRAENG-ENG"},"fifa":{"competitionId":"17","seasonId":"285023","stageId":"289291","matchId":"400021542"}}',
  oracle_home_probability_ppm = 635000,
  oracle_away_probability_ppm = 365000,
  oracle_version = oracle_version + 1,
  oracle_source_at = now(),
  oracle_received_at = now(),
  updated_at = now()
where slug = 'france-vs-england-third-place';

update public.markets
set
  provider = 'kalshi-fifa',
  provider_event_id = '{"kalshi":{"homeTicker":"KXMENWORLDCUP-26-AR","awayTicker":"KXMENWORLDCUP-26-ES"},"fifa":{"competitionId":"17","seasonId":"285023","stageId":"289292","matchId":"400021543"}}',
  oracle_home_probability_ppm = 413793,
  oracle_away_probability_ppm = 586207,
  oracle_version = oracle_version + 1,
  oracle_source_at = now(),
  oracle_received_at = now(),
  updated_at = now()
where slug = 'argentina-vs-spain-final';
