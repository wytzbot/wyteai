// ---------------------------------------------------------------------------
// Wyte AI — runtime configuration
// Fill these in before deploying. Read by the browser at runtime, so no
// build step is required.
//
// Auth is Firebase (Google sign-in only, client-side). Your database and
// generated-image storage stay on Supabase, but the browser never talks to
// Supabase directly anymore — every /api/* call carries a Firebase ID token,
// and the serverless functions use the Supabase SERVICE ROLE key (server-side
// only, never in this file) to read/write Postgres and Storage on the user's
// behalf. So no Supabase URL/key belongs here.
// ---------------------------------------------------------------------------
window.WYTE_CONFIG = {
  // From Firebase Console → Project settings → General → Your apps → Web app.
  FIREBASE_CONFIG: {
    apiKey: "",
    authDomain: "",       // e.g. "wyteai.firebaseapp.com"
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
  },
  // Leave empty when the site and the /api functions are served from the
  // same origin (the default when deployed on Vercel). Only set this if
  // your API is hosted elsewhere.
  API_BASE_URL: "",
};
