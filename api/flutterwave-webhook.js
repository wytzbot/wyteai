const crypto = require('crypto');
const { serverClient } = require('./_utils');
const { flwFetch } = require('./_flw');

// v4 webhooks sign the *raw* request body with HMAC-SHA256 using your
// dashboard secret hash, base64-encoded, sent back as `flutterwave-signature`.
// This replaces v3's plain verif-hash string comparison. Reading the exact
// raw bytes requires disabling Vercel's automatic JSON body parsing (see
// module.exports.config below) — hashing an already-reparsed/re-serialized
// body would not match what Flutterwave signed.
module.exports.config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function validSignature(rawBody, signature, secretHash) {
  if (!signature || !secretHash) return false;
  const expected = crypto.createHmac('sha256', secretHash).update(rawBody).digest('base64');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Re-verify the charge directly with Flutterwave rather than trusting the
// webhook payload, per Flutterwave's guidance.
async function verifyCharge(chargeId) {
  const r = await flwFetch(`/charges/${encodeURIComponent(chargeId)}`);
  if (!r.ok || !r.data?.data) throw new Error('FLW_VERIFY_FAILED');
  return r.data.data;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const rawBody = await readRawBody(req);
  const sig = req.headers['flutterwave-signature'];
  if (!validSignature(rawBody, sig, process.env.FLW_SECRET_HASH)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  try {
    const payload = JSON.parse(rawBody.toString('utf8') || '{}');
    const data = payload?.data || {};
    const chargeId = data.id;
    const reference = data.reference;
    if (!chargeId || !reference) return res.status(200).json({ received: true });

    const db = serverClient();
    const { data: sub } = await db.from('subscriptions').select('*').eq('reference', reference).single();
    if (!sub) return res.status(200).json({ received: true });
    if (sub.status === 'successful') return res.status(200).json({ received: true }); // already granted, idempotent

    // Never grant value from the webhook payload alone: re-query the charge and
    // check status, reference and amount/currency before granting anything.
    const verified = await verifyCharge(chargeId);
    const amountOk = Number(verified.amount) >= Number(sub.amount);
    const currencyOk = String(verified.currency) === String(sub.currency);
    const refOk = verified.reference === reference;

    if (verified.status !== 'succeeded' || !amountOk || !currencyOk || !refOk) {
      await db.from('subscriptions').update({ status: String(verified.status || 'failed'), transaction_id: chargeId }).eq('id', sub.id);
      return res.status(200).json({ received: true });
    }

    const { error: grantError } = await db.rpc('grant_pro_subscription', {
      p_subscription_id: sub.id,
      p_user_id: sub.user_id,
      p_transaction_id: chargeId,
    });
    if (grantError) throw grantError;

    return res.status(200).json({ received: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
};
