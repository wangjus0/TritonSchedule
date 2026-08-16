create schema if not exists private;

grant usage on schema private to service_role;

alter table public.class_planner_course_offerings
add column if not exists instructors_search text not null default '';

update public.class_planner_course_offerings
set instructors_search = array_to_string(instructors, ' ')
where instructors_search = '';

create table private.class_planner_catalog_refreshes (
  id uuid primary key,
  term_code text not null,
  status text not null default 'staging',
  expected_counts jsonb not null,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint class_planner_catalog_refreshes_term_format
    check (term_code ~ '^[A-Z0-9]{4,6}$'),
  constraint class_planner_catalog_refreshes_status
    check (status in ('staging', 'complete', 'failed')),
  constraint class_planner_catalog_refreshes_expected_counts_object
    check (jsonb_typeof(expected_counts) = 'object')
);

create table private.class_planner_catalog_refresh_items (
  refresh_id uuid not null
    references private.class_planner_catalog_refreshes (id) on delete cascade,
  item_kind text not null,
  item_key text not null,
  payload jsonb not null,
  primary key (refresh_id, item_kind, item_key),
  constraint class_planner_catalog_refresh_items_kind check (
    item_kind in (
      'offerings',
      'sections',
      'meetings',
      'event_packages',
      'package_sections',
      'module_routes',
      'professors'
    )
  ),
  constraint class_planner_catalog_refresh_items_payload_object
    check (jsonb_typeof(payload) = 'object')
);

create index class_planner_catalog_refresh_items_refresh_kind_idx
  on private.class_planner_catalog_refresh_items (refresh_id, item_kind);

alter table private.class_planner_catalog_refreshes enable row level security;
alter table private.class_planner_catalog_refresh_items enable row level security;

grant select, insert, update, delete
on private.class_planner_catalog_refreshes,
   private.class_planner_catalog_refresh_items
to service_role;

