const { serverClient, verifyUser } = require('./_utils');
const { flwFetch, genNonce, encryptField } = require('./_flw');

// Completes whatever authorization step Flutterwave's charge next_action
// asked for (pin, otp, or avs/address). May itself return another
// next_action — the client loops on this endpoint until it gets a
// redirect_url, a terminal status, or an error.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const user = await verifyUser(req);
    const db = serverClient();
    const b = req.body || {};
    const chargeId = String(b.chargeId || '');
    const type = String(b.type || '');
    if (!chargeId || !type) return res.status(400).json({ error: 'chargeId and type are required.' });

    // Ownership check: this charge's reference must belong to this user.
    const { data: sub } = await db.from('subscriptions').select('user_id').eq('transaction_id', chargeId).single();
    if (!sub || sub.user_id !== user.id) return res.status(404).json({ error: 'Charge not found.' });

    let authorization;
    if (type === 'pin') {
      const nonce = genNonce();
      authorization = { type: 'pin', pin: { nonce, encrypted_pin: encryptField(String(b.pin || ''), nonce) } };
    } else if (type === 'otp') {
      authorization = { type: 'otp', otp: { code: String(b.code || '') } };
    } else if (type === 'avs') {
      const addr = b.address || {};
      authorization = { type: 'avs', avs: { address: {
        city: addr.city || '', country: addr.country || '', line1: addr.line1 || '',
        line2: addr.line2 || '', postal_code: addr.postalCode || '', state: addr.state || '',
      } } };
    } else {
      return res.status(400).json({ error: 'Unsupported authorization type.' });
    }

    const r = await flwFetch(`/charges/${encodeURIComponent(chargeId)}`, { method: 'PUT', body: { authorization } });
    if (!r.ok) {
      console.error('Flutterwave charge authorization failed', r.data);
      return res.status(502).json({ error: 'Authorization step failed.' });
    }

    return res.status(200).json({ status: r.data.data.status, nextAction: r.data.data.next_action || null });
  } catch (e) {
    console.error(e);
    return res.status(503).json({ error: e.message || 'Unable to complete authorization.' });
  }
};
