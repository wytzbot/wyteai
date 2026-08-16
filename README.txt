WYTE AI — upgraded build (accounts, device-based free-tier defense, verified payments)

Core:
- Single-file frontend: index.html.
- Firebase Auth: Email/Password (+ username at signup) + Google + password reset + email verification.
- Gemini screenshot vision via /api/ai (now requires sign-in + daily quota).
- Browser Canvas rendering keeps real app UI sharp.
- IndexedDB for local projects; avoids putting images in Firestore.
- Optional Pro cloud backup via Vercel Blob (free tier), expiring after 20
  days (enforced server-side by cron — nothing is kept indefinitely).
- Flutterwave one-time payment ($2.50), verified server-side before Pro is granted.

What changed in this pass:
- FIXED a critical bug where a delete-project button used `await` in a
  non-async function — a JS syntax error that broke the ENTIRE app (every
  button, not just Delete), because the whole <script type="module"> failed
  to parse.
- Signup now collects a username (mapped to email in Firestore `usernames/`)
  so people can sign in with either username or email.
- Projects, export count, and Pro status are now scoped per Firebase UID
  instead of shared across every account on the same browser.
- Pro status is server-authoritative (Firestore `users/{uid}.pro`), not a
  client-settable localStorage flag anyone could fake via devtools.
- New /api/verify-payment route verifies the Flutterwave tx_ref server-side
  (via Flutterwave's verify-by-reference API) before granting Pro. Each
  tx_ref can only activate Pro once (tracked in `usedPayments`).
- New /api/register-device route: on signup, the client sends a persistent
  device id (localStorage, survives sign-out). The first Firebase account
  ever seen on a device gets the normal 3-project free tier; any different
  account later seen on that same device is flagged freeTierBlocked and
  gets 0 free saved projects until they upgrade — closing the "sign out,
  make a new account, get 3 more free projects" loop. This is a
  device-persistence check, not a hardware fingerprint: clearing
  localStorage or a different browser profile still resets it.
- /api/ai now requires a signed-in user's Firebase ID token and enforces a
  daily quota (5/day free, 50/day Pro — tune in api/ai.js) so it can't be
  called anonymously to burn your Gemini API cost.
- Google sign-in now falls back to signInWithRedirect if the popup is
  blocked/closed/fails on network error (helps mobile browsers).
- Removed the "AI settings" modal — it was unreachable dead UI (nothing
  ever opened it, its Run button had no handler).
- Signup sends a verification email; unverified accounts see a banner with
  a resend button.
- Groq and fal are now really wired, both gated to Pro server-side (never
  trust the client's "isPro" flag) with their own daily quota buckets:
  - Groq ("Copy variations", Pro): fast text-only rewrite of headline/
    subtitle into 3 alternates, via llama-3.3-70b-versatile.
  - fal ("AI background", Pro): generates a custom background graphic via
    fal-ai/flux/schnell, drawn behind the screenshot on the canvas. The
    returned image is baked into a data URL client-side so exports don't
    hit a canvas CORS-taint error and the background survives even if the
    fal-hosted URL later expires.
- Swapped Pro cloud backup off Firebase Storage (now requires the paid
  Blaze plan just to enable) onto Vercel Blob, which has a real free tier
  and lives on the platform this app is already deployed on. New routes
  /api/backup-project and /api/delete-cloud-project do the writes
  server-side — this also closes a gap where the old flow trusted the
  client's local `proStatus` before writing to Firestore/Storage directly;
  now Pro is re-checked from Firestore on every backup. Backup TTL is now
  20 days (was 10), still enforced by the same cron job.

Vercel environment variables:
GEMINI_API_KEY
GROQ_API_KEY           (Pro-only: fast copy/headline variations)
FAL_KEY                (Pro-only: fal.ai FLUX background generation)
FIREBASE_SERVICE_ACCOUNT_JSON
FLUTTERWAVE_SECRET_KEY (required for /api/verify-payment)
BLOB_READ_WRITE_TOKEN  (required for cloud backup — added automatically
                         once you connect a Blob store to this project in
                         the Vercel dashboard: Storage tab → Create Database
                         → Blob → Connect Project. No separate signup.)
CRON_SECRET             (optional — extra guard on /api/cleanup-cloud)

Firebase:
- Enable Email/Password and Google sign-in.
- Add your Vercel domain to Firebase Authentication authorized domains.
- Configure Firestore. Firebase Storage is no longer used anywhere in this
  build — screenshots for cloud backup now live in Vercel Blob instead.
- Firestore collections used: users/{uid}, usernames/{username},
  devices/{deviceId}, usedPayments/{txRef}, aiUsage/{uid_date_provider},
  users/{uid}/projects/{id} (cloud-backup metadata; server-write-only).
- Deploy firestore.rules (Console → Firestore → Rules, or
  `firebase deploy --only firestore:rules`). Every collection except
  usernames/ (public read, owner-create-once) is server-write-only — the
  Admin SDK bypasses rules, clients should never write pro status,
  free-tier flags, or backup metadata directly.
- Create a Firebase service account and store its JSON as
  FIREBASE_SERVICE_ACCOUNT_JSON in Vercel.

Vercel Blob:
- In the Vercel dashboard: your project → Storage tab → Create Database →
  Blob → Connect Project. This adds BLOB_READ_WRITE_TOKEN automatically;
  you don't set it by hand. Free tier covers a generous amount of storage
  and bandwidth for this use case — check current limits on Vercel's
  pricing page if you expect heavy usage.

Flutterwave:
- Get your Secret Key from the Flutterwave dashboard and set it as
  FLUTTERWAVE_SECRET_KEY in Vercel. Never put it in index.html.

IMPORTANT — still worth doing next:
- The username reservation on signup is a best-effort Firestore transaction,
  not a Cloud Function trigger, so there's a narrow race window under high
  concurrent signups with the same username. Low risk at small scale.
- Device-based free-tier defense is browser-persistence based, not a real
  device fingerprint. It stops casual abuse (sign out → sign up again) but
  not someone deliberately using a different browser/incognito.
- Vercel cron availability depends on your plan; if cron is unavailable, run
  /api/cleanup-cloud from another trusted scheduler and send the
  CRON_SECRET as a Bearer token if you set one.
- storage.rules was removed — it's no longer relevant now that Firebase
  Storage isn't used. Only firestore.rules needs deploying.
