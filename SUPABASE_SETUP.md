# Supabase setup

1. Create a Supabase project.
2. Run `supabase_schema.sql` in SQL Editor.
3. Enable Google in Authentication > Providers.
4. Add your production frontend URL to Auth redirect URLs.
5. Create/use the `generated` private Storage bucket (the SQL creates it).
6. Put the Supabase URL + publishable key into the Flutter web build environment.
7. Put SUPABASE_SECRET_KEY only in Vercel.
8. Put FAL_KEY and Flutterwave secrets only in Vercel.
9. Deploy the Vercel API.
10. Test Google login -> profile creation -> generation -> credit reservation -> AI -> private Storage -> signed URL -> gallery.


## Flutterwave v4
Set `FLW_SECRET_KEY` and `FLW_SECRET_HASH` only on Vercel. `FLW_SECRET_KEY` (the classic v3 secret key) creates the hosted checkout link and verifies transactions server-side, since Flutterwave's v4 hosted checkout/payment-link API is not available yet. Do not put card details or secrets in Flutter.
