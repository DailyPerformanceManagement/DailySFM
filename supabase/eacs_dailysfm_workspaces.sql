-- DailySFM — independent EACS cloud persistence (already applied to EACS).
-- Project: lean-command-center (gibsgwfuvuxfgicpvybm) / Frankfurt.
-- Original B+K project must never be targeted by this migration.
-- All cloud rows are owned by individual Supabase Auth users.

create table if not exists public.dailysfm_workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  workspace_key text not null default 'original-dpm'
    check (length(workspace_key) between 1 and 80 and workspace_key ~ '^[a-zA-Z0-9_-]+$'),
  snapshot jsonb not null default '{}'::jsonb
    check (jsonb_typeof(snapshot) = 'object' and pg_column_size(snapshot) < 5242880),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,workspace_key)
);
create index if not exists dailysfm_workspaces_user_update_idx
  on public.dailysfm_workspaces(user_id,updated_at desc);
alter table public.dailysfm_workspaces enable row level security;
revoke all on public.dailysfm_workspaces from public,anon;
grant select,insert,update,delete on public.dailysfm_workspaces to authenticated;
create policy "dailysfm_read_own" on public.dailysfm_workspaces
  for select to authenticated using (user_id = (select auth.uid()));
create policy "dailysfm_insert_own" on public.dailysfm_workspaces
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "dailysfm_update_own" on public.dailysfm_workspaces
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "dailysfm_delete_own" on public.dailysfm_workspaces
  for delete to authenticated using (user_id = (select auth.uid()));
create trigger dailysfm_set_updated_at
  before update on public.dailysfm_workspaces
  for each row execute function public.set_updated_at();

comment on table public.dailysfm_workspaces is
  'User-owned snapshots of the independent DailySFM cockpit in EACS. Does not access B+K.';
