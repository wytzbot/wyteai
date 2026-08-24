const { createClient } = require("@supabase/supabase-js");
const admin = require("firebase-admin");

// ---------------------------------------------------------------------------
// Auth = Firebase (ID tokens verified server-side with the Admin SDK).
// Data + generated-image storage = Supabase Postgres/Storage, accessed only
// with the service-role key. The browser never holds a Supabase key.
// ---------------------------------------------------------------------------

function firebaseAdmin() {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT is not configured.");
    const serviceAccount = JSON.parse(raw);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  return admin;
}

function serverClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Firebase UIDs aren't Postgres uuids, so profiles.id (and every user_id
// column that references it) is stored as text — see supabase_schema.sql.
async function ensureProfile(db, uid) {
  const { error } = await db.from("profiles").upsert({ id: uid }, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw error;
}

async function verifyUser(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) throw new Error("Missing Firebase ID token");
  const token = auth.slice(7);
  const decoded = await firebaseAdmin().auth().verifyIdToken(token);
  const db = serverClient();
  // Mirrors the old on_auth_user_created Postgres trigger, which only fired
  // for Supabase Auth sign-ups and no longer applies now that Auth is Firebase.
  await ensureProfile(db, decoded.uid);
  return { id: decoded.uid, email: decoded.email, name: decoded.name };
}

module.exports = { serverClient, verifyUser };
