# Local storage validation

This bundle uses native IndexedDB for application records and binary photos.
There are no remote database SDKs, credentials, session middleware, account
APIs, or SQL migrations in the source bundle.

## Checks

- ESLint and the Next.js production build.
- Existing project/planner regressions: 916 searchable exercises, matching A/B
  sessions across the 192-profile matrix, all focus modes, equipment and
  movement restrictions, muscle caps, swaps, nutrition, and navigation.
- Storage tests using fake-indexeddb: one-time migration, reopen persistence,
  concurrent log additions, log CRUD, binary photo CRUD, backup round trips,
  invalid backup rejection, atomic rollback after a failed restore, deletion
  without resurrecting legacy records, and recovery after an unavailable open.
- Component interaction tests using jsdom, React Testing Library, and the
  IndexedDB emulator: generate and reopen a plan; reject a simulated failed
  save without changing the saved profile or navigating; add/reopen/delete food;
  save weight and PR entries; save/reopen a photo; download a backup; and require
  explicit input before restoring or deleting data. Framework navigation/image
  wrappers and chart drawing are mocked in this component test harness.
- Production HTTP smoke checks: home, planner, results, nutrition, progress,
  My Data, and assistant return 200. Old login/signup/password-reset routes
  redirect to My Data. The retired account API returns 404. The coach returns
  built-in guidance without a provider key.
- Production environment verification accepts a local-data deployment with no
  remote database configuration or live-coach key.

Run `npm run check` to repeat the lint, regression, artwork, storage, component,
and build checks. Run `npm run test:storage` for storage/component checks only.

## Verification limits

The transaction and component checks use an IndexedDB emulator and a DOM test
environment; they are not a full graphical-browser or cross-browser test.
No real paid coach-provider response was requested. Browser eviction behavior, mobile
storage limits, and real-device backup downloads should be checked on the
browser/device where this version will be used.
