alter table public.event_users
  add column auth_version integer not null default 1 check (auth_version > 0);

create or replace function public.bump_event_user_auth_version()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.password_hash is distinct from old.password_hash then
    new.auth_version := old.auth_version + 1;
  end if;
  return new;
end;
$$;

create trigger event_users_password_auth_version
before update of password_hash on public.event_users
for each row execute function public.bump_event_user_auth_version();

create or replace function public.register_event_user(
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

revoke execute on function public.register_event_user(text, text)
  from public, anon, authenticated;
grant execute on function public.register_event_user(text, text) to service_role;
