-- Contagem de dinheiro em espécie. Rode uma única vez no SQL Editor.
create table if not exists public.cash_counts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null,
  mode text not null check (mode in ('set','add')),
  counted_cents bigint not null check (counted_cents >= 0),
  delta_cents bigint not null,
  denominations jsonb not null,
  created_at timestamptz not null default now(),
  foreign key (account_id,user_id) references public.accounts(id,user_id) on delete cascade
);
alter table public.cash_counts enable row level security;
create policy "cash_counts_own_read" on public.cash_counts for select to authenticated using ((select auth.uid())=user_id);
create or replace function public.record_cash_count(p_account_id uuid, p_mode text, p_denominations jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); a public.accounts%rowtype; item record;
  counted bigint := 0; current_balance bigint; delta bigint;
begin
  if uid is null or p_mode not in ('set','add') or jsonb_typeof(p_denominations) <> 'object' then
    raise exception 'Dados inválidos';
  end if;
  select * into a from public.accounts where id=p_account_id and user_id=uid and kind='cash' for update;
  if not found then raise exception 'Carteira não encontrada'; end if;
  for item in select * from jsonb_each_text(p_denominations) loop
    if item.key not in ('1','5','10','25','50','100','200','500','1000','2000','5000','10000','20000')
      or item.value !~ '^[0-9]{1,6}$' then raise exception 'Cédula ou quantidade inválida'; end if;
    counted := counted + item.key::bigint * item.value::bigint;
  end loop;
  if counted > 100000000000 then raise exception 'Valor excede o limite'; end if;
  if p_mode='add' and counted=0 then raise exception 'Informe um valor para acrescentar'; end if;
  select a.opening_balance_cents + coalesce(sum(case when type='income' then amount_cents else -amount_cents end),0)
    into current_balance from public.transactions where user_id=uid and account_id=a.id and date <= current_date;
  delta := case when p_mode='set' then counted-current_balance else counted end;
  update public.accounts set opening_balance_cents=opening_balance_cents+delta where id=a.id and user_id=uid;
  insert into public.cash_counts(user_id,account_id,mode,counted_cents,delta_cents,denominations)
    values(uid,a.id,p_mode,counted,delta,p_denominations);
  return current_balance+delta;
end $$;
revoke all on function public.record_cash_count(uuid,text,jsonb) from public,anon;
grant execute on function public.record_cash_count(uuid,text,jsonb) to authenticated;
