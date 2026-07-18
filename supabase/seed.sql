insert into public.contest_settings(
  id, title, home_team, away_team, submission_closes_at, predictions_open
) values (
  true,
  'FIFA World Cup 2026 Final Prediction',
  'Argentina',
  'Spain',
  '2026-07-19 19:00:00+00',
  true
)
on conflict (id) do update set
  title = excluded.title,
  home_team = excluded.home_team,
  away_team = excluded.away_team,
  submission_closes_at = excluded.submission_closes_at;

insert into public.invite_codes(code_hash, code_hint) values
  ('e0cc26c8b0fd8608ab1e9122aa260ed5c810a2a7adb12be38b8de6809b414abc', 'B6FA'),
  ('f0962e94d4f9d4f3abe8c0cb9802ad20a9c00f717461e816d85e38ebadeea9cd', '4C4A'),
  ('0d051a55300029d55f01cff5b616def26371af9803e3860e10aa025c68f3fda1', '01BD'),
  ('e0f6cae5baf8e7f64de155fea14bc069a34b7d1b3448fb97a8b6f8a04500f576', '11E6'),
  ('d7b464af2105f0781cca2331ea25bda1fce15e4bcb12bf5bf558cd3191a98c14', '4E04')
on conflict (code_hash) do nothing;
