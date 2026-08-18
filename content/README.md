# Content authoring — the "no rewrite" contract

Content scales by **adding data**, never by editing app code. Three collections,
three drop-in rules:

## Songs
Drop a JSON file under `content/songs/<language>/NNN.json`:
```json
{ "id": "EN_696", "hymnNumber": 696, "title": "...", "language": "english",
  "author": "...", "stanzas": [["line", "line"]], "chorus": ["line"] }
```
It is auto-discovered (`require.context`) and seeded on next launch. A new `<language>`
folder appears as a new language automatically.

## Studies
Drop a JSON file under `content/studies/`:
```json
{ "id": "study-001", "category": "Prophecy", "title": "...", "subtitle": "...",
  "content": "markdown or paragraphs", "author": "...", "isFeatured": true }
```

## Bible versions (any number, any language)
Drop a translation file under `content/bible/versions/<id>.json`:
```json
{ "Genesis": { "1": { "1": "In the beginning...", "2": "..." } } }
```
Optionally describe it in `content/bible/index.json` (name, abbreviation, language).
If you omit it, the file still works — the name is derived from the filename.
The version installs into the shared `bible_*` tables on demand; **no code changes.**

## Going remote (CDN) — same files, served from the edge
When `extra.contentBaseUrl` (app.json) or `EXPO_PUBLIC_CONTENT_URL` is set, the app
reads a manifest and hydrates the local SQLite cache from a CDN. See
`manifest.example.json` for the format. Bible versions can be remote too — list them in
`{baseUrl}/bible/index.json` with a `remotePath`, and they appear as downloadable
versions with zero client changes. This is how the corpus grows past what can ship in
the binary while the app stays lightweight (device caches only what is opened).
