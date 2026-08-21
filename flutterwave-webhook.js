const crypto = require('crypto');
const { serverClient } = require('./_utils');

// Flutterwave's documented webhook scheme is a plain shared-secret comparison:
// the dashboard-configured secret hash is sent back verbatim in the
// `verif-hash` header (it is NOT an HMAC signature over the body). A timing-safe
// direct comparison is the correct check here.
function validSignature(sig, secret) {
  if (!sig || !secret) return false;
  const a = Buffer.from(String(sig));
  const b = Buffer.from(String(secret));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Re-verify the transaction directly with Flutterwave rather than trusting the
// webhook payload, per Flutterwave's guidance.
async function verifyTransactionByReference(reference) {
  const secretKey = process.env.FLW_SECRET_KEY;
  if (!secretKey) throw new Error('FLW_SECRET_KEY is not configured.');
  const r = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const d = await r.json();
  if (!r.ok || d?.status !== 'success' || !d?.data) throw new Error('FLW_VERIFY_FAILED');
  return d.data;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const sig = req.headers['verif-hash'] || req.headers['flutterwave-signature'];
  if (!validSignature(sig, process.env.FLW_SECRET_HASH)) return res.status(401).json({ error: 'Invalid signature' });

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const data = payload?.data || {};
    const reference = data.reference || data.tx_ref;
    if (!reference) return res.status(200).json({ received: true });

    const db = serverClient();
    const { data: sub } = await db.from('subscriptions').select('*').eq('reference', reference).single();
    if (!sub) return res.status(200).json({ received: true });
    if (sub.status === 'successful') return res.status(200).json({ received: true }); // already granted, idempotent

    // Never grant value from the webhook payload alone: re-query the transaction and
    // check status, reference, amount and currency before granting anything.
    const verified = await verifyTransactionByReference(reference);
    const amountOk = Number(verified.amount) >= Number(sub.amount);
    const currencyOk = String(verified.currency) === String(sub.currency);
    const refOk = (verified.tx_ref || verified.reference) === reference;

    if (verified.status !== 'successful' || !amountOk || !currencyOk || !refOk) {
      await db.from('subscriptions').update({ status: String(verified.status || 'failed'), transaction_id: String(verified.id || '') }).eq('id', sub.id);
      return res.status(200).json({ received: true });
    }

    const { error: grantError } = await db.rpc('grant_pro_subscription', {
      p_subscription_id: sub.id,
      p_user_id: sub.user_id,
      p_transaction_id: String(verified.id || ''),
    });
    if (grantError) throw grantError;

    return res.status(200).json({ received: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
};
