// ---------------------------------------------------------------------------
// Firebase Auth client (Google sign-in only).
// Firebase SDKs are loaded lazily so a CDN/network/config problem can NEVER
// prevent the public welcome screen from rendering.
// ---------------------------------------------------------------------------

const FIREBASE_VERSION = "10.14.1";
const FIREBASE_APP_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`;
const FIREBASE_AUTH_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`;

const { FIREBASE_CONFIG = {} } = window.WYTE_CONFIG || {};
const firebaseConfigured = Boolean(
  FIREBASE_CONFIG.apiKey &&
  FIREBASE_CONFIG.authDomain &&
  FIREBASE_CONFIG.projectId &&
  FIREBASE_CONFIG.appId
);

let auth = null;
let provider = null;
let firebaseLoadPromise = null;
let redirectError = null;

async function ensureFirebase() {
  if (auth && provider) return { auth, provider };
  if (!firebaseConfigured) {
    throw new Error("Google sign-in is not configured. Check js/config.js.");
  }
  if (firebaseLoadPromise) return firebaseLoadPromise;

  firebaseLoadPromise = (async () => {
    try {
      const [appModule, authModule] = await Promise.all([
        import(FIREBASE_APP_URL),
        import(FIREBASE_AUTH_URL),
      ]);

      const app = appModule.initializeApp(FIREBASE_CONFIG);
      auth = authModule.getAuth(app);
      provider = new authModule.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      authModule.getRedirectResult(auth).catch((e) => {
        redirectError = e;
        console.error("Wyte AI: Firebase redirect result failed.", e);
      });

      return { auth, provider, authModule };
    } catch (e) {
      firebaseLoadPromise = null;
      console.error("Wyte AI: Firebase SDK failed to load/initialize.", e);
      throw new Error("Firebase could not be loaded. Check your internet connection and Firebase configuration.");
    }
  })();

  return firebaseLoadPromise;
}

export async function signInWithGoogle() {
  const { auth: firebaseAuth, provider: googleProvider, authModule } = await ensureFirebase();

  try {
    await authModule.signInWithPopup(firebaseAuth, googleProvider);
  } catch (e) {
    if ([
      "auth/popup-blocked",
      "auth/popup-closed-by-user",
      "auth/cancelled-popup-request",
    ].includes(e.code)) {
      await authModule.signInWithRedirect(firebaseAuth, googleProvider);
      return true;
    }
    throw e;
  }
  return true;
}

export async function signOut() {
  if (!auth) return;
  const { signOut: firebaseSignOut } = await import(FIREBASE_AUTH_URL);
  await firebaseSignOut(auth);
}

export function onAuthStateChange(callback) {
  // Authentication is optional for the public landing page. Start the SDK
  // in the background and subscribe once it is ready.
  if (!firebaseConfigured) {
    callback(null);
    return () => {};
  }

  let active = true;
  ensureFirebase()
    .then(({ auth: firebaseAuth, authModule }) => {
      if (!active) return;
      return authModule.onAuthStateChanged(firebaseAuth, (user) => callback(user));
    })
    .catch(() => {
      if (active) callback(null);
    });

  return () => {
    active = false;
  };
}

export async function currentSession() {
  if (!firebaseConfigured) return null;

  const { auth: firebaseAuth, authModule } = await ensureFirebase();

  if (redirectError) {
    const e = redirectError;
    redirectError = null;
    throw e;
  }

  if (firebaseAuth.currentUser) return firebaseAuth.currentUser;

  return new Promise((resolve) => {
    let settled = false;
    const unsub = authModule.onAuthStateChanged(firebaseAuth, (user) => {
      if (settled) return;
      settled = true;
      unsub();
      resolve(user);
    });
  });
}

export async function getIdToken() {
  if (!auth) await ensureFirebase();
  const user = auth?.currentUser;
  if (!user) throw new Error("Please sign in first.");
  return user.getIdToken();
}
