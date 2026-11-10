# Cloudflare Workers deployment through GitHub

This Next.js application has a server route at `/api/coach`. Deploy it as a
Cloudflare **Worker** with the included vinext configuration. A Cloudflare Pages
static export cannot serve that route. Workers can connect to the same GitHub
repository and automatically build on pushes.

## Before the first push

Use Node.js 24.22.1. From the project root, run:

```bash
npm ci
npm run check
npm run build:vinext
npx vinext-cloudflare deploy --dry-run
```

Commit the project root, including `package.json`, `package-lock.json`,
`vite.config.ts`, `cloudflare.config.ts`, `src/`, and `public/`. Keep the
exercise artwork in `public/exercises/` so its URLs work. The `.gitignore`
excludes `.env.local`, `.dev.vars`, dependencies, and generated build output.

## Connect Cloudflare to GitHub

In Cloudflare, open Workers & Pages, select **Create application**, choose
**GitHub**, and select your repository. Use the directory that
contains `package.json` as the root directory. Set the production branch to
your main branch, leave the build command empty, and set the deploy command to
`npm run deploy:vinext`. That command builds and deploys the app. If you enable
preview builds, set the preview command to
`npx vinext-cloudflare previews deploy`. The included config names the Worker
`fitnesshub`; keep the dashboard Worker name consistent. If your existing
Cloudflare Worker has a different name, change `worker.name` in
`cloudflare.config.ts` to match it before pushing.

Set `NODE_VERSION` to `24.22.1` in Build Variables and Secrets if Cloudflare
selects an older Node version. The default `npx wrangler deploy` command
tries to configure this project with OpenNext instead of using its vinext
configuration.

The live site will use a `*.workers.dev` URL until you attach a custom domain.
After you know the final HTTPS origin, configure the following variables for
the Worker and its GitHub build, then rebuild/deploy so generated metadata and
public values use the right URL:

- `NEXT_PUBLIC_SITE_URL` and `APP_URL`: the same final HTTPS origin, without a
  trailing path.
- `NEXT_PUBLIC_SUPPORT_EMAIL`: your actual support email.
- `NEXT_PUBLIC_LEGAL_NAME`: the site operator's name or business name.
- `NEXT_PUBLIC_LEGAL_EFFECTIVE_DATE`: the effective date in `YYYY-MM-DD` format.

The optional live coach needs `OPENROUTER_API_KEY` as a Worker secret and
`AI_RATE_LIMIT_SALT` as a secret with at least 32 random characters. The
defaults for `OPENROUTER_MODEL`, `OPENROUTER_BASE_URL`, and `APP_TITLE` are in
`.env.example`. Never put API keys in `NEXT_PUBLIC_` variables or commit a
local environment file. Without a provider key, the coach serves built-in
guidance. Run `npm run check:deploy` with production variables available to
verify the URL and legal settings before launch.

Workout data, exercise weight history, and photos remain in each browser's IndexedDB. The site does not
sync records between devices. Moving from one hostname to another changes the
storage origin; export a backup from My Data and restore it on the new URL.
Live-coach quotas use memory in each Worker instance and reset when instances
restart. For a public paid provider key, set a spending limit with the provider.

## If you specifically need Cloudflare Pages

Pages can host a static Next.js export, but this app's `/api/coach` route would
have to be replaced with a separate Worker or Pages Function and the Next.js
build changed to static export. The included GitHub deployment uses Workers to
preserve the current coach behavior.
