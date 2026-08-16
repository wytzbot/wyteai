// Vercel serverless function: /api/verify-payment
//
// Replaces the old client-side "type any reference, get Pro" flow. The
// client sends the signed-in user's ID token plus the Flutterwave tx_ref
// they were given after paying; this route verifies that reference directly
// with Flutterwave's API before writing pro:true to Firestore. A tx_ref can
// only ever grant Pro once (recorded in usedPayments) so it can't be reused
// across accounts or resubmitted. This is the primary, always-available
// path — /api/flutterwave-webhook is a best-effort second path that can
// grant Pro automatically without the user typing anything, when it's able
// to match their checkout email to an account.
//
// Required env vars: FIREBASE_SERVICE_ACCOUNT_JSON, FLUTTERWAVE_SECRET_KEY

import { requireUser } from "./_lib/firebaseAdmin.js";
import { verifyFlutterwaveByReference, grantProForTxRef } from "./_lib/payments.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const decoded = await requireUser(req);
    const uid = decoded.uid;
    const { txRef } = req.body || {};
    if (!txRef || typeof txRef !== "string") {
      return res.status(400).json({ error: "A transaction reference is required." });
    }

    const { ok, txn } = await verifyFlutterwaveByReference(txRef);
    if (!ok) {
      return res.status(402).json({ error: "Payment could not be verified. If you were charged, contact support with your reference." });
    }

    const result = await grantProForTxRef({ uid, txRef, txn });
    if (result.alreadyUsed) {
      return res.status(409).json({ error: "This transaction reference has already been used to activate Pro." });
    }

    return res.status(200).json({ ok: true, pro: true });
  } catch (e) {
    console.error("verify-payment error:", e);
    return res.status(e.status || 500).json({ error: e.message || "Payment verification failed." });
  }
}
