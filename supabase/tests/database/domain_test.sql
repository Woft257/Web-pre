begin;

select plan(34);

select has_table('public', 'event_users', 'event_users table exists');
select has_table('public', 'markets', 'markets table exists');
select has_table('public', 'trades', 'trades table exists');
select has_table('public', 'rate_limit_buckets', 'rate limit table exists');

select is(
  public.consume_rate_limit('test', 'test-key', 2, 60),
  true,
  'first request is allowed by rate limiter'
);

select is(
  public.consume_rate_limit('test', 'test-key', 2, 60),
  true,
  'request at the limit is allowed'
);

select is(
  public.consume_rate_limit('test', 'test-key', 2, 60),
  false,
  'request above the limit is rejected'
);

create temp table test_context(user_id uuid, market_id uuid, void_market_id uuid);

with test_market as (
  insert into public.markets (
    slug,
    title,
    competition,
    stage,
    home_name,
    home_code,
    away_name,
    away_code,
    kickoff_at,
    trading_end_at,
    status,
    provider,
    provider_event_id,
    oracle_source_at,
    oracle_received_at
  ) values (
    'domain-test-market',
    'Domain Home vs Domain Away',
    'Test competition',
    'Test stage',
    'Domain Home',
    'DHM',
    'Domain Away',
    'DAW',
    now() + interval '1 day',
    now() + interval '2 days',
    'pre_match_open',
    'replay',
    'domain-test-provider-event',
    now(),
    now()
  )
  returning id
)
insert into test_context(user_id, market_id)
select (public.create_or_get_event_user('12345678')).id, id
from test_market;

with void_market as (
  insert into public.markets (
    slug,
    title,
    competition,
    stage,
    home_name,
    home_code,
    away_name,
    away_code,
    kickoff_at,
    trading_end_at,
    status,
    provider,
    provider_event_id,
    oracle_source_at,
    oracle_received_at
  ) values (
    'domain-void-market',
    'Void Home vs Void Away',
    'Test competition',
    'Test stage',
    'Void Home',
    'VHM',
    'Void Away',
    'VAW',
    now() + interval '1 day',
    now() + interval '2 days',
    'pre_match_open',
    'replay',
    'domain-void-provider-event',
    now(),
    now()
  )
  returning id
)
update test_context
set void_market_id = (select id from void_market);

select is(
  (select count(*)
   from public.ledger_entries
   where kind = 'initial_grant'
     and user_id = (select user_id from test_context)),
  1::bigint,
  'UID receives its initial grant once'
);

select lives_ok(
  $$
    select * from public.place_trade(
      (select user_id from test_context),
      (select market_id from test_context),
      'away',
      'buy',
      350000000,
      '10000000-0000-4000-8000-000000000001',
      'domain-buy-0001',
      1,
      1
    )
  $$,
  'buy trade succeeds'
);

select is(
  (select balance_micro from public.event_users where id = (select user_id from test_context)),
  9650000000::bigint,
  'buy trade debits the exact point amount'
);

select ok(
  (select away_shares_micro > 680000000 from public.positions where user_id = (select user_id from test_context)),
  'buy trade creates shares using the VMM quote'
);

select lives_ok(
  $$
    select * from public.place_trade(
      (select user_id from test_context),
      (select market_id from test_context),
      'away',
      'buy',
      350000000,
      '10000000-0000-4000-8000-000000000001',
      'domain-buy-0001',
      1,
      1
    )
  $$,
  'retrying the same idempotency key succeeds'
);

select is(
  (select count(*) from public.trades where user_id = (select user_id from test_context)),
  1::bigint,
  'idempotent retry does not create another trade'
);

select lives_ok(
  $$
    select public.update_market_oracle(
      (select market_id from test_context),
      'replay',
      300000,
      700000,
      now() + interval '1 second',
      'live_open',
      0::smallint,
      1::smallint,
      32::smallint,
      'second_half',
      'England goal',
      null,
      3.33,
      1.43,
      '{"event":"goal","team":"away"}'::jsonb
    )
  $$,
  'oracle update succeeds after a goal'
);

select ok(
  (select position_value_micro > 470000000
   from public.leaderboard_entries
   where user_id = (select user_id from test_context)),
  'leaderboard marks existing shares at the new oracle price'
);

select lives_ok(
  $$
    select public.set_market_status(
      (select market_id from test_context),
      'suspended',
      'VAR review',
      'test-admin'
    )
  $$,
  'market can be suspended'
);

