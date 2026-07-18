begin;

select plan(38);

select has_table('public', 'contest_settings', 'contest settings table exists');
select has_table('public', 'invite_codes', 'reusable invite codes table exists');
select has_table('public', 'event_users', 'participants table exists');
select has_table('public', 'predictions', 'predictions table exists');
select has_table('public', 'contest_results', 'contest results table exists');
select has_table('public', 'rate_limit_buckets', 'rate limit table exists');
select has_view('public', 'contest_leaderboard', 'leaderboard view exists');
select has_column('public', 'invite_codes', 'claim_count', 'invite codes count participant claims');
select has_column('public', 'event_users', 'auth_version', 'sessions retain an auth version');

select is(public.consume_rate_limit('contest-test', 'key', 2, 60), true, 'first request is allowed');
select is(public.consume_rate_limit('contest-test', 'key', 2, 60), true, 'request at limit is allowed');
select is(public.consume_rate_limit('contest-test', 'key', 2, 60), false, 'request above limit is rejected');

select is((select count(*)::integer from public.invite_codes), 5, 'five initial reusable codes exist');
select is((select count(*)::integer from public.invite_codes where status = 'active'), 5, 'all initial codes are active');

create temp table test_context(first_user_id uuid, second_user_id uuid);

select lives_ok(
  $$ select public.claim_contest_access(
    '12345678',
    'f0962e94d4f9d4f3abe8c0cb9802ad20a9c00f717461e816d85e38ebadeea9cd'
  ) $$,
  'first UID can claim the shared code'
);

select lives_ok(
  $$ select public.claim_contest_access(
    '87654321',
    'f0962e94d4f9d4f3abe8c0cb9802ad20a9c00f717461e816d85e38ebadeea9cd'
  ) $$,
  'second UID can reuse the same code'
);

insert into test_context(first_user_id, second_user_id)
select
  (select id from public.event_users where uid = '12345678'),
  (select id from public.event_users where uid = '87654321');

select is(
  (select count(*)::integer from public.event_users where uid in ('12345678', '87654321')),
  2,
  'shared code creates two participants'
);
select is(
  (select claim_count from public.invite_codes where code_hint = '4C4A'),
  2,
  'shared code tracks two claimed UIDs'
);
select is(
  (public.claim_contest_access(
    '12345678',
    'f0962e94d4f9d4f3abe8c0cb9802ad20a9c00f717461e816d85e38ebadeea9cd'
  )).id,
  (select first_user_id from test_context),
  'same code and UID return the existing participant'
);

select throws_ok(
  $$ select public.claim_contest_access('11112222', repeat('0', 64)) $$,
  'P0001',
  'INVALID_INVITE_CODE',
  'unknown invite code is rejected'
);

select throws_ok(
  $$ select public.claim_contest_access(
    '12345678',
    'e0cc26c8b0fd8608ab1e9122aa260ed5c810a2a7adb12be38b8de6809b414abc'
  ) $$,
  'P0001',
  'INVALID_ACCESS_PAIR',
  'an existing UID must use its original code'
);

select lives_ok(
  $$ select public.submit_contest_prediction(
    (select first_user_id from test_context),
    'argentina', 2::smallint, 1::smallint, true
  ) $$,
  'first participant submits a prediction'
);

select lives_ok(
  $$ select public.submit_contest_prediction(
    (select second_user_id from test_context),
    'argentina', 2::smallint, 1::smallint, true
  ) $$,
  'second participant submits a prediction'
);

select is(
  (select count(*)::integer from public.predictions where user_id in (
    (select first_user_id from test_context),
    (select second_user_id from test_context)
  )),
  2,
  'one prediction exists per participant'
);

select throws_ok(
  $$ select public.submit_contest_prediction(
    (select first_user_id from test_context),
    'spain', 0::smallint, 3::smallint, false
  ) $$,
  'P0001',
  'PREDICTION_ALREADY_SUBMITTED',
  'a second prediction is rejected'
);

select throws_ok(
  $$ update public.predictions set winner = 'spain'
    where user_id = (select first_user_id from test_context) $$,
  'P0001',
  'PREDICTION_IMMUTABLE',
  'submitted answers cannot be updated'
);

select throws_ok(
  $$ delete from public.predictions
    where user_id = (select first_user_id from test_context) $$,
  'P0001',
  'PREDICTION_IMMUTABLE',
  'submitted answers cannot be deleted'
);

select is(public.mask_uid('12345678'), '12****78', 'timeline UID is masked');

select lives_ok(
  $$ select public.publish_contest_result(
    'argentina', 2::smallint, 1::smallint, true, 'test-admin'
  ) $$,
  'admin can publish the official result'
);

select is(
  (select predictions_open from public.contest_settings where id = true),
  false,
  'publishing closes predictions'
);
select is(
  (select is_published from public.contest_results where id = true),
  true,
  'result is marked published'
);
select is(
  (select count(*)::integer from public.contest_leaderboard where user_id in (
    (select first_user_id from test_context),
    (select second_user_id from test_context)
  )),
  2,
  'published leaderboard includes both predictions'
);
select ok(
  (select rank from public.contest_leaderboard where user_id = (select first_user_id from test_context))
    < (select rank from public.contest_leaderboard where user_id = (select second_user_id from test_context)),
  'earlier tied prediction ranks first'
);
select is(
  (select points from public.contest_leaderboard where user_id = (select first_user_id from test_context)),
  30,
  'three correct answers award 30 points'
);
select ok(
  (select rank from public.contest_leaderboard where user_id = (select second_user_id from test_context))
    > (select rank from public.contest_leaderboard where user_id = (select first_user_id from test_context)),
  'later tied prediction ranks second'
);
select is(
  (select correct_answers from public.contest_leaderboard where user_id = (select second_user_id from test_context)),
  3,
  'leaderboard records three correct answers'
);
select throws_ok(
  $$ select public.set_predictions_open(true, 'test-admin') $$,
  'P0001',
  'RESULT_ALREADY_PUBLISHED',
  'published result prevents reopening predictions'
);
select is(
  (select count(*)::integer from public.admin_audit_logs where action = 'publish_contest_result'),
  1,
  'result publication is audited'
);

select * from finish();
rollback;
