create or replace function public.replace_catalog(
  p_term text,
  p_courses jsonb,
  p_professors jsonb
)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  inserted_courses integer;
begin
  if p_term is null or length(trim(p_term)) = 0 then
    raise exception 'term is required';
  end if;

  if jsonb_typeof(p_courses) <> 'array' or jsonb_array_length(p_courses) = 0 then
    raise exception 'courses must be a non-empty array';
  end if;

  if jsonb_typeof(p_professors) <> 'array' then
    raise exception 'professors must be an array';
  end if;

  update public.terms
  set is_active = false
  where is_active = true;

  insert into public.terms (term, is_active)
  values (p_term, true)
  on conflict (term) do update set is_active = true;

  delete from public.courses;
  delete from public.professor;

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
  where coalesce(professor_item ->> 'nameKey', '') <> '';

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
    course_item ->> 'Term',
    coalesce(course_item ->> 'Teacher', ''),
    coalesce(course_item ->> 'nameKey', ''),
    case
      when jsonb_typeof(course_item -> 'Lecture') = 'null' then null
      else course_item -> 'Lecture'
    end,
    case
      when jsonb_typeof(course_item -> 'Labs') = 'array' then course_item -> 'Labs'
      else '[]'::jsonb
    end,
    case
      when jsonb_typeof(course_item -> 'Discussions') = 'array' then course_item -> 'Discussions'
      else '[]'::jsonb
    end,
    case
      when jsonb_typeof(course_item -> 'Midterms') = 'array' then course_item -> 'Midterms'
      else '[]'::jsonb
    end,
    case
      when jsonb_typeof(course_item -> 'Final') = 'null' then null
      else course_item -> 'Final'
    end,
    case
      when jsonb_typeof(course_item -> 'rmp') = 'null' then null
      else course_item -> 'rmp'
    end
  from jsonb_array_elements(p_courses) as course_item
  where course_item ->> 'Name' is not null
    and course_item ->> 'Term' is not null;

  get diagnostics inserted_courses = row_count;

  if inserted_courses = 0 then
    raise exception 'no valid courses to insert';
  end if;
end;
$$;

revoke all on function public.replace_catalog(text, jsonb, jsonb) from public;
revoke all on function public.replace_catalog(text, jsonb, jsonb) from anon;
revoke all on function public.replace_catalog(text, jsonb, jsonb) from authenticated;
grant execute on function public.replace_catalog(text, jsonb, jsonb) to service_role;
