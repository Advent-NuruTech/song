-- Advent Pro migration 007: privileges required by song sync/import.
--
-- RLS continues to limit public catalog reads to published rows and deletion
-- tombstones. These grants only allow PostgREST to evaluate those policies.

grant select on table public.songs to anon, authenticated;

-- The server-only bundled-content importer requires explicit table privileges
-- even though the service role bypasses row-level security.
grant select, insert, update on table public.songs to service_role;
