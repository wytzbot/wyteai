# Wyte AI production setup

1. Create a fal.ai account and API key. Add FAL_KEY to Vercel.
2. Create a Supabase project. Add SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY to Vercel.
3. Enable Google as an OAuth provider in Supabase Auth, and add the deployed app domain to the Supabase Auth redirect allow-list.
4. Run supabase_schema.sql against the project (tables, RLS policies, the private `generated` storage bucket, and the consume_credits/refund_credits/grant_pro_subscription functions).
5. Add FLW_SECRET_KEY and FLW_SECRET_HASH (from your Flutterwave dashboard) to Vercel, and set the webhook URL in the Flutterwave dashboard to your deployed `/api/flutterwave-webhook` endpoint.
6. Connect the GitHub repository to Vercel.
7. Deploy.
8. Test: Google login → 5 free credits → generation → Supabase Storage image (signed URL) → gallery → failed-generation credit refund → Pro checkout → Flutterwave webhook → verified Pro entitlement.
