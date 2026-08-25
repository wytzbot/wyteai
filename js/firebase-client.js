// ---------------------------------------------------------------------------
// Wyte AI — Firebase Auth client
// Google sign-in only.
// Firebase SDKs are loaded lazily so Firebase problems cannot prevent
// the public welcome screen from rendering.
// ---------------------------------------------------------------------------

const FIREBASE_VERSION = "10.14.1";

const FIREBASE_APP_URL =
  `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`;

const FIREBASE_AUTH_URL =
  `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`;

const { FIREBASE_CONFIG = {} } = window.WYTE_CONFIG || {};

const firebaseConfigured = Boolean(
  FIREBASE_CONFIG.apiKey &&
  FIREBASE_CONFIG.authDomain &&
  FIREBASE_CONFIG.projectId &&
  FIREBASE_CONFIG.appId
);

// Firebase state
let auth = null;
let provider = null;
let firebaseLoadPromise = null;
let authModuleRef = null;
let redirectError = null;

// ---------------------------------------------------------------------------
// Load and initialize Firebase
// ---------------------------------------------------------------------------

async function ensureFirebase() {
  // IMPORTANT:
  // Return the Auth module as well. The previous implementation could
  // return auth/provider without the module, causing:
  //
  // Cannot read properties of undefined
  // (reading 'signInWithPopup')
  //
  if (auth && provider && authModuleRef) {
    return {
      auth,
      provider,
      authModule: authModuleRef,
    };
  }

  if (!firebaseConfigured) {
    throw new Error(
      "Google sign-in is not configured. Check js/config.js."
    );
  }

  // Prevent multiple Firebase SDK initializations.
  if (firebaseLoadPromise) {
    return firebaseLoadPromise;
  }

  firebaseLoadPromise = (async () => {
    try {
      // Load Firebase modules.
      const [appModule, authModule] = await Promise.all([
        import(FIREBASE_APP_URL),
        import(FIREBASE_AUTH_URL),
      ]);

      // Initialize Firebase.
      const app = appModule.initializeApp(FIREBASE_CONFIG);

      // Keep a reference to the Auth module.
      authModuleRef = authModule;

      // Create Firebase Auth instance.
      auth = authModule.getAuth(app);

      // Create Google provider.
      provider = new authModule.GoogleAuthProvider();

      // Always show the Google account chooser.
      provider.setCustomParameters({
        prompt: "select_account",
      });

      // Check whether a previous redirect sign-in completed.
      authModule
        .getRedirectResult(auth)
        .then((result) => {
          if (result?.user) {
            console.log(
              "Wyte AI: Google redirect sign-in successful.",
              result.user
            );
          }
        })
        .catch((error) => {
          redirectError = error;

          console.error(
            "Wyte AI: Firebase redirect result failed.",
            error
          );
        });

      return {
        auth,
        provider,
        authModule,
      };
    } catch (error) {
      // Allow another attempt if initialization failed.
      firebaseLoadPromise = null;

      console.error(
        "Wyte AI: Firebase SDK failed to load/initialize.",
        error
      );

      throw new Error(
        "Firebase could not be loaded. Check your internet connection and Firebase configuration."
      );
    }
  })();

  return firebaseLoadPromise;
}

// ---------------------------------------------------------------------------
// Google Sign-In
// ---------------------------------------------------------------------------

export async function signInWithGoogle() {
  const {
    auth: firebaseAuth,
    provider: googleProvider,
    authModule,
  } = await ensureFirebase();

  try {
    // Firebase modular SDK syntax:
    //
    // signInWithPopup(auth, provider)
    //
    // NOT:
    //
    // auth.signInWithPopup(...)
    //
    await authModule.signInWithPopup(
      firebaseAuth,
      googleProvider
    );

    return true;
  } catch (error) {
    console.error(
      "Wyte AI: Google sign-in failed.",
      error
    );

    // Some mobile browsers block popups.
    // In that case, use Firebase redirect authentication.
    if (
      [
        "auth/popup-blocked",
        "auth/popup-closed-by-user",
        "auth/cancelled-popup-request",
      ].includes(error?.code)
    ) {
      await authModule.signInWithRedirect(
        firebaseAuth,
        googleProvider
      );

      return true;
    }

    throw error;
  }
}

// ---------------------------------------------------------------------------
// Sign Out
// ---------------------------------------------------------------------------

export async function signOut() {
  if (!firebaseConfigured) {
    return;
  }

  if (!auth) {
    await ensureFirebase();
  }

  const firebaseAuth = auth;

  if (!firebaseAuth) {
    return;
  }

  await authModuleRef.signOut(firebaseAuth);
}

// ---------------------------------------------------------------------------
// Authentication State Listener
// ---------------------------------------------------------------------------

export function onAuthStateChange(callback) {
  if (!firebaseConfigured) {
    callback(null);
    return () => {};
  }

  let active = true;
  let unsubscribe = null;

  ensureFirebase()
    .then(
      ({
        auth: firebaseAuth,
        authModule,
      }) => {
        if (!active) return;

        unsubscribe = authModule.onAuthStateChanged(
          firebaseAuth,
          (user) => {
            if (!active) return;

            callback(user);
          }
        );
      }
    )
    .catch((error) => {
      console.error(
        "Wyte AI: Auth state listener failed.",
        error
      );

      if (active) {
        callback(null);
      }
    });

  return () => {
    active = false;

    if (typeof unsubscribe === "function") {
      unsubscribe();
    }
  };
}

// ---------------------------------------------------------------------------
// Get Current User / Session
// ---------------------------------------------------------------------------

export async function currentSession() {
  if (!firebaseConfigured) {
    return null;
  }

  const {
    auth: firebaseAuth,
    authModule,
  } = await ensureFirebase();

  // Handle a redirect authentication error.
  if (redirectError) {
    const error = redirectError;
    redirectError = null;
    throw error;
  }

  // Firebase already knows the current user.
  if (firebaseAuth.currentUser) {
    return firebaseAuth.currentUser;
  }

  // Wait for Firebase Auth to finish restoring the session.
  return new Promise((resolve) => {
    let settled = false;

    const unsubscribe =
      authModule.onAuthStateChanged(
        firebaseAuth,
        (user) => {
          if (settled) {
            return;
          }

          settled = true;

          unsubscribe();

          resolve(user);
        }
      );
  });
}

// ---------------------------------------------------------------------------
// Get Firebase ID Token
// ---------------------------------------------------------------------------

export async function getIdToken() {
  if (!auth) {
    await ensureFirebase();
  }

  const user = auth?.currentUser;

  if (!user) {
    throw new Error("Please sign in first.");
  }

  return user.getIdToken();
}
