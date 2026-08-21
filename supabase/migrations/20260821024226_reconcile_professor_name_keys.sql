with duplicate_pairs as (
  select distinct on (legacy.name_key)
    legacy.name_key as legacy_key,
    duplicate.name_key as duplicate_key,
    duplicate.avg_rating,
    duplicate.avg_diff,
    duplicate.take_again_percent,
    duplicate.profile_url
  from public.professor as legacy
  join public.professor as duplicate
    on lower(trim(legacy.name)) = lower(trim(duplicate.name))
    and replace(legacy.name_key, ' ', '') = replace(duplicate.name_key, ' ', '')
    and legacy.name_key <> duplicate.name_key
  where length(legacy.name_key) - length(replace(legacy.name_key, ' ', ''))
      < length(duplicate.name_key) - length(replace(duplicate.name_key, ' ', ''))
  order by legacy.name_key, duplicate.updated_at desc, duplicate.name_key
), updated_legacy_rows as (
  update public.professor as legacy
  set
    avg_rating = duplicate.avg_rating,
    avg_diff = duplicate.avg_diff,
    take_again_percent = duplicate.take_again_percent,
    profile_url = coalesce(duplicate.profile_url, legacy.profile_url)
  from duplicate_pairs as duplicate
  where legacy.name_key = duplicate.legacy_key
  returning duplicate.duplicate_key
)
delete from public.professor as duplicate
using updated_legacy_rows
where duplicate.name_key = updated_legacy_rows.duplicate_key;
