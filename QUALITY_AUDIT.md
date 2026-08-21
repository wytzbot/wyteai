# Wyte AI production blocker audit — 2026-08-20

## Fixed
- Removed remaining Firebase imports/dependencies from runtime code.
- Replaced Firebase auth state with Supabase Auth state.
- Google-only sign-in now uses Supabase OAuth.
- Fixed invalid async `main()` initialization.
- Removed `dart:html` dependencies from shared Flutter code.
- Real Create action now calls the Vercel generation endpoint instead of simulating a 5-second result.
- Added atomic server-side credit consumption with Supabase Postgres RPC.
- Added server-side credit refund for failed generation.
- Moved generation status to Supabase Postgres.
- Moved generated images to a private Supabase Storage bucket with signed URLs.
- Prevented clients from modifying plan/credit balances through RLS.
- Updated fal model routing to current documented model IDs and added image-edit routing.
- Updated Flutterwave scaffolding for the v4 OAuth2 credential model and HMAC webhook verification.
- Removed stale Firebase/Cloudinary files.

## Checks passed
- Node syntax checks passed for every Vercel API JavaScript file.
- Static integration checks passed for Supabase auth, credit RPCs, storage, AI routing and Flutterwave endpoints.
- Stale Firebase/Cloudinary runtime-reference scan passed.

## Cannot be executed here
The execution environment does not have the Flutter SDK installed, so `flutter analyze` and `flutter build web` could not be run. Live Google OAuth, Supabase Storage, fal.ai generation and Flutterwave v4 payments require your real project credentials and external services.

## Payment safety
The Flutterwave v4 integration intentionally does not fake a hosted checkout or grant Pro from an unverified webhook. Flutterwave's current guidance requires server-side verification of transaction status, amount, currency and reference before granting value, plus signed and idempotent webhook handling. Configure the exact v4 payment method/authorization flow in the Flutterwave merchant account before live launch.

---

# Follow-up bug-fix pass — 2026-08-21

The previous audit above left several things broken or incomplete that a static
"does the file parse" pass didn't catch. This pass did a full manual read of every
file plus automated bracket-balance checks on every `.dart` file and `node --check`
on every `.js` file.

## Corrections to the previous audit
- "Removed `dart:html` dependencies from shared Flutter code" was incomplete: `widgets.dart`'s `ProPanel` still referenced `kIsWeb`/`html.window.location.href`, both undefined in that file — a compile error, and the screen actually reachable from the Pricing nav item (the separately-written, correct `PricingScreen` was dead code, never referenced anywhere).
- "Updated Flutterwave scaffolding for... HMAC webhook verification" was itself the bug: Flutterwave's documented webhook scheme (`verif-hash`) is a plain secret comparison, not an HMAC signature over the body. The HMAC check would have rejected every legitimate webhook call.

## Fixed this pass
- Two independent unbalanced-parenthesis syntax errors (`welcome.dart`'s legal-link handler, `widgets.dart`'s Help & Support dialog) that would have failed `flutter build web` outright.
- `ProPanel`'s broken upgrade button (see above); removed the now-redundant, never-referenced `SignInScreen`.
- `ai-provider.js`: `generateImage()` referenced a `mode` variable that was never a parameter — a `ReferenceError` on every single generation call.
- `generate.js`: a double-refund bug on failed generations (the `refund_credits` RPC already restores the balance; a redundant manual `profiles` update on top of it refunded twice), and a null-pointer risk when the `generation_jobs` insert itself failed.
- `flutterwave-create.js` never returned a `checkoutUrl`, but the Flutter client required one — every "Upgrade to Pro" attempt failed immediately. Rebuilt against Flutterwave's v3 Standard Checkout (`/v3/payments` → `data.link`), since v4's hosted-checkout/payment-link API is not available yet.
- `flutterwave-webhook.js`: fixed the signature scheme (see above) and implemented the actual Pro-granting logic — nothing previously ever set `plan='pro'`, even on a fully verified successful payment. Added `grant_pro_subscription`, an atomic, idempotent Postgres function (`supabase_schema.sql`), and real `verify_by_reference` re-verification before granting.
- `vercel.json` had no build configuration at all, so Vercel would only have deployed the `/api` functions and never actually built or served the Flutter frontend. Added the documented Flutter-on-Vercel install/build/output settings.
- The client-side API helpers treated an empty `API_BASE_URL` as a hard configuration error, even though an empty value is exactly what same-origin deployment (the vercel.json setup above) needs — relative URLs resolve fine against the current origin. Loosened this in `services.dart`/`payments.dart`.
- `CreditService.getCredits()` was fully implemented server- and client-side but never called from any screen, so users had no way to see their credit balance; the mobile app bar's "Credits" button actually opened the Pricing screen instead. Wired a live credit count into the Create screen and relabeled the button.
- Refreshed `README.md` (previously stale Firebase/Cloud Functions instructions left over from before the Supabase migration), `PRODUCTION_SETUP.md`, `SUPABASE_SETUP.md`, and `api/README.md` to match the current Supabase/Vercel/Flutterwave-v3-checkout architecture.

## Still cannot be executed here
No Flutter SDK in this environment, so `flutter analyze`/`flutter build web` were not run directly — verification was a manual read plus automated bracket-balance checks on every `.dart` file (all now balanced) and `node --check` on every API file (all pass). Recommend running `flutter analyze` once before your first real deploy. Live Google OAuth, Supabase Storage, fal.ai generation, and Flutterwave payments still require your real project credentials to test end-to-end.
