// ---------------------------------------------------------------------------
// Firebase Auth client (Google sign-in only). This replaces
// js/supabase-client.js. Database + generated-image storage remain on
// Supabase, accessed only from the server with the service-role key — the
// browser only ever needs an auth session here, never a Supabase client.
// ---------------------------------------------------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const { FIREBASE_CONFIG } = window.WYTE_CONFIG;

if (!FIREBASE_CONFIG || !FIREBASE_CONFIG.apiKey) {
  console.warn(
    "Wyte AI: FIREBASE_CONFIG is not filled in in js/config.js — sign-in will fail until it is."
  );
}

const app = initializeApp(FIREBASE_CONFIG || {});
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

// Surface a redirect-flow error (used as a fallback when the popup is
// blocked or fails) to whoever is listening for auth state.
let redirectError = null;
getRedirectResult(auth).catch((e) => {
  redirectError = e;
});

export async function signInWithGoogle() {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    // Popup blocked/closed or a network hiccup — fall back to a full-page
    // redirect rather than surfacing a confusing popup error.
    if (["auth/popup-blocked", "auth/popup-closed-by-user", "auth/cancelled-popup-request"].includes(e.code)) {
      await signInWithRedirect(auth, provider);
      return true;
    }
    throw e;
  }
  return true;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

export function onAuthStateChange(callback) {
  return onAuthStateChanged(auth, (user) => callback(user));
}

export async function currentSession() {
  if (redirectError) {
    const e = redirectError;
    redirectError = null;
    throw e;
  }
  if (auth.currentUser) return auth.currentUser;
  // Wait for Firebase's first auth-state resolution (it restores the
  // session asynchronously on page load).
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
}

// Used by js/api.js to attach a fresh ID token to every /api/* request.
export async function getIdToken() {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in first.");
  return user.getIdToken();
}
