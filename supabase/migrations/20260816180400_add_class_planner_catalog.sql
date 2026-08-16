create table public.class_planner_course_offerings (
  id bigint generated always as identity primary key,
  term_code text not null references public.terms (term) on delete cascade,
  source_key text not null,
  subject_code text not null,
  course_code text not null,
  module_code text not null,
  module_id text not null,
  module_name text not null,
  course_title text,
  section_count integer not null,
  open_section_count integer not null,
  open_seat_count integer not null,
  waitlist_available_count integer not null,
  instruction_types text[] not null default '{}',
  instructors text[] not null default '{}',
  availability_refresh_pending boolean not null default false,
  is_topic_course boolean not null default false,
  section_family text,
  subject_name text,
  academic_level text,
  matching_section_count integer not null,
  units_display text,
  prerequisites jsonb not null default '[]'::jsonb,
  restrictions jsonb not null default '[]'::jsonb,
  metadata_source text,
  ingested_at timestamptz not null default now(),
  constraint class_planner_course_offerings_source_unique
    unique (term_code, source_key),
  constraint class_planner_course_offerings_counts_nonnegative check (
    section_count >= 0
    and open_section_count >= 0
    and open_seat_count >= 0
    and waitlist_available_count >= 0
    and matching_section_count >= 0
  ),
  constraint class_planner_course_offerings_prerequisites_array
    check (jsonb_typeof(prerequisites) = 'array'),
  constraint class_planner_course_offerings_restrictions_array
    check (jsonb_typeof(restrictions) = 'array')
);

create index class_planner_course_offerings_term_module_code_idx
  on public.class_planner_course_offerings (term_code, module_code);

create index class_planner_course_offerings_term_module_id_idx
  on public.class_planner_course_offerings (term_code, module_id);

create table public.class_planner_sections (
  id bigint generated always as identity primary key,
  offering_id bigint not null
    references public.class_planner_course_offerings (id) on delete cascade,
  term_code text not null,
  section_id text not null,
  section_ref text not null,
  section_code text not null,
  instruction_type_name text not null,
  capacity integer,
  enrolled integer,
  seats_available integer,
  waitlist_capacity integer,
  waitlist_enrolled integer,
  waitlist_available integer,
  status text,
  instructors text[] not null default '{}',
  ingested_at timestamptz not null default now(),
  constraint class_planner_sections_term_section_unique
    unique (term_code, section_id),
  constraint class_planner_sections_ref_unique unique (section_ref),
  constraint class_planner_sections_capacity_nonnegative
    check (capacity is null or capacity >= 0),
  constraint class_planner_sections_enrolled_nonnegative
    check (enrolled is null or enrolled >= 0),
  constraint class_planner_sections_waitlist_capacity_nonnegative
    check (waitlist_capacity is null or waitlist_capacity >= 0),
  constraint class_planner_sections_waitlist_enrolled_nonnegative
    check (waitlist_enrolled is null or waitlist_enrolled >= 0)
);

create index class_planner_sections_offering_id_idx
  on public.class_planner_sections (offering_id);

create table public.class_planner_section_meetings (
  id bigint generated always as identity primary key,
  section_id bigint not null
    references public.class_planner_sections (id) on delete cascade,
  meeting_ordinal smallint not null,
  meeting_kind text not null,
  day_code text,
  day_name text,
  specific_date date,
  start_minutes smallint,
  end_minutes smallint,
  start_time_display text,
  end_time_display text,
  building_code text,
  room_code text,
  building_name text,
  room_name text,
  is_remote boolean not null default false,
  is_tba boolean not null default false,
  ingested_at timestamptz not null default now(),
  constraint class_planner_section_meetings_ordinal_unique
    unique (section_id, meeting_ordinal),
  constraint class_planner_section_meetings_start_minutes_range
    check (start_minutes is null or start_minutes between 0 and 1439),
  constraint class_planner_section_meetings_end_minutes_range
    check (end_minutes is null or end_minutes between 1 and 1440),
  constraint class_planner_section_meetings_time_order
    check (
      start_minutes is null
      or end_minutes is null
      or start_minutes < end_minutes
    )
);

create index class_planner_section_meetings_section_id_idx
  on public.class_planner_section_meetings (section_id);

create table public.tss_event_packages (
  id bigint generated always as identity primary key,
  offering_id bigint not null
    references public.class_planner_course_offerings (id) on delete cascade,
  term_code text not null,
  module_id text not null,
  event_package_id text not null,
  tss_booking_url text,
  ingested_at timestamptz not null default now(),
  constraint tss_event_packages_offering_package_unique
    unique (offering_id, event_package_id)
);

create index tss_event_packages_term_module_package_idx
  on public.tss_event_packages (term_code, module_id, event_package_id);

create table public.tss_event_package_sections (
  event_package_id bigint not null
    references public.tss_event_packages (id) on delete cascade,
  section_id bigint not null
    references public.class_planner_sections (id) on delete cascade,
  primary key (event_package_id, section_id)
);

