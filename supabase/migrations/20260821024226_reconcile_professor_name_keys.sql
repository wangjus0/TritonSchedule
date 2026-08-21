create extension if not exists unaccent with schema extensions;

with catalog_instructor_names as (
  select instructor_name
  from public.class_planner_course_offerings as offering
  cross join lateral unnest(offering.instructors) as instructor_name

  union

  select instructor_name
  from public.class_planner_sections as section
  cross join lateral unnest(section.instructors) as instructor_name
), canonical_instructors as (
  select distinct
    lower(
      trim(
        regexp_replace(
          regexp_replace(instructor_name, '[[:space:]]+', ' ', 'g'),
          '[^A-Za-z0-9_ ]',
          '',
          'g'
        )
      )
    ) as canonical_key,
    regexp_replace(
      lower(extensions.unaccent(instructor_name)),
      '[^a-z0-9]',
      '',
      'g'
    ) as identity_key
  from catalog_instructor_names
), mapped_professors as (
  select
    professor.name_key as source_key,
    instructor.canonical_key,
    professor.name,
    professor.avg_rating,
    professor.avg_diff,
    professor.take_again_percent,
    professor.profile_url,
    professor.created_at,
    professor.updated_at
  from public.professor as professor
  join canonical_instructors as instructor
    on instructor.identity_key = regexp_replace(
      lower(extensions.unaccent(professor.name_key)),
      '[^a-z0-9]',
      '',
      'g'
    )
    or instructor.identity_key = regexp_replace(
      lower(extensions.unaccent(professor.name)),
      '[^a-z0-9]',
      '',
      'g'
    )
  where instructor.canonical_key <> ''
    and instructor.identity_key <> ''
), best_ratings as (
  select distinct on (canonical_key)
    canonical_key,
    name,
    avg_rating,
    avg_diff,
    take_again_percent,
    profile_url,
    created_at,
    updated_at
  from mapped_professors
  order by canonical_key, updated_at desc, source_key
), reconciled_professors as (
  insert into public.professor (
    name,
    name_key,
    avg_rating,
    avg_diff,
    take_again_percent,
    profile_url,
    created_at,
    updated_at
  )
  select
    name,
    canonical_key,
    avg_rating,
    avg_diff,
    take_again_percent,
    profile_url,
    created_at,
    updated_at
  from best_ratings
  on conflict (name_key) do update set
    name = excluded.name,
    avg_rating = excluded.avg_rating,
    avg_diff = excluded.avg_diff,
    take_again_percent = excluded.take_again_percent,
    profile_url = coalesce(excluded.profile_url, professor.profile_url)
  returning name_key
)
delete from public.professor as professor
using mapped_professors as mapped
where professor.name_key = mapped.source_key
  and exists (
    select 1
    from reconciled_professors as reconciled
    where reconciled.name_key = mapped.canonical_key
  )
  and not exists (
    select 1
    from reconciled_professors as reconciled
    where reconciled.name_key = professor.name_key
  );
