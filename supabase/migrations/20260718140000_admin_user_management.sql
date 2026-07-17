alter table public.event_users
  add column password_hash text;

create or replace function public.admin_create_event_user(
  p_uid text,
  p_password_hash text
)
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
  if p_password_hash is null or p_password_hash !~ '^scrypt\$' then
    raise exception 'INVALID_PASSWORD_HASH';
  end if;
  if exists (select 1 from public.event_users where uid = p_uid) then
    raise exception 'USER_ALREADY_EXISTS';
  end if;

  insert into public.event_users(uid, password_hash)
  values (p_uid, p_password_hash)
  returning * into v_user;

  insert into public.ledger_entries (
    user_id,
    kind,
    amount_micro,
    balance_after_micro,
    note
  ) values (
    v_user.id,
    'initial_grant',
    v_user.initial_points_micro,
    v_user.balance_micro,
    'Initial event points'
  );

  perform public.refresh_leaderboard_for_user(v_user.id);
  return v_user;
end;
$$;

create or replace function public.admin_update_user_password(
  p_user_id uuid,
  p_password_hash text
)
returns public.event_users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.event_users%rowtype;
begin
  if p_password_hash is null or p_password_hash !~ '^scrypt\$' then
    raise exception 'INVALID_PASSWORD_HASH';
  end if;

  update public.event_users
  set password_hash = p_password_hash, updated_at = now()
  where id = p_user_id
  returning * into v_user;

  if not found then
    raise exception 'USER_NOT_FOUND';
  end if;

  delete from public.uid_sessions where user_id = p_user_id;
  return v_user;
end;
$$;

create or replace function public.admin_delete_event_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.event_users where id = p_user_id) then
    raise exception 'USER_NOT_FOUND';
  end if;
  if exists (select 1 from public.trades where user_id = p_user_id) then
    raise exception 'USER_HAS_TRADE_HISTORY';
  end if;

  delete from public.ledger_entries where user_id = p_user_id;
  delete from public.event_users where id = p_user_id;
end;
$$;

revoke execute on function public.admin_create_event_user(text, text)
  from public, anon, authenticated;
revoke execute on function public.admin_update_user_password(uuid, text)
  from public, anon, authenticated;
revoke execute on function public.admin_delete_event_user(uuid)
  from public, anon, authenticated;

grant execute on function public.admin_create_event_user(text, text) to service_role;
grant execute on function public.admin_update_user_password(uuid, text) to service_role;
grant execute on function public.admin_delete_event_user(uuid) to service_role;
