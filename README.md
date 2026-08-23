# Wyte AI — HTML / CSS / JS build

This is the Flutter app rewritten as a plain HTML, CSS and vanilla‑JS
single‑page app. Every screen from the original app is here — Welcome,
Create, Suggestions, Templates, Gallery, Projects, Brand Kit, Pricing and
Settings (with Privacy/Terms/Security) — and it talks to the **same, unchanged**
backend: the serverless functions in `/api` and your existing Supabase
project. Nothing on the server side changed, so no data migration is needed.

## What changed vs. the Flutter build

- No Flutter, no Dart, no build step. The whole client is `index.html` +
  `css/style.css` + the ES modules in `js/`.
- Auth and API calls now go through the official `@supabase/supabase-js`
  library (loaded from a CDN) instead of `supabase_flutter`, but they hit
  the exact same endpoints (`Supabase.auth`, `/api/credits`,
  `/api/generate`, `/api/flutterwave-create`).
- Config that used to be injected at build time with `--dart-define` is now
  read at runtime from `js/config.js`.
- Added: generated images now actually render on screen (in the Create
  workspace and in Gallery), with a small local history cached in the
  browser — the original UI only showed a placeholder grid.
- Added: a signature animated ink‑stroke logo mark and drifting aurora
  background with cursor parallax on the Welcome screen, a paired
  display/body/mono type system (Bricolage Grotesque + Inter + IBM Plex
  Mono), and a subtle grain texture across the app — a distinct visual
  identity on top of the original dark violet/cyan palette.

## Setup

1. Open `js/config.js` and fill in:
   ```js
   window.WYTE_CONFIG = {
     SUPABASE_URL: "https://xxxxx.supabase.co",
     SUPABASE_PUBLISHABLE_KEY: "your-anon-key",
     API_BASE_URL: "", // leave blank when deployed on the same origin as /api
   };
   ```
2. Deploy `/api` and this static site together on Vercel (same project as
   before — the environment variables `SUPABASE_URL`, `SUPABASE_SECRET_KEY`,
   `FLW_SECRET_KEY`, `APP_BASE_URL`, etc. described in `SUPABASE_SETUP.md`
   and `AI_AND_STORAGE.md` are unchanged).
3. Add your production URL as an allowed redirect URL in Supabase Auth →
   URL Configuration, same as before.
4. Open `index.html` (or your deployed URL). No build command required —
   `vercel.json` just serves the static files and the `/api` functions.

## File map

```
index.html            entry point / shell
css/style.css          design system + all component styles
js/config.js            fill in Supabase keys here
js/supabase-client.js   Supabase client + auth (was lib/supabase.dart, lib/auth.dart)
js/api.js               credits / generate / checkout calls (was lib/services.dart, lib/payments.dart)
js/plans.js             plan data (was lib/plans.dart)
js/legal.js             privacy/terms/security copy (was in lib/screens.dart)
js/icons.js             small inline icon set
js/app.js               router + all screens (was lib/app.dart, screens.dart, widgets.dart, pricing.dart)
api/                     unchanged Vercel serverless functions
supabase_schema.sql      unchanged database schema
```