create or replace function private.class_planner_refresh_item_key(
  p_item_kind text,
  p_payload jsonb
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_item_kind
    when 'offerings' then p_payload ->> 'source_key'
    when 'sections' then p_payload ->> 'section_id'
    when 'meetings' then concat_ws(
      ':',
      p_payload ->> 'section_id',
      p_payload ->> 'meeting_ordinal'
    )
    when 'event_packages' then concat_ws(
      ':',
      p_payload ->> 'source_key',
      p_payload ->> 'event_package_id'
    )
    when 'package_sections' then concat_ws(
      ':',
      p_payload ->> 'source_key',
      p_payload ->> 'event_package_id',
      p_payload ->> 'section_id'
    )
    when 'module_routes' then p_payload ->> 'source_key'
    when 'professors' then p_payload ->> 'nameKey'
    else null
  end
$$;

revoke all on function private.class_planner_refresh_item_key(text, jsonb)
from public, anon, authenticated;
grant execute on function private.class_planner_refresh_item_key(text, jsonb)
to service_role;

create or replace function public.begin_class_planner_catalog_refresh(
  p_refresh_id uuid,
  p_term text,
  p_expected_counts jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  required_kind text;
begin
  p_term := upper(trim(p_term));

  if p_refresh_id is null then
    raise exception 'refresh id is required';
  end if;

  if p_term is null or p_term !~ '^[A-Z0-9]{4,6}$' then
    raise exception 'valid term is required';
  end if;

  if jsonb_typeof(p_expected_counts) <> 'object' then
    raise exception 'expected counts must be an object';
  end if;

  foreach required_kind in array array[
    'offerings',
    'sections',
    'meetings',
    'event_packages',
    'package_sections',
    'module_routes',
    'professors'
  ] loop
    if coalesce(p_expected_counts ->> required_kind, '') !~ '^[0-9]+$' then
      raise exception 'expected count is required for %', required_kind;
    end if;
  end loop;

  if (p_expected_counts ->> 'offerings')::integer = 0 then
    raise exception 'offerings must be non-empty';
  end if;

  insert into private.class_planner_catalog_refreshes (
    id,
    term_code,
    expected_counts
  ) values (
    p_refresh_id,
    p_term,
    p_expected_counts
  );
end;
$$;

create or replace function public.stage_class_planner_catalog_batch(
  p_refresh_id uuid,
  p_item_kind text,
  p_items jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  refresh_status text;
begin
  if p_item_kind not in (
    'offerings',
    'sections',
    'meetings',
    'event_packages',
    'package_sections',
    'module_routes',
    'professors'
  ) then
    raise exception 'unsupported catalog item kind: %', p_item_kind;
  end if;

  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'catalog batch must be an array';
  end if;

  if jsonb_array_length(p_items) > 500 then
    raise exception 'catalog batch exceeds 500 items';
  end if;

  select status
  into refresh_status
  from private.class_planner_catalog_refreshes
  where id = p_refresh_id
  for update;

  if refresh_status is null then
    raise exception 'catalog refresh does not exist';
  end if;

  if refresh_status <> 'staging' then
    raise exception 'catalog refresh is not accepting batches';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) as item
    where jsonb_typeof(item) <> 'object'
       or coalesce(
         private.class_planner_refresh_item_key(p_item_kind, item),
         ''
       ) = ''
  ) then
    raise exception 'catalog batch contains an invalid item';
  end if;

  insert into private.class_planner_catalog_refresh_items (
    refresh_id,
    item_kind,
    item_key,
    payload
  )
  select
    p_refresh_id,
    p_item_kind,
    private.class_planner_refresh_item_key(p_item_kind, item),
    item
  from jsonb_array_elements(p_items) as item
  on conflict (refresh_id, item_kind, item_key) do update
  set payload = excluded.payload;
end;
$$;

create or replace function public.fail_class_planner_catalog_refresh(
  p_refresh_id uuid,
  p_error text
)
returns void
language sql
security invoker
set search_path = ''
as $$
  update private.class_planner_catalog_refreshes
  set
    status = 'failed',
    error_message = left(coalesce(p_error, 'Catalog refresh failed'), 2000),
    completed_at = now()
  where id = p_refresh_id
    and status = 'staging'
$$;

create or replace function public.finalize_class_planner_catalog_refresh(
  p_refresh_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
set statement_timeout = '5min'
as $$
declare
  refresh_record private.class_planner_catalog_refreshes%rowtype;
  expected_count integer;
  actual_count integer;
  inserted_rows integer;
  required_kind text;
begin
  perform pg_advisory_xact_lock(741632871003);

  select *
  into refresh_record
  from private.class_planner_catalog_refreshes
  where id = p_refresh_id
  for update;

  if refresh_record.id is null then
    raise exception 'catalog refresh does not exist';
  end if;

  if refresh_record.status <> 'staging' then
    raise exception 'catalog refresh is not ready to finalize';
  end if;

  foreach required_kind in array array[
    'offerings',
    'sections',
    'meetings',
    'event_packages',
    'package_sections',
    'module_routes',
    'professors'
  ] loop
    expected_count := (refresh_record.expected_counts ->> required_kind)::integer;

    select count(*)
    into actual_count
    from private.class_planner_catalog_refresh_items
    where refresh_id = p_refresh_id
      and item_kind = required_kind;

    if actual_count <> expected_count then
      raise exception 'catalog item count mismatch for %: expected %, received %',
        required_kind,
        expected_count,
        actual_count;
    end if;
  end loop;

  update public.terms
  set is_active = false
  where is_active = true;

  insert into public.terms (term, is_active)
  values (refresh_record.term_code, true)
  on conflict (term) do update set is_active = true;

  delete from public.class_planner_course_offerings
  where term_code = refresh_record.term_code;

  insert into public.professor (
    name,
    name_key,
    avg_rating,
    avg_diff,
    take_again_percent,
    profile_url
  )
  select
    payload ->> 'name',
    payload ->> 'nameKey',
    coalesce((payload ->> 'avgRating')::numeric, 0),
    coalesce((payload ->> 'avgDiff')::numeric, 0),
    coalesce((payload ->> 'takeAgainPercent')::integer, 0),
    nullif(payload ->> 'profileUrl', '')
  from private.class_planner_catalog_refresh_items
  where refresh_id = p_refresh_id
    and item_kind = 'professors'
  on conflict (name_key) do update set
    name = excluded.name,
    avg_rating = excluded.avg_rating,
    avg_diff = excluded.avg_diff,
    take_again_percent = excluded.take_again_percent,
    profile_url = excluded.profile_url;

  insert into public.class_planner_course_offerings (
    term_code,
    source_key,
    subject_code,
    course_code,
    module_code,
    module_id,
    module_name,
    course_title,
    section_count,
    open_section_count,
    open_seat_count,
    waitlist_available_count,
    instruction_types,
    instructors,
    instructors_search,
    availability_refresh_pending,
    is_topic_course,
    section_family,
    subject_name,
    academic_level,
    matching_section_count,
    units_display,
    prerequisites,
    restrictions,
    metadata_source
  )
  select
    refresh_record.term_code,
    payload ->> 'source_key',
    payload ->> 'subject_code',
    payload ->> 'course_code',
    payload ->> 'module_code',
    payload ->> 'module_id',
    payload ->> 'module_name',
    payload ->> 'course_title',
    (payload ->> 'section_count')::integer,
    (payload ->> 'open_section_count')::integer,
    (payload ->> 'open_seat_count')::integer,
    (payload ->> 'waitlist_available_count')::integer,
    array(select jsonb_array_elements_text(coalesce(payload -> 'instruction_types', '[]'::jsonb))),
    array(select jsonb_array_elements_text(coalesce(payload -> 'instructors', '[]'::jsonb))),
    coalesce((select string_agg(value, ' ') from jsonb_array_elements_text(coalesce(payload -> 'instructors', '[]'::jsonb)) as value), ''),
    (payload ->> 'availability_refresh_pending')::boolean,
    (payload ->> 'is_topic_course')::boolean,
    payload ->> 'section_family',
    payload ->> 'subject_name',
    payload ->> 'academic_level',
    (payload ->> 'matching_section_count')::integer,
    payload ->> 'units_display',
    payload -> 'prerequisites',
    payload -> 'restrictions',
    payload ->> 'metadata_source'
  from private.class_planner_catalog_refresh_items
  where refresh_id = p_refresh_id
    and item_kind = 'offerings';

  get diagnostics inserted_rows = row_count;
  if inserted_rows <> (refresh_record.expected_counts ->> 'offerings')::integer then
    raise exception 'not all Class Planner offerings were inserted';
  end if;

  insert into public.class_planner_sections (
    offering_id,
    term_code,
    section_id,
    section_ref,
    section_code,
    instruction_type_name,
    capacity,
    enrolled,
    seats_available,
    waitlist_capacity,
    waitlist_enrolled,
    waitlist_available,
    status,
    instructors
  )
  select
    offering.id,
    refresh_record.term_code,
    item.payload ->> 'section_id',
    item.payload ->> 'section_ref',
    item.payload ->> 'section_code',
    item.payload ->> 'instruction_type_name',
    (item.payload ->> 'capacity')::integer,
    (item.payload ->> 'enrolled')::integer,
    (item.payload ->> 'seats_available')::integer,
    (item.payload ->> 'waitlist_capacity')::integer,
    (item.payload ->> 'waitlist_enrolled')::integer,
    (item.payload ->> 'waitlist_available')::integer,
    item.payload ->> 'status',
    array(select jsonb_array_elements_text(coalesce(item.payload -> 'instructors', '[]'::jsonb)))
  from private.class_planner_catalog_refresh_items as item
  join public.class_planner_course_offerings as offering
    on offering.term_code = refresh_record.term_code
   and offering.source_key = item.payload ->> 'source_key'
  where item.refresh_id = p_refresh_id
    and item.item_kind = 'sections';

  get diagnostics inserted_rows = row_count;
  if inserted_rows <> (refresh_record.expected_counts ->> 'sections')::integer then
    raise exception 'not all Class Planner sections were inserted';
  end if;

  insert into public.class_planner_section_meetings (
    section_id,
    meeting_ordinal,
    meeting_kind,
    day_code,
    day_name,
    specific_date,
    start_minutes,
    end_minutes,
    start_time_display,
    end_time_display,
    building_code,
    room_code,
    building_name,
    room_name,
    is_remote,
    is_tba
  )
  select
    section.id,
    (item.payload ->> 'meeting_ordinal')::smallint,
    item.payload ->> 'meeting_kind',
    item.payload ->> 'day_code',
    item.payload ->> 'day_name',
    (item.payload ->> 'specific_date')::date,
    (item.payload ->> 'start_minutes')::smallint,
    (item.payload ->> 'end_minutes')::smallint,
    item.payload ->> 'start_time_display',
    item.payload ->> 'end_time_display',
    item.payload ->> 'building_code',
    item.payload ->> 'room_code',
    item.payload ->> 'building_name',
    item.payload ->> 'room_name',
    (item.payload ->> 'is_remote')::boolean,
    (item.payload ->> 'is_tba')::boolean
  from private.class_planner_catalog_refresh_items as item
  join public.class_planner_sections as section
    on section.term_code = refresh_record.term_code
   and section.section_id = item.payload ->> 'section_id'
  where item.refresh_id = p_refresh_id
    and item.item_kind = 'meetings';

  get diagnostics inserted_rows = row_count;
  if inserted_rows <> (refresh_record.expected_counts ->> 'meetings')::integer then
    raise exception 'not all Class Planner meetings were inserted';
  end if;

  insert into public.tss_event_packages (
    offering_id,
    term_code,
    module_id,
    event_package_id,
    tss_booking_url
  )
  select
    offering.id,
    refresh_record.term_code,
    item.payload ->> 'module_id',
    item.payload ->> 'event_package_id',
    item.payload ->> 'tss_booking_url'
  from private.class_planner_catalog_refresh_items as item
  join public.class_planner_course_offerings as offering
    on offering.term_code = refresh_record.term_code
   and offering.source_key = item.payload ->> 'source_key'
  where item.refresh_id = p_refresh_id
    and item.item_kind = 'event_packages';

  get diagnostics inserted_rows = row_count;
  if inserted_rows <> (refresh_record.expected_counts ->> 'event_packages')::integer then
    raise exception 'not all TSS event packages were inserted';
  end if;

  insert into public.tss_event_package_sections (
    event_package_id,
    section_id
  )
  select
    event_package.id,
    section.id
  from private.class_planner_catalog_refresh_items as item
  join public.class_planner_course_offerings as offering
    on offering.term_code = refresh_record.term_code
   and offering.source_key = item.payload ->> 'source_key'
  join public.tss_event_packages as event_package
    on event_package.offering_id = offering.id
   and event_package.event_package_id = item.payload ->> 'event_package_id'
  join public.class_planner_sections as section
    on section.offering_id = offering.id
   and section.section_id = item.payload ->> 'section_id'
  where item.refresh_id = p_refresh_id
    and item.item_kind = 'package_sections';

  get diagnostics inserted_rows = row_count;
  if inserted_rows <> (refresh_record.expected_counts ->> 'package_sections')::integer then
    raise exception 'not all TSS package memberships were inserted';
  end if;

  insert into public.tss_module_routes (
    offering_id,
    term_code,
    module_id,
    route_kind,
    representative_event_package_id,
    academic_year,
    academic_period,
    tss_url
  )
  select
    offering.id,
    refresh_record.term_code,
    item.payload ->> 'module_id',
    item.payload ->> 'route_kind',
    item.payload ->> 'representative_event_package_id',
    item.payload ->> 'academic_year',
    item.payload ->> 'academic_period',
    item.payload ->> 'tss_url'
  from private.class_planner_catalog_refresh_items as item
  join public.class_planner_course_offerings as offering
    on offering.term_code = refresh_record.term_code
   and offering.source_key = item.payload ->> 'source_key'
  where item.refresh_id = p_refresh_id
    and item.item_kind = 'module_routes';

  get diagnostics inserted_rows = row_count;
  if inserted_rows <> (refresh_record.expected_counts ->> 'module_routes')::integer then
    raise exception 'not all TSS module routes were inserted';
  end if;

  update private.class_planner_catalog_refreshes
  set
    status = 'complete',
    error_message = null,
    completed_at = now()
  where id = p_refresh_id;

  delete from private.class_planner_catalog_refresh_items
  where refresh_id = p_refresh_id;
end;
$$;

drop function if exists public.replace_class_planner_catalog(
  text,
  jsonb,
  jsonb,
  jsonb
);

revoke all on function public.begin_class_planner_catalog_refresh(uuid, text, jsonb)
from public, anon, authenticated;
revoke all on function public.stage_class_planner_catalog_batch(uuid, text, jsonb)
from public, anon, authenticated;
revoke all on function public.fail_class_planner_catalog_refresh(uuid, text)
from public, anon, authenticated;
revoke all on function public.finalize_class_planner_catalog_refresh(uuid)
from public, anon, authenticated;

grant execute on function public.begin_class_planner_catalog_refresh(uuid, text, jsonb)
to service_role;
grant execute on function public.stage_class_planner_catalog_batch(uuid, text, jsonb)
to service_role;
grant execute on function public.fail_class_planner_catalog_refresh(uuid, text)
to service_role;
grant execute on function public.finalize_class_planner_catalog_refresh(uuid)
to service_role;
