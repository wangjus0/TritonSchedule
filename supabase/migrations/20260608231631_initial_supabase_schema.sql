create schema if not exists extensions;
set search_path = public, extensions;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create table public.terms (
  id uuid primary key default gen_random_uuid(),
  term text not null unique,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index terms_one_active_idx
  on public.terms (is_active)
  where is_active;

create table public.professor (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_key text not null unique,
  avg_rating numeric(3, 2) not null default 0,
  avg_diff numeric(3, 2) not null default 0,
  take_again_percent integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint professor_take_again_percent_range
    check (take_again_percent between 0 and 100)
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  term text not null,
  teacher text not null default '',
  name_key text not null default '',
  lecture jsonb,
  labs jsonb not null default '[]'::jsonb,
  discussions jsonb not null default '[]'::jsonb,
  midterms jsonb not null default '[]'::jsonb,
  final jsonb,
  rmp jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_labs_array check (jsonb_typeof(labs) = 'array'),
  constraint courses_discussions_array check (jsonb_typeof(discussions) = 'array'),
  constraint courses_midterms_array check (jsonb_typeof(midterms) = 'array')
);

create index courses_term_idx on public.courses (term);
create index courses_name_trgm_idx on public.courses using gin (name gin_trgm_ops);
create index courses_term_trgm_idx on public.courses using gin (term gin_trgm_ops);
create index courses_name_key_idx on public.courses (name_key);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_terms_updated_at
before update on public.terms
for each row execute function public.set_updated_at();

create trigger set_professor_updated_at
before update on public.professor
for each row execute function public.set_updated_at();

create trigger set_courses_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

alter table public.terms enable row level security;
alter table public.professor enable row level security;
alter table public.courses enable row level security;

grant usage on schema public to service_role;
grant all on table public.terms to service_role;
grant all on table public.professor to service_role;
grant all on table public.courses to service_role;
