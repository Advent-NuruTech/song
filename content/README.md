# Content operations — no-code publishing contract

Production content is created in `admin-web`, stored in Supabase, and synchronized to the app without an app release. Administrators can add unlimited song/study categories and content records.

## Normal operation

1. In Admin > Categories, create a `Song` or `Study` category. Its stable key is used in data; its display name, color, icon, description, and order can be edited later.
2. In Songs or Studies, create the content and select a category.
3. Save as draft for review or publish. Published metadata appears after mobile background sync.
4. The reader explicitly downloads the full body. Removing the download keeps the catalog item.
5. Unpublish/delete creates a tombstone; mobile sync removes the local item and download record.

Category deletion is rejected while any live content uses it. Reassign that content first. Do not rename stable keys; change the display name instead.

## Bundled starter content

Files under `content/songs/` and `content/studies/` are only the offline starter set. Do not place the growing production corpus here. Run `npm run content:bundle` after deliberate starter-set edits and `npm run validate:content` before release.

Song JSON supports an optional category key:

```json
{"id":"EN_001","hymnNumber":1,"title":"Example","language":"english","category":"hymn","author":"","stanzas":[["Line"]],"chorus":null}
```

Study JSON uses the same stable category key:

```json
{"id":"study_001","category":"doctrine","title":"Example","subtitle":"","content":"...","author":"","isFeatured":false}
```

## Edge delivery contract

At scale, publish compact catalogs separately from immutable bodies:

- `items/songs/{id}.json`
- `items/studies/{id}.json`
- `/manifest/{channel}.json` for versioned catalogs

The configured CDN is tried first; Supabase published-item retrieval is the fallback. Adding content, languages, categories, or Bible versions must remain a data/publishing operation and must not require client code.
