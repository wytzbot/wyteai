# Wyte AI Vercel API

These endpoints are the server boundary for Wyte AI.

Required Vercel environment variables are documented in `../.env.example`.

Do not put AI provider keys, Supabase secret credentials, Flutterwave v4 credentials,
or webhook secrets in Flutter source or GitHub.

`generate.js` creates a `generation_jobs` row in Supabase Postgres and atomically
reserves credits via the `consume_credits` RPC before calling the AI provider,
refunding via `refund_credits` on failure. `flutterwave-create.js` and
`flutterwave-webhook.js` create the Flutterwave-hosted checkout link and
independently re-verify each transaction (status, reference, amount, currency)
before granting Pro, so a fake or replayed webhook call cannot grant value.
