# Project memory rule

Before making a significant feature, architecture, data-model, dependency, release, or performance change, read `PROJECT_MEMORY.md` and the relevant section of `PROJECT.md`.

After completing any significant change or upgrade, update `PROJECT_MEMORY.md` in the same change. Record the date, outcome, important files/data migrations, verification performed, and any known follow-up. Also update roadmap status in `PROJECT.md` when applicable. Small copy, style, and isolated bug fixes do not require a memory entry.

Performance is a product requirement: catalog screens must use bounded/paginated queries and virtualized lists; full songs and studies must be hydrated on demand; startup must never wait for network content sync.
