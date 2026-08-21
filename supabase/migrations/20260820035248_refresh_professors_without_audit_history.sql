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
  ), true)
$$;

comment on function public.should_retry_professor_refresh() is
  'Requests an initial professor refresh and retries the latest warned, failed, or stale requested run.';
