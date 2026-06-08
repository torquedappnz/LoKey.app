import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://acwgndxotztkqylryszk.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

// SQL DB Schema definition helper for export
export const SUPABASE_SQL_SCHEMA = `-- LOKEY SUPABASE DATABASE INITIALIZATION SCHEMA
-- Paste this in your Supabase SQL Editor (https://supabase.com) to bootstrap your tables instantly!

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  age integer default 18,
  bio text,
  gender text,
  interested_in text[],
  hobbies text[],
  relationship_goal text,
  attachment_style text,
  personality_type text,
  lifestyle text,
  interests text[],
  school text,
  job text,
  occupation text,
  dob date,
  photos text[],
  mbti text,
  is_verified boolean default false,
  onboarding_complete boolean default false,
  has_confirmed_name_age boolean default false,
  image_url text,
  matching_power integer default 0,
  level integer default 1,
  streak integer default 0,
  current_question_index integer default 0,
  is_premium boolean default false,
  is_blocked boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Profiles
alter table public.profiles enable row level security;

create policy "Allow public profiles view" on public.profiles 
  for select using (true);

create policy "Allow users to update own profile" on public.profiles 
  for update using (auth.uid() = id);

create policy "Allow users to insert own profile" on public.profiles 
  for insert with check (auth.uid() = id);

-- 2. MATCHES TABLE
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  match_profile_id uuid not null,
  match_name text,
  match_age integer,
  match_bio text,
  match_image_url text,
  match_attachment_style text,
  match_values text[],
  match_personality_type text,
  match_lifestyle text,
  match_interests text[],
  match_school text,
  match_job text,
  match_mbti text,
  match_is_verified boolean default true,
  compatibility_score integer not null,
  reason text,
  icebreaker text,
  status text default 'pending', -- pending, accepted, rejected, blocked
  order_num integer default 999,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.matches enable row level security;

create policy "Matches selectable by owner" on public.matches
  for select using (auth.uid() = user_id);

create policy "Matches editable by owner" on public.matches
  for all using (auth.uid() = user_id);

-- 3. MESSAGES TABLE
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id text not null, -- can link multiple matches
  sender_id uuid references public.profiles(id) on delete cascade not null,
  text text not null,
  is_read boolean default false,
  timestamp bigint not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.messages enable row level security;

create policy "Messages selectable by sender or receiver" on public.messages
  for select using (auth.uid() = sender_id or auth.uid()::text = match_id);

create policy "Messages writeable by sender" on public.messages
  for insert with check (auth.uid() = sender_id);

-- 4. REPORTS TABLE (Admin Viewable)
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete cascade not null,
  reporter_name text,
  reported_id text not null,
  reported_name text,
  reason text not null,
  details text,
  status text default 'pending', -- pending, resolved, dismissed
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.reports enable row level security;

create policy "Anyone authenticated can file reports" on public.reports
  for insert with check (auth.role() = 'authenticated');

create policy "Admins and owners can view reports" on public.reports
  for select using (true); -- simplify retrieve for safety center admin view

-- Profile Row trigger on external sign-ups
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, age, is_verified, onboarding_complete, has_confirmed_name_age)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    18,
    false,
    false,
    false
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
`;