create index tss_event_package_sections_section_id_idx
  on public.tss_event_package_sections (section_id);

create table public.tss_module_routes (
  offering_id bigint primary key
    references public.class_planner_course_offerings (id) on delete cascade,
  term_code text not null,
  module_id text not null,
  route_kind text not null,
  representative_event_package_id text,
  academic_year text,
  academic_period text,
  tss_url text not null,
  ingested_at timestamptz not null default now(),
  constraint tss_module_routes_kind
    check (route_kind in ('event_package', 'module')),
  constraint tss_module_routes_event_package_metadata check (
    route_kind <> 'event_package'
    or (
      representative_event_package_id is not null
      and academic_year is not null
      and academic_period is not null
    )
  )
);

create index tss_module_routes_term_module_id_idx
  on public.tss_module_routes (term_code, module_id);

alter table public.class_planner_course_offerings enable row level security;
alter table public.class_planner_sections enable row level security;
alter table public.class_planner_section_meetings enable row level security;
alter table public.tss_event_packages enable row level security;
alter table public.tss_event_package_sections enable row level security;
alter table public.tss_module_routes enable row level security;

grant select on table public.class_planner_course_offerings
  to anon, authenticated;
grant select on table public.class_planner_sections
  to anon, authenticated;
grant select on table public.class_planner_section_meetings
  to anon, authenticated;
grant select on table public.tss_event_packages
  to anon, authenticated;
grant select on table public.tss_event_package_sections
  to anon, authenticated;
grant select on table public.tss_module_routes
  to anon, authenticated;

grant all on table public.class_planner_course_offerings to service_role;
grant all on table public.class_planner_sections to service_role;
grant all on table public.class_planner_section_meetings to service_role;
grant all on table public.tss_event_packages to service_role;
grant all on table public.tss_event_package_sections to service_role;
grant all on table public.tss_module_routes to service_role;

grant usage, select on sequence
  public.class_planner_course_offerings_id_seq,
  public.class_planner_sections_id_seq,
  public.class_planner_section_meetings_id_seq,
  public.tss_event_packages_id_seq
  to service_role;

create policy "Class Planner offerings are publicly readable"
on public.class_planner_course_offerings
for select
to anon, authenticated
using (true);

create policy "Class Planner sections are publicly readable"
on public.class_planner_sections
for select
to anon, authenticated
using (true);

create policy "Class Planner meetings are publicly readable"
on public.class_planner_section_meetings
for select
to anon, authenticated
using (true);

create policy "TSS event packages are publicly readable"
on public.tss_event_packages
for select
to anon, authenticated
using (true);

create policy "TSS package sections are publicly readable"
on public.tss_event_package_sections
for select
to anon, authenticated
using (true);

create policy "TSS module routes are publicly readable"
on public.tss_module_routes
for select
to anon, authenticated
using (true);

create function public.replace_class_planner_catalog(
  p_term text,
  p_courses jsonb,
  p_professors jsonb,
  p_catalog jsonb
)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  catalog_key text;
  inserted_rows integer;
begin
  p_term := upper(trim(p_term));

  if p_term is null or p_term !~ '^[A-Z0-9]{4,6}$' then
    raise exception 'valid term is required';
  end if;

  if jsonb_typeof(p_courses) <> 'array' or jsonb_array_length(p_courses) = 0 then
    raise exception 'courses must be a non-empty array';
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

  delete from public.courses
  where term = p_term;

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

  insert into public.courses (
    name,
    term,
    teacher,
    name_key,
    lecture,
    labs,
    discussions,
    midterms,
    final,
    rmp
  )
  select
    course_item ->> 'Name',
    p_term,
    coalesce(course_item ->> 'Teacher', ''),
    coalesce(course_item ->> 'nameKey', ''),
    nullif(course_item -> 'Lecture', 'null'::jsonb),
    coalesce(course_item -> 'Labs', '[]'::jsonb),
    coalesce(course_item -> 'Discussions', '[]'::jsonb),
    coalesce(course_item -> 'Midterms', '[]'::jsonb),
    nullif(course_item -> 'Final', 'null'::jsonb),
    nullif(course_item -> 'rmp', 'null'::jsonb)
  from jsonb_array_elements(p_courses) as course_item
  where course_item ->> 'Name' is not null;

  get diagnostics inserted_rows = row_count;

  if inserted_rows <> jsonb_array_length(p_courses) then
    raise exception 'not all legacy courses were inserted';
  end if;

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

revoke all on function public.replace_class_planner_catalog(
  text,
  jsonb,
  jsonb,
  jsonb
) from public;
revoke all on function public.replace_class_planner_catalog(
  text,
  jsonb,
  jsonb,
  jsonb
) from anon;
revoke all on function public.replace_class_planner_catalog(
  text,
  jsonb,
  jsonb,
  jsonb
) from authenticated;
grant execute on function public.replace_class_planner_catalog(
  text,
  jsonb,
  jsonb,
  jsonb
) to service_role;
