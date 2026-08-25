# Supabase migrations

Run migrations in numeric order. For a new project use:

1. `001_content_foundation.sql`
2. `002_accounts_and_roles.sql`
3. `003_security_policies_and_seeds.sql`
4. `004_study_engagement.sql`
5. `005_api_role_privileges.sql`
6. `006_api_privileges_and_admin_provisioning.sql`
7. `007_song_catalog_privileges.sql`
8. `008_media_module.sql`
9. `009_study_discovery.sql`
10. `010_media_authoring_and_search.sql`

With the Supabase CLI, link the production project once and run `supabase db push`.
In the SQL Editor, open and run each file in order. Never put a service-role key
in the mobile app or browser.

## Future changes

Do not edit an already deployed migration. Add a new file using the next number:

```text
010_add_study_revisions.sql
011_tighten_media_policies.sql
```

Each migration should be focused, transactional where practical, safe to deploy
before the matching app version, and include rollback notes for destructive work.
Test against a staging Supabase project before production.

`schema.sql` is retained only as the legacy combined snapshot. New database work
belongs in `supabase/migrations/`.
