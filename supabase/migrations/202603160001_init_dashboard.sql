create extension if not exists pgcrypto;

create table if not exists public.report_bundles (
  period_key text primary key,
  restaurant_code text not null,
  period_label text not null,
  month integer not null check (month between 1 and 12),
  year integer not null,
  uploaded_at timestamptz not null default timezone('utc', now()),
  source_files text[] not null default '{}',
  bundle jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.allowed_login_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  label text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists report_bundles_set_timestamp on public.report_bundles;
create trigger report_bundles_set_timestamp
before update on public.report_bundles
for each row
execute function public.set_timestamp();

alter table public.report_bundles enable row level security;
alter table public.allowed_login_emails enable row level security;

drop policy if exists "report bundles are server managed" on public.report_bundles;
create policy "report bundles are server managed"
on public.report_bundles
for select
to authenticated
using (false);

drop policy if exists "allowed emails are server managed" on public.allowed_login_emails;
create policy "allowed emails are server managed"
on public.allowed_login_emails
for select
to authenticated
using (false);
