const crypto = require('crypto');
const { serverClient, verifyUser } = require('./_utils');

// Flutterwave's v4 hosted checkout/payment-link API is not available yet (as of
// this writing v4 only exposes the orchestrator/general charge endpoints, which
// require building a custom card/mobile-money/bank-transfer UI with PCI-sensitive
// field encryption). Until that ships, we use the well-documented, stable v3
// Standard payment flow to create a Flutterwave-hosted checkout page, and verify
// the resulting transaction with the same v3 secret key. See flutterwave-webhook.js.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const user = await verifyUser(req);
    const db = serverClient();
    const secretKey = process.env.FLW_SECRET_KEY;
    const appBaseUrl = process.env.APP_BASE_URL;
    if (!secretKey) throw new Error('FLW_SECRET_KEY is not configured.');
    if (!appBaseUrl) throw new Error('APP_BASE_URL is not configured.');

    const amount = 10000, currency = 'NGN';
    const reference = `WYPRO-${user.id}-${crypto.randomUUID()}`;

    const { error: insertError } = await db.from('subscriptions').insert({
      user_id: user.id, provider: 'flutterwave', status: 'pending', reference, amount, currency,
    });
    if (insertError) throw insertError;

    const r = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tx_ref: reference,
        amount,
        currency,
        redirect_url: appBaseUrl,
        customer: { email: user.email, name: user.name || user.email },
        customizations: { title: 'Wyte AI Pro', description: '500 monthly creative credits' },
      }),
    });
    const data = await r.json();
    const checkoutUrl = data?.data?.link;
    if (!r.ok || !checkoutUrl) {
      console.error('Flutterwave checkout creation failed', data);
      await db.from('subscriptions').update({ status: 'failed' }).eq('reference', reference).catch(() => {});
      throw new Error('Unable to create the Flutterwave checkout link.');
    }

    return res.status(200).json({ reference, amount, currency, checkoutUrl });
  } catch (e) {
    console.error(e);
    return res.status(503).json({ error: e.message || 'Unable to start payment.' });
  }
};
