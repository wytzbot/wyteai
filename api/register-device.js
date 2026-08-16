// Vercel serverless function: /api/register-device
//
// Called right after sign-up (and again on every sign-in, harmlessly) with
// the signed-in user's ID token and a persistent client-generated deviceId
// (stored in localStorage, survives sign-out).
//
// Server-side rule: the FIRST Firebase account ever seen from a given
// deviceId gets the normal free tier. Any DIFFERENT account later seen on
// that same deviceId is marked freeTierBlocked so the client won't grant it
// free saved projects — closing the "sign out, make a new account, get 3
// more free projects" loop. This is a device-persistence check, not a
// hardware fingerprint: clearing localStorage or using a different browser
// profile still resets it, but it stops the common casual-abuse case.
//
// Required env var: FIREBASE_SERVICE_ACCOUNT_JSON

import { getAdmin, requireUser } from "./_lib/firebaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const decoded = await requireUser(req);
    const uid = decoded.uid;
    const { deviceId } = req.body || {};
    if (!deviceId || typeof deviceId !== "string" || deviceId.length > 128) {
      return res.status(400).json({ error: "A valid deviceId is required." });
    }

    const admin = getAdmin();
    const db = admin.firestore();
    const deviceRef = db.collection("devices").doc(deviceId);
    const userRef = db.collection("users").doc(uid);

    const result = await db.runTransaction(async (tx) => {
      const [deviceSnap, userSnap] = await Promise.all([tx.get(deviceRef), tx.get(userRef)]);
      let freeTierBlocked = false;

      if (deviceSnap.exists) {
        const d = deviceSnap.data();
        if (d.firstUid && d.firstUid !== uid) freeTierBlocked = true;
      } else {
        tx.set(deviceRef, {
          firstUid: uid,
          firstSeenAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      tx.set(
        userRef,
        {
          uid,
          deviceId,
          freeTierBlocked,
          pro: userSnap.exists ? !!userSnap.data().pro : false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          registeredAt: userSnap.exists
            ? userSnap.data().registeredAt || admin.firestore.FieldValue.serverTimestamp()
            : admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );

      return { freeTierBlocked };
    });

    return res.status(200).json({ ok: true, freeTierBlocked: result.freeTierBlocked });
  } catch (e) {
    console.error("register-device error:", e);
    return res.status(e.status || 500).json({ error: e.message || "Device registration failed." });
  }
}
