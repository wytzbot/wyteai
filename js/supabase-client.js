// ---------------------------------------------------------------------------
// Supabase client + auth helpers
// Mirrors lib/supabase.dart and lib/auth.dart from the original Flutter app.
// ---------------------------------------------------------------------------
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = window.WYTE_CONFIG;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.warn(
    "Wyte AI: SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY are not set in js/config.js — sign-in and API calls will fail until they are."
  );
}

export const supabase = createClient(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_PUBLISHABLE_KEY || "placeholder"
);

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) throw error;
  return true;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => callback(session));
}

export async function currentSession() {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}
