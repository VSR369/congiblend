
-- 1) Core: Knowledge Sparks
create table if not exists public.knowledge_sparks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  category text,
  tags text[] not null default '{}',
  author_id uuid not null,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  view_count integer not null default 0,
  contributor_count integer not null default 1,
  total_edits integer not null default 0,
  content_length integer not null default 0,
  reactions_count integer not null default 0,
  last_edited_by uuid,
  last_edited_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_ks_active on public.knowledge_sparks (is_active, updated_at desc);
create index if not exists idx_ks_category on public.knowledge_sparks (category, view_count desc);
create index if not exists idx_ks_slug on public.knowledge_sparks (slug);
create index if not exists idx_ks_tags on public.knowledge_sparks using gin(tags);

-- Updated-at timestamp trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ks_set_updated_at on public.knowledge_sparks;
create trigger trg_ks_set_updated_at
before update on public.knowledge_sparks
for each row execute function public.set_updated_at();

-- RLS
alter table public.knowledge_sparks enable row level security;

-- View active sparks (public), authors can always see their own
drop policy if exists "ks_select" on public.knowledge_sparks;
create policy "ks_select"
on public.knowledge_sparks
for select
using (is_active = true or auth.uid() = author_id);

-- Authors can insert their own sparks
drop policy if exists "ks_insert" on public.knowledge_sparks;
create policy "ks_insert"
on public.knowledge_sparks
for insert
with check (auth.uid() = author_id);

-- Authors can update their sparks
drop policy if exists "ks_update_author" on public.knowledge_sparks;
create policy "ks_update_author"
on public.knowledge_sparks
for update
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

-- Authors can delete their sparks
drop policy if exists "ks_delete_author" on public.knowledge_sparks;
create policy "ks_delete_author"
on public.knowledge_sparks
for delete
using (auth.uid() = author_id);

--------------------------------------------------------------------------------
-- 2) Versions: Full edit history (no cross-table triggers to avoid RLS issues)
create table if not exists public.spark_content_versions (
  id uuid primary key default gen_random_uuid(),
  spark_id uuid not null references public.knowledge_sparks(id) on delete cascade,
  version_number integer not null,
  content jsonb not null default '{}',
  content_html text,
  content_plain text,
  change_summary text,
  edit_type text default 'modification',
  word_count integer not null default 0,
  character_count integer not null default 0,
  sections_modified text[] not null default '{}',
  edited_by uuid not null,
  created_at timestamptz not null default now(),
  unique(spark_id, version_number)
);

-- Search/ordering indexes
create index if not exists idx_scv_spark_order on public.spark_content_versions (spark_id, version_number desc);
create index if not exists idx_scv_search on public.spark_content_versions using gin (to_tsvector('english', coalesce(content_plain, '')));

-- RLS
alter table public.spark_content_versions enable row level security;

-- Everyone can read versions
drop policy if exists "scv_select" on public.spark_content_versions;
create policy "scv_select"
on public.spark_content_versions
for select
using (true);

-- Authenticated users can add versions (anyone can enhance)
drop policy if exists "scv_insert" on public.spark_content_versions;
create policy "scv_insert"
on public.spark_content_versions
for insert
with check (auth.uid() = edited_by);

