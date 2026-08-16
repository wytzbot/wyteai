// Vercel serverless function: /api/verify-payment
//
// Replaces the old client-side "type any reference, get Pro" flow. The
// client sends the signed-in user's ID token plus the Flutterwave tx_ref
// they were given after paying; this route verifies that reference directly
// with Flutterwave's API before writing pro:true to Firestore. A tx_ref can
// only ever grant Pro once (recorded in usedPayments) so it can't be reused
// across accounts or resubmitted.
//
// Required env vars: FIREBASE_SERVICE_ACCOUNT_JSON, FLUTTERWAVE_SECRET_KEY

import { getAdmin, requireUser } from "./_lib/firebaseAdmin.js";

const MIN_AMOUNT = 2.5;
const EXPECTED_CURRENCY = "USD";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const decoded = await requireUser(req);
    const uid = decoded.uid;
    const { txRef } = req.body || {};
    if (!txRef || typeof txRef !== "string") {
      return res.status(400).json({ error: "A transaction reference is required." });
    }

    const secret = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!secret) return res.status(500).json({ error: "FLUTTERWAVE_SECRET_KEY is not configured in Vercel." });

    const admin = getAdmin();
    const db = admin.firestore();

    const usedRef = db.collection("usedPayments").doc(txRef);
    const usedSnap = await usedRef.get();
    if (usedSnap.exists) {
      return res.status(409).json({ error: "This transaction reference has already been used to activate Pro." });
    }

    const verifyRes = await fetch(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
      { headers: { Authorization: `Bearer ${secret}` } }
    );
    const verifyData = await verifyRes.json();
    const txn = verifyData && verifyData.data;

    const ok =
      verifyRes.ok &&
      verifyData?.status === "success" &&
      txn?.status === "successful" &&
      Number(txn?.amount) >= MIN_AMOUNT &&
      txn?.currency === EXPECTED_CURRENCY;

    if (!ok) {
      return res.status(402).json({ error: "Payment could not be verified. If you were charged, contact support with your reference." });
    }

    await usedRef.set({
      uid,
      txRef,
      amount: txn.amount,
      currency: txn.currency,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    await db.collection("users").doc(uid).set(
      { pro: true, proSince: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );

    return res.status(200).json({ ok: true, pro: true });
  } catch (e) {
    console.error("verify-payment error:", e);
    return res.status(e.status || 500).json({ error: e.message || "Payment verification failed." });
  }
}
