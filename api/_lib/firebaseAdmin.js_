import admin from "firebase-admin";

// Shared, memoized Firebase Admin instance. All server routes that need to
// verify a user's ID token or touch Firestore/Storage from the server
// should import getAdmin() from here instead of re-initializing.
export function getAdmin() {
  if (admin.apps.length) return admin;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not configured in Vercel.");
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(raw))
  });
  return admin;
}

// Verifies a Firebase Auth ID token from a request's Authorization header
// or an explicit idToken field. Throws if missing/invalid.
export async function requireUser(req) {
  const authHeader = req.headers.authorization || "";
  const headerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const idToken = headerToken || (req.body && req.body.idToken) || null;
  if (!idToken) {
    const err = new Error("Sign-in required.");
    err.status = 401;
    throw err;
  }
  const admin = getAdmin();
  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch (e) {
    const err = new Error("Your session has expired. Please sign in again.");
    err.status = 401;
    throw err;
  }
}
