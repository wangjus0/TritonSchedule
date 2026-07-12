-- Per-user schedule storage (synced from the frontend when signed in)
create table if not exists public.user_schedules (
  user_id uuid primary key references auth.users (id) on delete cascade,
  events jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_schedules enable row level security;

create policy "Users can read own schedule"
  on public.user_schedules
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own schedule"
  on public.user_schedules
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own schedule"
  on public.user_schedules
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own schedule"
  on public.user_schedules
  for delete
  to authenticated
  using (auth.uid() = user_id);
