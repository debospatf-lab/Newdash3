-- Horizia Supabase Schema
-- Note: Enable Row Level Security (RLS) after creating tables.
-- Roles: Admin, Team Lead, Project Manager, Product Owner, Engineering Manager

create extension if not exists "uuid-ossp";

-- profiles mirrors auth.users and stores additional fields
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  role text check (role in ('Admin','Team Lead','Project Manager','Product Owner','Engineering Manager')),
  avatar_url text,
  created_at timestamp with time zone default now()
);
comment on table public.profiles is 'User profiles linked to auth.users with role and metadata. RLS: users can view self; Admin can view all.';

-- projects table
create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  owner uuid references public.profiles(id) on delete set null,
  status text default 'active',
  start_date date,
  end_date date,
  created_at timestamp with time zone default now()
);
comment on table public.projects is 'Projects managed in Horizia. RLS: members can read; owner can write; Admin can manage all.';

-- issues aggregated from integrations
create table if not exists public.issues (
  id uuid primary key default uuid_generate_v4(),
  external_id text,
  integration text check (integration in ('jira','github','slack')),
  project_id uuid references public.projects(id) on delete cascade,
  summary text,
  status text,
  priority text,
  assignee uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
comment on table public.issues is 'Issues imported from integrations. RLS: project members read; owner write; Admin manage.';

-- integrations OAuth credentials per profile
create table if not exists public.integrations (
  profile_id uuid references public.profiles(id) on delete cascade,
  provider text check (provider in ('jira','github','slack')),
  access_token text,
  refresh_token text,
  scopes text[],
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  primary key (profile_id, provider)
);
comment on table public.integrations is 'OAuth tokens. RLS: user can read/write their own; Admin manage all.';

-- audit log for actions
create table if not exists public.audit_log (
  id bigserial primary key,
  profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  meta jsonb,
  created_at timestamp with time zone default now()
);
comment on table public.audit_log is 'User actions for traceability. RLS: Admin read all; user read own';

-- Suggested RLS policies (describe; implement per project needs)
-- alter table public.profiles enable row level security;
-- create policy "Profiles are viewable by owner" on public.profiles
--   for select using (auth.uid() = id);
-- create policy "Profiles insert/update by owner" on public.profiles
--   for all using (auth.uid() = id) with check (auth.uid() = id);
-- create policy "Admin can do everything on profiles" on public.profiles
--   for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'Admin'));

-- Repeat appropriate policies for projects, issues, integrations, audit_log
