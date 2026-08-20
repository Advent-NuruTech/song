-- Advent Pro migration 005: privileges required by study sync/engagement.
--
-- RLS policies decide which rows a caller may access, but the Postgres role
-- must also have the matching table privilege. Without these narrow grants,
-- PostgREST rejects the published-study sync before RLS is evaluated and the
-- bundled studies never become valid targets for likes and comments.

grant usage on schema public to anon, authenticated, service_role;

-- RLS continues to expose only published studies and deletion tombstones.
grant select on table public.studies to anon, authenticated;

-- The local, server-only import script upserts the bundled study catalog. The
-- service role is never shipped in the mobile app or browser.
grant select, insert, update on table public.studies to service_role;
grant usage, select on sequence public.content_revision_seq to service_role;

-- Comments are read through the safe engagement RPC. Direct deletion is used
-- for a reader deleting their own comment and remains protected by RLS.
grant delete on table public.study_comments to authenticated;
