-- Wyte AI Supabase schema
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','pro')),
  credits integer not null default 5,
  daily_free_used integer not null default 0,
  daily_free_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null,
  model text not null default 'auto',
  mode text not null default 'standard',
  aspect_ratio text not null default '1:1',
  credits_used integer not null default 1,
  status text not null default 'queued',
  image_url text,
  storage_path text,
  provider text,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'flutterwave',
  status text not null default 'pending',
  transaction_id text,
  reference text unique,
  amount numeric(12,2),
  currency text,
  started_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  amount numeric(12,2) not null,
  currency text not null default 'NGN',
  category text,
  expense_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.subscriptions enable row level security;
alter table public.expenses enable row level security;

create policy "profiles own row" on public.profiles for select using (auth.uid()=id);
create policy "profiles own insert" on public.profiles for insert with check (auth.uid()=id);
-- Profile balances and plan are server-controlled. Clients may read, but cannot mutate them.


create policy "jobs own read" on public.generation_jobs for select using (auth.uid()=user_id);
create policy "subscriptions own read" on public.subscriptions for select using (auth.uid()=user_id);
create policy "expenses own all" on public.expenses for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- Storage bucket for generated images. Keep bucket private and use signed URLs.
insert into storage.buckets (id, name, public) values ('generated', 'generated', false)
on conflict (id) do nothing;

create policy "generated images own read" on storage.objects
for select to authenticated
using (bucket_id='generated' and (storage.foldername(name))[1]=auth.uid()::text);

create policy "generated images own insert" on storage.objects
for insert to authenticated
with check (bucket_id='generated' and (storage.foldername(name))[1]=auth.uid()::text);

-- Profile row automatically created for Google sign-ins.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Atomic server-side credit consumption. The API calls this with the service key.
create or replace function public.consume_credits(p_user_id uuid, p_cost integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r public.profiles%rowtype; today date := current_date;
begin
  select * into r from public.profiles where id=p_user_id for update;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
  if r.plan='free' then
    if r.daily_free_date <> today then
      r.daily_free_date := today; r.daily_free_used := 0; r.credits := 5;
    end if;
    if p_cost <> 1 then raise exception 'PRO_REQUIRED'; end if;
    if r.daily_free_used >= 5 then raise exception 'CREDITS_EXHAUSTED'; end if;
    r.daily_free_used := r.daily_free_used + 1; r.credits := 5-r.daily_free_used;
  else
    if r.credits < p_cost then raise exception 'CREDITS_EXHAUSTED'; end if;
    r.credits := r.credits-p_cost;
  end if;
  update public.profiles set credits=r.credits,daily_free_used=r.daily_free_used,daily_free_date=r.daily_free_date,updated_at=now() where id=p_user_id;
  return jsonb_build_object('plan',r.plan,'credits',r.credits,'cost',p_cost);
end $$;
revoke all on function public.consume_credits(uuid,integer) from public, anon, authenticated;
grant execute on function public.consume_credits(uuid,integer) to service_role;


create or replace function public.refund_credits(p_user_id uuid, p_cost integer)
returns void language plpgsql security definer set search_path=public as $$
declare r public.profiles%rowtype;
begin
 select * into r from public.profiles where id=p_user_id for update;
 if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
 if r.plan='free' then
   r.daily_free_used := greatest(0,r.daily_free_used-1);
   r.credits := least(5,r.credits+1);
 else
   r.credits := r.credits+p_cost;
 end if;
 update public.profiles set credits=r.credits,daily_free_used=r.daily_free_used,updated_at=now() where id=p_user_id;
end $$;
revoke all on function public.refund_credits(uuid,integer) from public, anon, authenticated;
grant execute on function public.refund_credits(uuid,integer) to service_role;


-- Atomically marks a subscription successful and grants Pro (500 credits, 30-day
-- expiry) in the same transaction. Only the webhook (service role), after
-- independently re-verifying the transaction with Flutterwave, should call this.
-- Safe to call more than once for the same subscription: if it is already
-- 'successful' the update matches zero rows and no credits are granted twice.
create or replace function public.grant_pro_subscription(p_subscription_id uuid, p_user_id uuid, p_transaction_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare granted boolean := false;
begin
  update public.subscriptions
  set status='successful', transaction_id=p_transaction_id, started_at=now(), expires_at=now() + interval '30 days'
  where id=p_subscription_id and status <> 'successful';
  if found then
    update public.profiles set plan='pro', credits=500, updated_at=now() where id=p_user_id;
    granted := true;
  end if;
  return granted;
end $$;
revoke all on function public.grant_pro_subscription(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.grant_pro_subscription(uuid,uuid,text) to service_role;
