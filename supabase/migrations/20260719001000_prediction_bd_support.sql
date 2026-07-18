alter table public.predictions
add column bd_name text not null default 'Chưa ghi nhận'
check (
  char_length(bd_name) between 1 and 100
  and bd_name = btrim(bd_name)
);

create or replace function public.submit_contest_prediction(
  p_user_id uuid,
  p_winner text,
  p_argentina_score smallint,
  p_spain_score smallint,
  p_messi_scores boolean,
  p_bd_name text
)
returns public.predictions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.contest_settings%rowtype;
  v_prediction public.predictions%rowtype;
  v_bd_name text := btrim(p_bd_name);
begin
  select * into v_settings from public.contest_settings where id = true;
  if not found or not v_settings.predictions_open or now() >= v_settings.submission_closes_at then
    raise exception 'PREDICTIONS_CLOSED';
  end if;
  if not exists (
    select 1 from public.event_users
    where id = p_user_id and status = 'active'
  ) then
    raise exception 'USER_NOT_ACTIVE';
  end if;
  if p_winner not in ('argentina', 'spain') then
    raise exception 'INVALID_WINNER';
  end if;
  if p_argentina_score not between 0 and 20 or p_spain_score not between 0 and 20 then
    raise exception 'INVALID_SCORE';
  end if;
  if v_bd_name is null or char_length(v_bd_name) not between 1 and 100 then
    raise exception 'INVALID_BD_NAME';
  end if;

  insert into public.predictions(
    user_id, winner, argentina_score, spain_score, messi_scores, bd_name
  ) values (
    p_user_id, p_winner, p_argentina_score, p_spain_score, p_messi_scores, v_bd_name
  )
  returning * into v_prediction;

  return v_prediction;
exception
  when unique_violation then
    raise exception 'PREDICTION_ALREADY_SUBMITTED';
end;
$$;

revoke execute on function public.submit_contest_prediction(uuid, text, smallint, smallint, boolean, text)
from public, anon, authenticated;

grant execute on function public.submit_contest_prediction(uuid, text, smallint, smallint, boolean, text)
to service_role;