-- No generic updates/deletes to preserve history
--------------------------------------------------------------------------------
-- 3) Comments/Discussions
create table if not exists public.spark_comments (
  id uuid primary key default gen_random_uuid(),
  spark_id uuid not null references public.knowledge_sparks(id) on delete cascade,
  parent_comment_id uuid references public.spark_comments(id) on delete cascade,
  user_id uuid not null,
  content text not null,
  comment_type text default 'general',
  is_resolved boolean not null default false,
  resolved_by uuid,
  upvotes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.spark_comments enable row level security;

-- Anyone can read comments
drop policy if exists "sc_select" on public.spark_comments;
create policy "sc_select"
on public.spark_comments
for select
using (true);

-- Authors can create their comments
drop policy if exists "sc_insert" on public.spark_comments;
create policy "sc_insert"
on public.spark_comments
for insert
with check (auth.uid() = user_id);

-- Comment authors can update their own comments
drop policy if exists "sc_update_own" on public.spark_comments;
create policy "sc_update_own"
on public.spark_comments
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Comment authors can delete their comments
drop policy if exists "sc_delete_own" on public.spark_comments;
create policy "sc_delete_own"
on public.spark_comments
for delete
using (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- 4) Bookmarks
create table if not exists public.spark_bookmarks (
  id uuid primary key default gen_random_uuid(),
  spark_id uuid not null references public.knowledge_sparks(id) on delete cascade,
  user_id uuid not null,
  bookmark_type text not null default 'favorite',
  notes text,
  created_at timestamptz not null default now(),
  unique(spark_id, user_id)
);

alter table public.spark_bookmarks enable row level security;

-- Users can view their own bookmarks
drop policy if exists "sb_select_own" on public.spark_bookmarks;
create policy "sb_select_own"
on public.spark_bookmarks
for select
using (auth.uid() = user_id);

-- Users can add their own bookmarks
drop policy if exists "sb_insert_own" on public.spark_bookmarks;
create policy "sb_insert_own"
on public.spark_bookmarks
for insert
with check (auth.uid() = user_id);

-- Users can remove their own bookmarks
drop policy if exists "sb_delete_own" on public.spark_bookmarks;
create policy "sb_delete_own"
on public.spark_bookmarks
for delete
using (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- 5) Contributors (lightweight tracking)
create table if not exists public.spark_contributors (
  id uuid primary key default gen_random_uuid(),
  spark_id uuid not null references public.knowledge_sparks(id) on delete cascade,
  user_id uuid not null,
  contribution_type text not null default 'editor',
  edit_count integer not null default 0,
  characters_added integer not null default 0,
  characters_removed integer not null default 0,
  sections_contributed text[] not null default '{}',
  first_contribution_at timestamptz not null default now(),
  last_contribution_at timestamptz not null default now(),
  contribution_quality_score numeric not null default 0,
  is_active_contributor boolean not null default true,
  unique(spark_id, user_id)
);

alter table public.spark_contributors enable row level security;

-- Everyone can read contributors
drop policy if exists "scon_select" on public.spark_contributors;
create policy "scon_select"
on public.spark_contributors
for select
using (true);

-- Users can create/update their own contributor row (if you choose to track client-side initially)
drop policy if exists "scon_insert_own" on public.spark_contributors;
create policy "scon_insert_own"
on public.spark_contributors
for insert
with check (auth.uid() = user_id);

drop policy if exists "scon_update_own" on public.spark_contributors;
create policy "scon_update_own"
on public.spark_contributors
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- 6) Categories
create table if not exists public.spark_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  color_code varchar(10),
  icon_name text,
  parent_category_id uuid references public.spark_categories(id),
  spark_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.spark_categories enable row level security;

-- Publicly readable
drop policy if exists "scat_select" on public.spark_categories;
create policy "scat_select"
on public.spark_categories
for select
using (true);

-- Optional: allow authenticated to manage. Adjust later if you add roles.
drop policy if exists "scat_all_auth" on public.spark_categories;
create policy "scat_all_auth"
on public.spark_categories
for all
using (auth.uid() is not null)
with check (auth.uid() is not null);

--------------------------------------------------------------------------------
-- 7) Analytics (views; minimal)
create table if not exists public.spark_analytics (
  id uuid primary key default gen_random_uuid(),
  spark_id uuid not null references public.knowledge_sparks(id) on delete cascade,
  user_id uuid,
  action_type text not null, -- 'view', 'edit', 'bookmark'
  session_duration integer,
  created_at timestamptz not null default now()
);

alter table public.spark_analytics enable row level security;

-- Anyone can insert analytics events
drop policy if exists "sa_insert" on public.spark_analytics;
create policy "sa_insert"
on public.spark_analytics
for insert
with check (true);

-- Users can read only their own analytics (optional)
drop policy if exists "sa_select_own" on public.spark_analytics;
create policy "sa_select_own"
on public.spark_analytics
for select
using (user_id = auth.uid());

--------------------------------------------------------------------------------
-- 8) Realtime
alter table public.spark_content_versions replica identity full;
alter table public.spark_comments replica identity full;

-- Add tables to realtime publication
alter publication supabase_realtime add table public.knowledge_sparks;
alter publication supabase_realtime add table public.spark_content_versions;
alter publication supabase_realtime add table public.spark_comments;
