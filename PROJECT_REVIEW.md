# Local-data conversion review

Replaced remote account/database/photo services with native IndexedDB. Removed
the database SDKs, account server endpoints, session proxy, authentication
components, SQL migrations, and database environment variables. Login/signup/
password-reset routes redirect to My Data. The planner's A/B behavior, workout
filters, search, nutrition logic, and tutorial paths are retained.

Planner saves are atomic across profile, plan, and nutrition. Log additions
use read/write transactions to avoid lost concurrent writes. Photo metadata
and binary blobs are saved/deleted together. Legacy localStorage data migrates
once without overwriting newer records. Data is not described as cloud-synced.

My Data provides versioned exports including photos, validated atomic restores,
and explicit confirmation for replacement/deletion. Invalid or aborted restores
leave existing data intact. Local deletion prevents migration from resurrecting
old records. Failed storage initialization displays an actionable retry message.

Validation details are recorded in LOCAL_DATA_VALIDATION.md. Tests use a
standards-based IndexedDB emulator for automated transaction coverage. Actual
browser persistence is scoped to the browser profile and website origin.

Limitations: no automatic device sync, no migration of previous remote-account
records, no full offline PWA behavior, and no durable distributed AI quota.
The matching exercise artwork is bundled under `public/exercises/`; the full
artwork checks run with `npm run check`.
