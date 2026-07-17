-- Available balance is the only upper bound. These legacy columns remain as a
-- database safety sentinel so older RPC signatures keep working during rollout.
alter table public.markets
  alter column max_order_micro set default 9000000000000000,
  alter column max_user_exposure_micro set default 9000000000000000;

update public.markets
set
  max_order_micro = 9000000000000000,
  max_user_exposure_micro = 9000000000000000,
  updated_at = now();
