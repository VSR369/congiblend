
-- 1) Create a persistent bookmarks table for posts
create table if not exists public.post_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  post_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

-- 2) Enable RLS
alter table public.post_bookmarks enable row level security;

-- 3) Policies: users manage only their own bookmarks
create policy "Users can view their own post bookmarks"
on public.post_bookmarks
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own post bookmarks"
on public.post_bookmarks
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can delete their own post bookmarks"
on public.post_bookmarks
for delete
to authenticated
using (auth.uid() = user_id);

-- No update policy needed (no updates expected).
