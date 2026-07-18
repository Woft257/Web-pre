create or replace function public.prevent_prediction_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' and current_setting('app.allow_prediction_delete', true) = 'on' then
    return old;
  end if;
  raise exception 'PREDICTION_IMMUTABLE';
end;
$$;

create or replace function public.delete_contest_participant(
  p_user_id uuid,
  p_actor text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.event_users%rowtype;
  v_prediction_deleted boolean := false;
begin
  select * into v_user
  from public.event_users
  where id = p_user_id
  for update;

  if not found then
    raise exception 'USER_NOT_FOUND';
  end if;

  perform set_config('app.allow_prediction_delete', 'on', true);
  delete from public.predictions where user_id = p_user_id;
  v_prediction_deleted := found;
  delete from public.event_users where id = p_user_id;

  update public.invite_codes code set
    claim_count = (
      select count(*)::integer from public.event_users where invite_code_id = code.id
    ),
    last_claimed_at = (
      select max(created_at) from public.event_users where invite_code_id = code.id
    )
  where id = v_user.invite_code_id;

  insert into public.admin_audit_logs(actor, action, detail)
  values (
    p_actor,
    'delete_contest_participant',
    jsonb_build_object(
      'user_id', v_user.id,
      'uid', v_user.uid,
      'prediction_deleted', v_prediction_deleted
    )
  );

  return jsonb_build_object(
    'user_id', v_user.id,
    'uid', v_user.uid,
    'prediction_deleted', v_prediction_deleted
  );
end;
$$;

create or replace function public.reset_contest_event(
  p_actor text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participants integer;
  v_predictions integer;
  v_result_existed boolean;
begin
  select count(*)::integer into v_participants from public.event_users;
  select count(*)::integer into v_predictions from public.predictions;
  select exists(select 1 from public.contest_results) into v_result_existed;

  perform set_config('app.allow_prediction_delete', 'on', true);
  delete from public.predictions where true;
  delete from public.event_users where true;
  delete from public.contest_results where true;
  delete from public.rate_limit_buckets where true;
  delete from public.admin_audit_logs where true;

  update public.invite_codes
  set claim_count = 0,
      last_claimed_at = null
  where true;

  update public.contest_settings
  set predictions_open = true
  where id = true;

  insert into public.admin_audit_logs(actor, action, detail)
  values (
    p_actor,
    'reset_contest_event',
    jsonb_build_object(
      'participants_deleted', v_participants,
      'predictions_deleted', v_predictions,
      'result_deleted', v_result_existed
    )
  );

  return jsonb_build_object(
    'participants_deleted', v_participants,
    'predictions_deleted', v_predictions,
    'result_deleted', v_result_existed
  );
end;
$$;

revoke execute on function public.delete_contest_participant(uuid, text)
from public, anon, authenticated;
revoke execute on function public.reset_contest_event(text)
from public, anon, authenticated;

grant execute on function public.delete_contest_participant(uuid, text) to service_role;
grant execute on function public.reset_contest_event(text) to service_role;
