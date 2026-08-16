WYTE AI — upgraded build (accounts, device-based free-tier defense, verified payments)

Core:
- Single-file frontend: index.html.
- Firebase Auth: Email/Password (+ username at signup) + Google + password reset + email verification.
- Gemini screenshot vision via /api/ai (now requires sign-in + daily quota).
- Browser Canvas rendering keeps real app UI sharp.
- IndexedDB for local projects; avoids putting images in Firestore.
- Optional Pro cloud backup, expiring after 10 days (enforced server-side by cron).
- Flutterwave one-time payment, verified server-side before Pro is granted.

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
  ever opened it, its Run button had no handler); Groq/FLUX vision are still
  not implemented server-side, so the modal was misleading either way.
- Signup sends a verification email; unverified accounts see a banner with
  a resend button.

Vercel environment variables:
GEMINI_API_KEY
GROQ_API_KEY           (optional; provider not yet implemented for vision)
FLUX_API_KEY           (optional; reserved for future use)
FIREBASE_SERVICE_ACCOUNT_JSON
FIREBASE_STORAGE_BUCKET
FLUTTERWAVE_SECRET_KEY (new — required for /api/verify-payment)
CRON_SECRET             (optional — extra guard on /api/cleanup-cloud)

Firebase:
- Enable Email/Password and Google sign-in.
- Add your Vercel domain to Firebase Authentication authorized domains.
- Configure Firestore and Firebase Storage.
- Firestore collections used: users/{uid}, usernames/{username},
  devices/{deviceId}, usedPayments/{txRef}, aiUsage/{uid_date},
  users/{uid}/projects/{id} (existing cloud-backup subcollection).
- Set sensible Firestore security rules: users should only read/write their
  own users/{uid} doc and their own projects subcollection; usernames/,
  devices/, usedPayments/, and aiUsage/ should be server-write-only (the
  Admin SDK bypasses rules, so deny client writes to those entirely).
- Create a Firebase service account and store its JSON as
  FIREBASE_SERVICE_ACCOUNT_JSON in Vercel.
- Set FIREBASE_STORAGE_BUCKET to your Firebase Storage bucket name.

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
