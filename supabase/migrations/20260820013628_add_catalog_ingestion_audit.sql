create or replace function public.fail_class_planner_catalog_refresh(
  p_refresh_id uuid,
  p_error text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update private.class_planner_catalog_refreshes
  set
    status = 'failed',
    error_message = left(coalesce(p_error, 'Catalog refresh failed'), 2000),
    completed_at = now()
  where id = p_refresh_id
    and status = 'staging';

  delete from private.class_planner_catalog_refresh_items
  where refresh_id = p_refresh_id;
end;
$$;

revoke all on function public.fail_class_planner_catalog_refresh(uuid, text)
from public, anon, authenticated;
grant execute on function public.fail_class_planner_catalog_refresh(uuid, text)
to service_role;

create table private.catalog_ingestion_runs (
  id uuid primary key,
  trigger_name text not null,
  requested_term text,
  resolved_term text,
  workflow_url text,
  professors_requested boolean not null default false,
  status text not null default 'running',
  catalog_published boolean not null default false,
  catalog_counts jsonb not null default '{}'::jsonb,
  professor_counts jsonb not null default '{}'::jsonb,
  warning_messages text[] not null default '{}'::text[],
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint catalog_ingestion_runs_status check (
    status in ('running', 'succeeded', 'succeeded_with_warnings', 'failed')
  ),
  constraint catalog_ingestion_runs_trigger_length check (
    length(trim(trigger_name)) between 1 and 100
  ),
  constraint catalog_ingestion_runs_requested_term_format check (
    requested_term is null or requested_term ~ '^[A-Z0-9]{4,6}$'
  ),
  constraint catalog_ingestion_runs_resolved_term_format check (
    resolved_term is null or resolved_term ~ '^[A-Z0-9]{4,6}$'
  ),
  constraint catalog_ingestion_runs_catalog_counts_object check (
    jsonb_typeof(catalog_counts) = 'object'
  ),
  constraint catalog_ingestion_runs_professor_counts_object check (
    jsonb_typeof(professor_counts) = 'object'
  )
);

create index catalog_ingestion_runs_started_at_idx
  on private.catalog_ingestion_runs (started_at desc);

create index catalog_ingestion_runs_professor_retry_idx
  on private.catalog_ingestion_runs (started_at desc)
  where professors_requested;

alter table private.catalog_ingestion_runs enable row level security;

grant select, insert, update, delete
on private.catalog_ingestion_runs
to service_role;

create or replace function public.begin_catalog_ingestion_run(
  p_run_id uuid,
  p_trigger text,
  p_requested_term text,
  p_workflow_url text,
  p_professors_requested boolean
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(741632871004);

  update private.class_planner_catalog_refreshes
  set
    status = 'failed',
    error_message = 'Catalog refresh abandoned after four hours',
    completed_at = now()
  where status = 'staging'
    and created_at < now() - interval '4 hours';

  delete from private.class_planner_catalog_refresh_items as item
  using private.class_planner_catalog_refreshes as refresh
  where item.refresh_id = refresh.id
    and refresh.status = 'failed';

  update private.catalog_ingestion_runs
  set
    status = 'failed',
    error_message = 'Ingestion run abandoned after four hours',
    completed_at = now()
  where status = 'running'
    and started_at < now() - interval '4 hours';

  if exists (
    select 1
    from private.catalog_ingestion_runs
    where status = 'running'
  ) then
    raise exception 'another catalog ingestion run is already active';
  end if;

  delete from private.catalog_ingestion_runs
  where started_at < now() - interval '90 days';

  delete from private.class_planner_catalog_refreshes
  where status in ('complete', 'failed')
    and created_at < now() - interval '90 days';

  p_requested_term := nullif(upper(trim(p_requested_term)), '');

  if p_run_id is null then
    raise exception 'run id is required';
  end if;

  if coalesce(length(trim(p_trigger)), 0) = 0 then
    raise exception 'trigger is required';
  end if;

  if p_requested_term is not null
     and p_requested_term !~ '^[A-Z0-9]{4,6}$' then
    raise exception 'requested term is invalid';
  end if;

  insert into private.catalog_ingestion_runs (
    id,
    trigger_name,
    requested_term,
    workflow_url,
    professors_requested
  ) values (
    p_run_id,
    left(trim(p_trigger), 100),
    p_requested_term,
    nullif(left(trim(p_workflow_url), 2000), ''),
    coalesce(p_professors_requested, false)
  );
end;
$$;

create or replace function public.complete_catalog_ingestion_run(
  p_run_id uuid,
  p_resolved_term text,
  p_catalog_published boolean,
  p_catalog_counts jsonb,
  p_professor_counts jsonb,
  p_warnings text[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  p_resolved_term := nullif(upper(trim(p_resolved_term)), '');

  if p_resolved_term is not null
     and p_resolved_term !~ '^[A-Z0-9]{4,6}$' then
    raise exception 'resolved term is invalid';
  end if;

  if jsonb_typeof(coalesce(p_catalog_counts, '{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(p_professor_counts, '{}'::jsonb)) <> 'object' then
    raise exception 'ingestion counts must be objects';
  end if;

  update private.catalog_ingestion_runs
  set
    resolved_term = p_resolved_term,
    status = case
      when cardinality(coalesce(p_warnings, '{}'::text[])) > 0
        then 'succeeded_with_warnings'
      else 'succeeded'
    end,
    catalog_published = coalesce(p_catalog_published, false),
    catalog_counts = coalesce(p_catalog_counts, '{}'::jsonb),
    professor_counts = coalesce(p_professor_counts, '{}'::jsonb),
    warning_messages = coalesce(p_warnings[1:100], '{}'::text[]),
    error_message = null,
    completed_at = now()
  where id = p_run_id
    and status = 'running';

  if not found then
    raise exception 'active ingestion run does not exist';
  end if;
end;
$$;

create or replace function public.fail_catalog_ingestion_run(
  p_run_id uuid,
  p_resolved_term text,
  p_catalog_published boolean,
  p_catalog_counts jsonb,
  p_professor_counts jsonb,
  p_warnings text[],
  p_error text
)
returns void
language sql
security invoker
set search_path = ''
as $$
  update private.catalog_ingestion_runs
  set
    resolved_term = case
      when nullif(upper(trim(p_resolved_term)), '') ~ '^[A-Z0-9]{4,6}$'
        then nullif(upper(trim(p_resolved_term)), '')
      else resolved_term
    end,
    status = 'failed',
    catalog_published = coalesce(p_catalog_published, false),
    catalog_counts = case
      when jsonb_typeof(coalesce(p_catalog_counts, '{}'::jsonb)) = 'object'
        then coalesce(p_catalog_counts, '{}'::jsonb)
      else '{}'::jsonb
    end,
    professor_counts = case
      when jsonb_typeof(coalesce(p_professor_counts, '{}'::jsonb)) = 'object'
        then coalesce(p_professor_counts, '{}'::jsonb)
      else '{}'::jsonb
    end,
    warning_messages = coalesce(p_warnings[1:100], '{}'::text[]),
    error_message = left(coalesce(p_error, 'Catalog ingestion failed'), 4000),
    completed_at = now()
  where id = p_run_id
    and status = 'running'
$$;

create or replace function public.should_retry_professor_refresh()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((
    select status in ('failed', 'succeeded_with_warnings')
      or (
        status = 'running'
        and started_at < now() - interval '4 hours'
      )
    from private.catalog_ingestion_runs
    where professors_requested
    order by started_at desc
    limit 1
  ), false)
$$;

revoke all on function public.begin_catalog_ingestion_run(
  uuid,
  text,
  text,
  text,
  boolean
) from public, anon, authenticated;
revoke all on function public.complete_catalog_ingestion_run(
  uuid,
  text,
  boolean,
  jsonb,
  jsonb,
  text[]
) from public, anon, authenticated;
revoke all on function public.fail_catalog_ingestion_run(
  uuid,
  text,
  boolean,
  jsonb,
  jsonb,
  text[],
  text
) from public, anon, authenticated;
revoke all on function public.should_retry_professor_refresh()
from public, anon, authenticated;

grant execute on function public.begin_catalog_ingestion_run(
  uuid,
  text,
  text,
  text,
  boolean
) to service_role;
grant execute on function public.complete_catalog_ingestion_run(
  uuid,
  text,
  boolean,
  jsonb,
  jsonb,
  text[]
) to service_role;
grant execute on function public.fail_catalog_ingestion_run(
  uuid,
  text,
  boolean,
  jsonb,
  jsonb,
  text[],
  text
) to service_role;
grant execute on function public.should_retry_professor_refresh()
to service_role;
