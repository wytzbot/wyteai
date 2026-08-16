import { getAdmin } from "./firebaseAdmin.js";

export const MIN_AMOUNT = 2.5;
export const EXPECTED_CURRENCY = "USD";

function evaluateTxn(response, ok, txn) {
  return (
    ok &&
    response?.status === "success" &&
    txn?.status === "successful" &&
    Number(txn?.amount) >= MIN_AMOUNT &&
    txn?.currency === EXPECTED_CURRENCY
  );
}

export async function verifyFlutterwaveByReference(txRef) {
  const secret = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secret) throw new Error("FLUTTERWAVE_SECRET_KEY is not configured in Vercel.");
  const r = await fetch(
    `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
    { headers: { Authorization: `Bearer ${secret}` } }
  );
  const data = await r.json();
  const txn = data && data.data;
  return { ok: evaluateTxn(data, r.ok, txn), txn };
}

export async function verifyFlutterwaveById(id) {
  const secret = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secret) throw new Error("FLUTTERWAVE_SECRET_KEY is not configured in Vercel.");
  const r = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(id)}/verify`, {
    headers: { Authorization: `Bearer ${secret}` }
  });
  const data = await r.json();
  const txn = data && data.data;
  return { ok: evaluateTxn(data, r.ok, txn), txn };
}

// Grants Pro for a given (uid, tx_ref, verified txn). Idempotent — a
// tx_ref can only ever grant Pro once, whether it arrives via the manual
// "Verify & activate Pro" form or the webhook.
export async function grantProForTxRef({ uid, txRef, txn }) {
  const admin = getAdmin();
  const db = admin.firestore();
  const usedRef = db.collection("usedPayments").doc(txRef);
  const usedSnap = await usedRef.get();
  if (usedSnap.exists) return { alreadyUsed: true };

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
  return { alreadyUsed: false };
}
