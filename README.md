# Wyte AI — Flutter Web

Frontend: Flutter Web. Backend: Vercel serverless functions under `/api`.
Auth & database: Supabase (Google-only sign-in, Postgres, private Storage).
AI: fal.ai. Payments: Flutterwave (v3 Standard checkout + verification).

See `AI_AND_STORAGE.md` for the full architecture and `PRICING_AND_UNIT_ECONOMICS.md`
for the credit/plan model.

## 1. Supabase

1. Create a Supabase project and run `supabase_schema.sql` against it (tables, RLS
   policies, the private `generated` storage bucket, and the `consume_credits` /
   `refund_credits` / `grant_pro_subscription` functions).
2. In Supabase Auth, enable the **Google** provider and add your deployed app
   domain to the redirect allow-list.
3. See `SUPABASE_SETUP.md` for details.

## 2. Flutterwave

The frontend never receives any Flutterwave secret.

Set these server-side as Vercel environment variables (see `.env.example`):

- `FLW_SECRET_KEY` — classic v3 secret key, used to create the hosted checkout
  link (`api/flutterwave-create.js`) and to re-verify transactions
  (`api/flutterwave-webhook.js`)
- `FLW_SECRET_HASH` — the webhook secret hash configured in your Flutterwave
  dashboard

In the Flutterwave Dashboard, set the webhook URL to your deployed
`/api/flutterwave-webhook` endpoint and configure the same secret hash as
`FLW_SECRET_HASH`. Flutterwave sends that secret hash back verbatim in the
`verif-hash` header of every webhook call; the handler checks it with a
timing-safe comparison before doing anything else.

### Important production payment note

The webhook never grants Pro from the payload alone. After the signature check
passes, it independently re-verifies the transaction with Flutterwave
(`verify_by_reference`) and only calls `grant_pro_subscription` once status,
reference, amount and currency all match what was recorded when the checkout
was created. This prevents fake callbacks and duplicate grants — the RPC itself
is idempotent, so a retried webhook delivery can't grant Pro twice.

## 3. AI providers

Add `FAL_KEY` only as a server-side secret in Vercel. The Flutter client never
talks to fal.ai directly — it calls `api/generate.js`, which reserves credits,
calls fal.ai, and stores the result in Supabase Storage.

## Run

```bash
flutter pub get
flutter run -d chrome --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_PUBLISHABLE_KEY=... --dart-define=API_BASE_URL=...
```

## Build

```bash
flutter build web --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_PUBLISHABLE_KEY=... --dart-define=API_BASE_URL=...
```

`API_BASE_URL` is the base URL of the deployed Vercel project (where `/api/*`
is served).

## Deploy

1. `flutter build web` (outputs to `build/web`).
2. Deploy the Flutter build output plus `api/` and `vercel.json` to Vercel —
   Vercel auto-detects the `api/*.js` files as serverless functions.
3. Connect the GitHub repository to Vercel for CI deploys, or upload directly.
