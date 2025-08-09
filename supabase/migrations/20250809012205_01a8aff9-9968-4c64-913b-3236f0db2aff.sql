
-- 1) Helper: who is the author of a spark?
create or replace function public.is_spark_author(p_spark_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.knowledge_sparks ks
    where ks.id = p_spark_id
      and ks.author_id = p_user_id
  );
$$;

-- 2) RLS: refine INSERT permissions on spark_content_versions
-- Drop the existing insert policy if present
drop policy if exists "scv_insert" on public.spark_content_versions;

-- Authors can insert any edit (including replacement)
create policy "scv_insert_authors_any"
on public.spark_content_versions
for insert
with check (
  auth.uid() = edited_by
  and public.is_spark_author(spark_id, auth.uid())
);

-- Non-authors can only append/modify (no replacement)
create policy "scv_insert_non_authors_append_only"
on public.spark_content_versions
for insert
with check (
  auth.uid() = edited_by
  and not public.is_spark_author(spark_id, auth.uid())
  and coalesce(lower(edit_type), 'modification') in ('modification','append')
);

-- 3) BEFORE INSERT trigger: set version_number, normalize edit_type,
--    compute counts, and block replacements by non-authors.
create or replace function public.tg_before_insert_scv_enforce()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  -- Auto-increment version_number if not provided
  if new.version_number is null or new.version_number <= 0 then
    select coalesce(max(version_number), 0) + 1
      into new.version_number
    from public.spark_content_versions
    where spark_id = new.spark_id;
  end if;

  -- Normalize edit_type
  if new.edit_type is null or new.edit_type = '' then
    new.edit_type := 'modification';
  end if;

  -- Enforce: only the author can replace
  if lower(new.edit_type) = 'replacement'
     and not public.is_spark_author(new.spark_id, new.edited_by) then
    raise exception 'Only the author can replace content. Please use append/modification instead.';
  end if;

  -- Best-effort counts if not provided
  if new.character_count is null or new.character_count = 0 then
    new.character_count := coalesce(length(new.content_plain), 0);
  end if;

  if new.word_count is null or new.word_count = 0 then
    if new.content_plain is null or btrim(new.content_plain) = '' then
      new.word_count := 0;
    else
      new.word_count := coalesce(
        cardinality(regexp_split_to_array(
          btrim(regexp_replace(new.content_plain, '\s+', ' ', 'g')), ' '
        )),
        0
      );
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_before_insert_scv_enforce on public.spark_content_versions;

create trigger trg_before_insert_scv_enforce
before insert on public.spark_content_versions
for each row
execute function public.tg_before_insert_scv_enforce();
