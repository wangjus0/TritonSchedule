create or replace function public.replace_class_planner_catalog(
  p_term text,
  p_courses jsonb,
  p_professors jsonb,
  p_catalog jsonb
)
returns void
language plpgsql
set search_path = public, pg_temp
set statement_timeout = '5min'
as $$
declare
  catalog_key text;
  inserted_rows integer;
begin
  p_term := upper(trim(p_term));

  if p_term is null or p_term !~ '^[A-Z0-9]{4,6}$' then
    raise exception 'valid term is required';
  end if;

  if jsonb_typeof(p_professors) <> 'array' then
    raise exception 'professors must be an array';
  end if;

  if jsonb_typeof(p_catalog) <> 'object' then
    raise exception 'catalog must be an object';
  end if;

  foreach catalog_key in array array[
    'offerings',
    'sections',
    'meetings',
    'event_packages',
    'package_sections',
    'module_routes'
  ] loop
    if jsonb_typeof(p_catalog -> catalog_key) <> 'array' then
      raise exception 'catalog.% must be an array', catalog_key;
    end if;
  end loop;

  update public.terms
  set is_active = false
  where is_active = true;

  insert into public.terms (term, is_active)
  values (p_term, true)
  on conflict (term) do update set is_active = true;

  delete from public.class_planner_course_offerings
  where term_code = p_term;

  insert into public.professor (
    name,
    name_key,
    avg_rating,
    avg_diff,
    take_again_percent
  )
  select
    professor_item ->> 'name',
    professor_item ->> 'nameKey',
    coalesce((professor_item ->> 'avgRating')::numeric, 0),
    coalesce((professor_item ->> 'avgDiff')::numeric, 0),
    coalesce((professor_item ->> 'takeAgainPercent')::integer, 0)
  from jsonb_array_elements(p_professors) as professor_item
  where coalesce(professor_item ->> 'nameKey', '') <> ''
  on conflict (name_key) do update set
    name = excluded.name,
    avg_rating = excluded.avg_rating,
    avg_diff = excluded.avg_diff,
    take_again_percent = excluded.take_again_percent;

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
    p_term,
    offering_item ->> 'source_key',
    offering_item ->> 'subject_code',
    offering_item ->> 'course_code',
    offering_item ->> 'module_code',
    offering_item ->> 'module_id',
    offering_item ->> 'module_name',
    offering_item ->> 'course_title',
    (offering_item ->> 'section_count')::integer,
    (offering_item ->> 'open_section_count')::integer,
    (offering_item ->> 'open_seat_count')::integer,
    (offering_item ->> 'waitlist_available_count')::integer,
    array(select jsonb_array_elements_text(offering_item -> 'instruction_types')),
    array(select jsonb_array_elements_text(offering_item -> 'instructors')),
    (offering_item ->> 'availability_refresh_pending')::boolean,
    (offering_item ->> 'is_topic_course')::boolean,
    offering_item ->> 'section_family',
    offering_item ->> 'subject_name',
    offering_item ->> 'academic_level',
    (offering_item ->> 'matching_section_count')::integer,
    offering_item ->> 'units_display',
    offering_item -> 'prerequisites',
    offering_item -> 'restrictions',
    offering_item ->> 'metadata_source'
  from jsonb_array_elements(p_catalog -> 'offerings') as offering_item;

  get diagnostics inserted_rows = row_count;

  if inserted_rows <> jsonb_array_length(p_catalog -> 'offerings') then
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
    p_term,
    section_item ->> 'section_id',
    section_item ->> 'section_ref',
    section_item ->> 'section_code',
    section_item ->> 'instruction_type_name',
    (section_item ->> 'capacity')::integer,
    (section_item ->> 'enrolled')::integer,
    (section_item ->> 'seats_available')::integer,
    (section_item ->> 'waitlist_capacity')::integer,
    (section_item ->> 'waitlist_enrolled')::integer,
    (section_item ->> 'waitlist_available')::integer,
    section_item ->> 'status',
    array(select jsonb_array_elements_text(section_item -> 'instructors'))
  from jsonb_array_elements(p_catalog -> 'sections') as section_item
  join public.class_planner_course_offerings as offering
    on offering.term_code = p_term
   and offering.source_key = section_item ->> 'source_key';

  get diagnostics inserted_rows = row_count;

  if inserted_rows <> jsonb_array_length(p_catalog -> 'sections') then
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
    (meeting_item ->> 'meeting_ordinal')::smallint,
    meeting_item ->> 'meeting_kind',
    meeting_item ->> 'day_code',
    meeting_item ->> 'day_name',
    (meeting_item ->> 'specific_date')::date,
    (meeting_item ->> 'start_minutes')::smallint,
    (meeting_item ->> 'end_minutes')::smallint,
    meeting_item ->> 'start_time_display',
    meeting_item ->> 'end_time_display',
    meeting_item ->> 'building_code',
    meeting_item ->> 'room_code',
    meeting_item ->> 'building_name',
    meeting_item ->> 'room_name',
    (meeting_item ->> 'is_remote')::boolean,
    (meeting_item ->> 'is_tba')::boolean
  from jsonb_array_elements(p_catalog -> 'meetings') as meeting_item
  join public.class_planner_sections as section
    on section.term_code = p_term
   and section.section_id = meeting_item ->> 'section_id';

  get diagnostics inserted_rows = row_count;

  if inserted_rows <> jsonb_array_length(p_catalog -> 'meetings') then
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
    p_term,
    package_item ->> 'module_id',
    package_item ->> 'event_package_id',
    package_item ->> 'tss_booking_url'
  from jsonb_array_elements(p_catalog -> 'event_packages') as package_item
  join public.class_planner_course_offerings as offering
    on offering.term_code = p_term
   and offering.source_key = package_item ->> 'source_key';

  get diagnostics inserted_rows = row_count;

  if inserted_rows <> jsonb_array_length(p_catalog -> 'event_packages') then
    raise exception 'not all TSS event packages were inserted';
  end if;

  insert into public.tss_event_package_sections (
    event_package_id,
    section_id
  )
  select
    event_package.id,
    section.id
  from jsonb_array_elements(p_catalog -> 'package_sections') as membership_item
  join public.class_planner_course_offerings as offering
    on offering.term_code = p_term
   and offering.source_key = membership_item ->> 'source_key'
  join public.tss_event_packages as event_package
    on event_package.offering_id = offering.id
   and event_package.event_package_id = membership_item ->> 'event_package_id'
  join public.class_planner_sections as section
    on section.offering_id = offering.id
   and section.section_id = membership_item ->> 'section_id';

  get diagnostics inserted_rows = row_count;

  if inserted_rows <> jsonb_array_length(p_catalog -> 'package_sections') then
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
    p_term,
    route_item ->> 'module_id',
    route_item ->> 'route_kind',
    route_item ->> 'representative_event_package_id',
    route_item ->> 'academic_year',
    route_item ->> 'academic_period',
    route_item ->> 'tss_url'
  from jsonb_array_elements(p_catalog -> 'module_routes') as route_item
  join public.class_planner_course_offerings as offering
    on offering.term_code = p_term
   and offering.source_key = route_item ->> 'source_key';

  get diagnostics inserted_rows = row_count;

  if inserted_rows <> jsonb_array_length(p_catalog -> 'module_routes') then
    raise exception 'not all TSS module routes were inserted';
  end if;
end;
$$;

drop function if exists public.replace_catalog(text, jsonb, jsonb);
drop table public.courses;
