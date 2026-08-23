# Wyte AI architecture

Frontend: GitHub + Flutter Web
Backend: Vercel API
Auth: Supabase Auth (Google only)
Database: Supabase Postgres
Images: Supabase Storage (private `generated` bucket)
AI: fal.ai model router
Payments: Flutterwave v4
No Firebase
No Cloudinary
No Firebase Functions
No reCAPTCHA/App Check

Supabase Free currently includes 500 MB database, 1 GB file storage, 5 GB egress and 50,000 MAU. Free projects can pause after inactivity, so production scale may eventually require Pro.
