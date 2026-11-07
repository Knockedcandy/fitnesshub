# FitLifeHub — local data edition

This version saves the workout profile, generated plan, nutrition targets,
food logs, weight logs, personal records, workout completions, and progress
photos in IndexedDB. No account, remote database, or database credentials are
needed. The existing matching A/B workouts remain intact.

## Run locally

Use Node.js 22.13.0 or newer.

```bash
npm ci
npm run dev
```

Open http://localhost:3000. Keep the same browser profile, hostname, and port
when testing: browser data belongs to that exact website origin.

## Saving and backups

- Saves finish only after the IndexedDB transaction commits. Errors are shown
  instead of claiming a failed write was saved.
- Existing guest records from localStorage migrate once on the same origin.
  The original copies are left intact until you delete local data.
- The My Data page at `/account` exports a versioned JSON backup, including
  photos. Import replaces current records only after validation and an explicit
  RESTORE confirmation. Delete Local Data requires DELETE confirmation.
- Photos are stored as binary Blobs, not localStorage strings. Supported uploads
  are JPEG, PNG, WebP, GIF, and AVIF, up to 5 MB each. Backup imports support files
  up to 200 MB. Exported files contain private fitness information and photos.
- Data stays in this browser; it does not automatically sync to other devices.
  Clearing site data, private-browsing cleanup, browser eviction, or losing the
  device can remove it. Export regular backups, especially before moving domains.
- This version does not fetch or delete data saved by an older online version.
  Anyone with access to the browser profile can access these local records.

The old login, signup, and password-reset URLs now lead to My Data. No password
or email is requested.

## AI coach

The planner and data saving work without API keys. The coach returns built-in
plan guidance unless `OPENROUTER_API_KEY` is configured on the server. Live
coaching still needs internet and sends the question, recent messages, and a
limited plan summary to the provider; photos and progress logs are not sent.
See `.env.example` for optional settings.

Live-coach quotas are now bounded in-memory, per IP and per server instance.
They reset on restart and are not shared across instances. Set provider-side
spending limits if enabling paid coaching on a public deployment.

## Verification and pictures

The matching exercise artwork is included under `public/exercises/`. Exercises
without a matching image continue to display their written guide.

```bash
npm run check
```

This runs lint, the planner/project regression checks, coach API tests,
IndexedDB persistence tests, a Next.js production build, and the artwork files.
Test dependencies are development only; the browser persistence layer uses the
native IndexedDB API.

For Cloudflare Workers, run `npm run build:vinext` and preview with
`npm run start:vinext`. See `DEPLOYMENT.md` for GitHub deployment settings and
required production variables. The app is not an installable offline PWA.
