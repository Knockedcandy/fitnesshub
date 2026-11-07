# Planner update — October 30, 2026

Matching A/B days now use the same exercises, in the same order, with identical
sets, reps, and rest. This covers Full Body, Upper, Lower, Push, Pull, and Legs.
Full Body C stays separate. The five-day schedule keeps its distinct sessions.
Calendar labels, rest days, and workout numbering are preserved.

Each day receives an independent deep copy. A manual swap or later edit changes
only that day. Generator version 8 uses the existing saved-plan refresh path,
so older plans with a saved profile are regenerated when opened in My Plan.

On short three-day plans, repeated A/B sessions may leave some muscle groups
below twice-weekly frequency. The calculated frequency and coverage note now
report this accurately, while retaining equipment, experience, movement-limit,
exercise-count, and per-muscle-cap rules.

## Verification with pictures

The matching exercise artwork is included in `public/exercises/`. The bundle
excludes generated build files and installed `node_modules`.

```bash
npm ci
npm run check
npm run dev
```

`npm run check` validates the artwork paths and image containers alongside the
application behavior.

## Completed validation

- ESLint passed.
- Project regression tests passed, including matching A/B across the existing
  192-profile matrix and all four focus modes over 3–6 day schedules.
- Mutation checks confirm paired arrays, exercises, and instructions are
  independent; manual swaps preserve all other calendar days.
- Equipment, experience, movement restriction, split, exercise-count, muscle
  cap, and frequency checks passed.
- Coach API regression checks and IndexedDB storage tests replace the old account-service mocks.
- The Next.js production build passed.
- HTTP smoke checks returned 200 for `/`, `/planner`, `/results`, `/search`,
  and `/assistant` on the production server.

Browser interaction testing was attempted but could not run: the available
Chromium process is blocked by the execution environment. Live coach-provider responses were not tested with real credentials.
