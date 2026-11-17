-- Jornada dos sonhos: capas, prazos e participação segura.
-- Execute uma única vez no SQL Editor do Supabase.

alter table public.goals add column if not exists description text;
alter table public.goals add column if not exists deadline date;
alter table public.goals add column if not exists cover_url text;

create table if not exists public.goal_members (
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'participant' check (role in ('owner','participant')),
  joined_at timestamptz not null default now(),
  primary key (goal_id,user_id)
);

create table if not exists public.goal_invites (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  email text not null,
  token uuid not null default gen_random_uuid() unique,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

insert into public.goal_members(goal_id,user_id,display_name,role)
select g.id,g.user_id,coalesce(u.raw_user_meta_data->>'full_name',u.email),'owner'
from public.goals g join auth.users u on u.id=g.user_id
on conflict (goal_id,user_id) do nothing;

create or replace function public.can_access_goal(p_goal_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.goals g where g.id=p_goal_id and g.user_id=auth.uid())
      or exists(select 1 from public.goal_members m where m.goal_id=p_goal_id and m.user_id=auth.uid());
$$;
revoke all on function public.can_access_goal(uuid) from public,anon;
grant execute on function public.can_access_goal(uuid) to authenticated;

alter table public.goal_members enable row level security;
alter table public.goal_invites enable row level security;

drop policy if exists "goal_members_read_accessible" on public.goal_members;
create policy "goal_members_read_accessible" on public.goal_members
for select to authenticated using (public.can_access_goal(goal_id));

drop policy if exists "goals_members_can_read" on public.goals;
create policy "goals_members_can_read" on public.goals
for select to authenticated using (public.can_access_goal(id));

create or replace function public.add_goal_owner()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.goal_members(goal_id,user_id,display_name,role)
  values(new.id,new.user_id,coalesce(auth.jwt()->'user_metadata'->>'full_name',auth.jwt()->>'email'),'owner')
  on conflict (goal_id,user_id) do nothing;
  return new;
end $$;
drop trigger if exists add_goal_owner_after_insert on public.goals;
create trigger add_goal_owner_after_insert after insert on public.goals
for each row execute function public.add_goal_owner();

create or replace function public.create_goal_invite(p_goal_id uuid,p_email text)
returns text language plpgsql security definer set search_path='' as $$
declare t uuid;
begin
  if auth.uid() is null or not exists(
    select 1 from public.goals where id=p_goal_id and user_id=auth.uid()
  ) then raise exception 'Somente o responsável pode convidar'; end if;
  if p_email is null or p_email !~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'
  then raise exception 'E-mail inválido'; end if;
  insert into public.goal_invites(goal_id,invited_by,email)
  values(p_goal_id,auth.uid(),lower(trim(p_email))) returning token into t;
  return t::text;
end $$;
revoke all on function public.create_goal_invite(uuid,text) from public,anon;
grant execute on function public.create_goal_invite(uuid,text) to authenticated;

create or replace function public.accept_goal_invite(p_token text)
returns uuid language plpgsql security definer set search_path='' as $$
declare i public.goal_invites%rowtype; uid uuid:=auth.uid(); mail text;
begin
  if uid is null then raise exception 'Entre para aceitar o convite'; end if;
  mail:=lower(coalesce(auth.jwt()->>'email',''));
  select * into i from public.goal_invites
  where token::text=p_token and accepted_at is null and expires_at>now() for update;
  if not found then raise exception 'Convite inválido ou expirado'; end if;
  if mail<>i.email then raise exception 'Use o e-mail que recebeu o convite'; end if;
  insert into public.goal_members(goal_id,user_id,display_name,role)
  values(i.goal_id,uid,coalesce(auth.jwt()->'user_metadata'->>'full_name',mail),'participant')
  on conflict (goal_id,user_id) do nothing;
  update public.goal_invites set accepted_at=now(),accepted_by=uid where id=i.id;
  return i.goal_id;
end $$;
revoke all on function public.accept_goal_invite(text) from public,anon;
grant execute on function public.accept_goal_invite(text) to authenticated;

create or replace function public.contribute_to_shared_goal(p_goal_id uuid,p_amount bigint)
returns bigint language plpgsql security definer set search_path='' as $$
declare total bigint;
begin
  if auth.uid() is null or p_amount<=0 or not public.can_access_goal(p_goal_id)
  then raise exception 'Contribuição inválida'; end if;
  update public.goals set saved_cents=saved_cents+p_amount
  where id=p_goal_id returning saved_cents into total;
  if total is null then raise exception 'Meta não encontrada'; end if;
  return total;
end $$;
revoke all on function public.contribute_to_shared_goal(uuid,bigint) from public,anon;
grant execute on function public.contribute_to_shared_goal(uuid,bigint) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('goal-covers','goal-covers',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=5242880,
allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "goal_covers_insert_own_folder" on storage.objects;
create policy "goal_covers_insert_own_folder" on storage.objects
for insert to authenticated with check (
  bucket_id='goal-covers' and (storage.foldername(name))[1]=auth.uid()::text
);
drop policy if exists "goal_covers_update_own_folder" on storage.objects;
create policy "goal_covers_update_own_folder" on storage.objects
for update to authenticated using (
  bucket_id='goal-covers' and (storage.foldername(name))[1]=auth.uid()::text
);
drop policy if exists "goal_covers_delete_own_folder" on storage.objects;
create policy "goal_covers_delete_own_folder" on storage.objects
for delete to authenticated using (
  bucket_id='goal-covers' and (storage.foldername(name))[1]=auth.uid()::text
);