select throws_ok(
  $$
    select * from public.place_trade(
      (select user_id from test_context),
      (select market_id from test_context),
      'away',
      'buy',
      10000000,
      '10000000-0000-4000-8000-000000000002',
      'domain-buy-0002',
      2,
      2
    )
  $$,
  'P0001',
  'MARKET_NOT_OPEN',
  'suspended market rejects a trade'
);

select throws_ok(
  $$
    select public.set_market_status(
      (select market_id from test_context),
      'live_open',
      'Unsafe direct resume',
      'test-admin'
    )
  $$,
  'P0001',
  'RESUME_REQUIRES_FRESH_ODDS',
  'direct resume is rejected without fresh odds confirmation'
);

select lives_ok(
  $$
    select public.update_market_oracle(
      (select market_id from test_context),
      'replay',
      310000,
      690000,
      now() + interval '2 seconds',
      'live_open',
      0::smallint,
      1::smallint,
      33::smallint,
      'second_half',
      'Fresh odds 1/2',
      null,
      3.23,
      1.45,
      '{"event":"odds-confirmation-1"}'::jsonb
    )
  $$,
  'first fresh recovery snapshot is recorded'
);

select is(
  (select status from public.markets where id = (select market_id from test_context)),
  'suspended'::public.market_status,
  'one fresh recovery snapshot keeps trading suspended'
);

select lives_ok(
  $$
    select public.update_market_oracle(
      (select market_id from test_context),
      'replay',
      320000,
      680000,
      now() + interval '3 seconds',
      'live_open',
      0::smallint,
      1::smallint,
      34::smallint,
      'second_half',
      'Fresh odds 2/2',
      null,
      3.13,
      1.47,
      '{"event":"odds-confirmation-2"}'::jsonb
    )
  $$,
  'second fresh recovery snapshot is recorded'
);

select is(
  (select status from public.markets where id = (select market_id from test_context)),
  'live_open'::public.market_status,
  'two fresh recovery snapshots reopen trading'
);

select throws_ok(
  $$
    select public.update_market_oracle(
      (select market_id from test_context),
      'replay',
      330000,
      670000,
      now() + interval '4 seconds',
      'live_open',
      0::smallint,
      0::smallint,
      35::smallint,
      'second_half',
      'Invalid score regression'
    )
  $$,
  'P0001',
  'SCORE_REGRESSION',
  'score regression is rejected'
);

select lives_ok(
  $$
    select public.set_market_status(
      (select market_id from test_context),
      'ended',
      'Full time',
      'test-admin'
    )
  $$,
  'market can be ended'
);

select lives_ok(
  $$
    select public.settle_market(
      (select market_id from test_context),
      'away',
      'integration-test',
      'test-result-001',
      'test-admin'
    )
  $$,
  'winning market settles'
);

select lives_ok(
  $$
    select public.settle_market(
      (select market_id from test_context),
      'away',
      'integration-test',
      'test-result-001',
      'test-admin'
    )
  $$,
  'retrying settlement is idempotent'
);

select is(
  (select count(*) from public.settlements where market_id = (select market_id from test_context)),
  1::bigint,
  'settlement is recorded once'
);

select is(
  (select away_shares_micro from public.positions where user_id = (select user_id from test_context)),
  0::bigint,
  'settlement redeems and clears winning shares'
);

select lives_ok(
  $$
    select * from public.place_trade(
      (select user_id from test_context),
      (select void_market_id from test_context),
      'home',
      'buy',
      100000000,
      '10000000-0000-4000-8000-000000000003',
      'domain-void-buy-0001',
      1,
      1
    )
  $$,
  'trade creates shares for void test'
);

select lives_ok(
  $$
    select public.void_market(
      (select void_market_id from test_context),
      'integration-test',
      'test-void-001',
      'test-admin'
    )
  $$,
  'market void redeems outstanding shares'
);

select lives_ok(
  $$
    select public.void_market(
      (select void_market_id from test_context),
      'integration-test',
      'test-void-001',
      'test-admin'
    )
  $$,
  'retrying market void is idempotent'
);

select is(
  (select count(*)
   from public.settlements
   where market_id = (select void_market_id from test_context)
     and kind = 'void'),
  1::bigint,
  'void settlement is recorded once'
);

select is(
  (select count(*)
   from public.ledger_entries
   where user_id = (select user_id from test_context)
     and kind = 'void_redemption'),
  1::bigint,
  'void redemption ledger is recorded once'
);

select is(
  (select home_shares_micro
   from public.positions
   where user_id = (select user_id from test_context)
     and market_id = (select void_market_id from test_context)),
  0::bigint,
  'void clears outstanding shares'
);

select * from finish();
rollback;
