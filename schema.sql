-- LinkUp database schema
-- Run this whole file in Supabase Dashboard -> SQL Editor.
-- Uses Supabase Auth and Row Level Security. Never use the service-role key in the frontend.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[A-Za-z0-9_]{3,24}$'),
  display_name text,
  bio text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  constraint friendship_not_self check (user_id <> friend_id),
  constraint friendship_direction_unique unique (user_id, friend_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  friendship_id uuid not null references public.friendships(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists friendships_user_id_idx on public.friendships(user_id);
create index if not exists friendships_friend_id_idx on public.friendships(friend_id);
create index if not exists messages_friendship_created_idx on public.messages(friendship_id, created_at);

-- Create a profile automatically after an auth account is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted_username text;
begin
  wanted_username := lower(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)));
  wanted_username := regexp_replace(wanted_username, '[^a-z0-9_]', '', 'g');
  wanted_username := left(wanted_username, 24);
  if length(wanted_username) < 3 then
    wanted_username := 'user' || left(replace(new.id::text, '-', ''), 8);
  end if;
  if exists (select 1 from public.profiles where username = wanted_username) then
    wanted_username := left(wanted_username, 14) || '_' || left(replace(new.id::text, '-', ''), 8);
  end if;
  insert into public.profiles (id, username, display_name)
  values (new.id, wanted_username, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.messages enable row level security;

-- Profiles are searchable by signed-in users to support username discovery.
drop policy if exists "Signed-in users can view profiles" on public.profiles;
create policy "Signed-in users can view profiles"
on public.profiles for select to authenticated using (true);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update to authenticated
using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Users can create a friend request" on public.friendships;
create policy "Users can create a friend request"
on public.friendships for insert to authenticated
with check (auth.uid() = user_id and user_id <> friend_id and status = 'pending');

drop policy if exists "Participants can view friendships" on public.friendships;
create policy "Participants can view friendships"
on public.friendships for select to authenticated
using (auth.uid() = user_id or auth.uid() = friend_id);

drop policy if exists "Recipient can respond to request" on public.friendships;
create policy "Recipient can respond to request"
on public.friendships for update to authenticated
using (auth.uid() = friend_id and status = 'pending')
with check (auth.uid() = friend_id and status in ('accepted','declined'));

drop policy if exists "Participants can view messages in accepted friendship" on public.messages;
create policy "Participants can view messages in accepted friendship"
on public.messages for select to authenticated
using (
  exists (
    select 1 from public.friendships f
    where f.id = friendship_id and f.status = 'accepted'
      and (f.user_id = auth.uid() or f.friend_id = auth.uid())
  )
);

drop policy if exists "Participants can send messages in accepted friendship" on public.messages;
create policy "Participants can send messages in accepted friendship"
on public.messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.friendships f
    where f.id = friendship_id and f.status = 'accepted'
      and (f.user_id = auth.uid() or f.friend_id = auth.uid())
  )
);

-- Realtime: enable replication for live messages and friend requests.
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.friendships;
exception when duplicate_object then null;
when undefined_object then null;
end $$;
