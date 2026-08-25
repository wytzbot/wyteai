// ---------------------------------------------------------------------------
// Firebase Auth client (Google sign-in only).
// The client is deliberately resilient when Firebase config has not yet been
// filled in: the landing page must still render instead of becoming blank.
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

const { FIREBASE_CONFIG = {} } = window.WYTE_CONFIG || {};
const firebaseReady = Boolean(
  FIREBASE_CONFIG.apiKey &&
  FIREBASE_CONFIG.authDomain &&
  FIREBASE_CONFIG.projectId &&
  FIREBASE_CONFIG.appId
);

let auth = null;
let provider = null;
let redirectError = null;

if (firebaseReady) {
  try {
    const app = initializeApp(FIREBASE_CONFIG);
    auth = getAuth(app);
    provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    getRedirectResult(auth).catch((e) => {
      redirectError = e;
    });
  } catch (e) {
    console.error("Wyte AI: Firebase failed to initialize.", e);
  }
} else {
  console.warn(
    "Wyte AI: Firebase config is empty/incomplete. Fill js/config.js before using Google sign-in."
  );
}

export async function signInWithGoogle() {
  if (!auth || !provider) {
    throw new Error(
      "Google sign-in is not configured yet. Add your Firebase Web App config to js/config.js."
    );
  }

  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    if (
      ["auth/popup-blocked", "auth/popup-closed-by-user", "auth/cancelled-popup-request"].includes(e.code)
    ) {
      await signInWithRedirect(auth, provider);
      return true;
    }
    throw e;
  }
  return true;
}

export async function signOut() {
  if (!auth) return;
  await firebaseSignOut(auth);
}

export function onAuthStateChange(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, (user) => callback(user));
}

export async function currentSession() {
  if (!auth) return null;

  if (redirectError) {
    const e = redirectError;
    redirectError = null;
    throw e;
  }

  if (auth.currentUser) return auth.currentUser;

  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
}

export async function getIdToken() {
  const user = auth?.currentUser;
  if (!user) throw new Error("Please sign in first.");
  return user.getIdToken();
}
