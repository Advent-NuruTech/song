-- Advent Pro migration 011: private, account-synced notes and ordered song playlists.
-- Rows are soft-deleted so offline clients can reconcile deletions safely.

begin;

create table if not exists public.user_notes (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled note',
  content_html text not null default '<p></p>',
  plain_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create index if not exists idx_user_notes_owner_updated
  on public.user_notes(user_id, updated_at desc);

create table if not exists public.song_playlists (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false,
  constraint song_playlists_title_check check (char_length(btrim(title)) between 1 and 120)
);

create index if not exists idx_song_playlists_owner_updated
  on public.song_playlists(user_id, updated_at desc);

create table if not exists public.song_playlist_items (
  playlist_id uuid not null references public.song_playlists(id) on delete cascade,
  song_id text not null references public.songs(id) on delete cascade,
  position integer not null check (position >= 0),
  added_at timestamptz not null default now(),
  primary key (playlist_id, song_id),
  unique (playlist_id, position)
);

alter table public.user_notes enable row level security;
alter table public.song_playlists enable row level security;
alter table public.song_playlist_items enable row level security;

drop policy if exists user_notes_owner_all on public.user_notes;
create policy user_notes_owner_all on public.user_notes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists song_playlists_owner_all on public.song_playlists;
create policy song_playlists_owner_all on public.song_playlists for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists song_playlist_items_owner_all on public.song_playlist_items;
create policy song_playlist_items_owner_all on public.song_playlist_items for all
  using (exists (
    select 1 from public.song_playlists p
    where p.id = playlist_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.song_playlists p
    where p.id = playlist_id and p.user_id = auth.uid() and not p.deleted
  ));

grant select, insert, update, delete on public.user_notes to authenticated;
grant select, insert, update, delete on public.song_playlists to authenticated;
grant select, insert, update, delete on public.song_playlist_items to authenticated;

commit;

