// ---------------------------------------------------------------------------
// Wyte AI — runtime configuration
// Fill these in before deploying. They replace the old --dart-define values
// that used to be baked in at Flutter build time; here they're read by the
// browser at runtime instead, so no build step is required.
// ---------------------------------------------------------------------------
window.WYTE_CONFIG = {
  SUPABASE_URL: "",              // e.g. "https://xxxxx.supabase.co"
  SUPABASE_PUBLISHABLE_KEY: "",  // Supabase "anon" / publishable key
  // Leave empty when the site and the /api functions are served from the
  // same origin (the default when deployed on Vercel). Only set this if
  // your API is hosted elsewhere.
  API_BASE_URL: "",
};
