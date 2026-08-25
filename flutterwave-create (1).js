const crypto = require('crypto');
const { serverClient, verifyUser } = require('./_utils');
const { flwFetch, genNonce, encryptField, ensureFlwCustomer } = require('./_flw');

// Fixed Pro price in each supported currency (mirrors js/plans.js).
const AMOUNTS = { NGN: 10000, USD: 10 };

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const user = await verifyUser(req);
    const db = serverClient();
    const appBaseUrl = process.env.APP_BASE_URL;
    if (!appBaseUrl) throw new Error('APP_BASE_URL is not configured.');

    const b = req.body || {};
    const currency = AMOUNTS[b.currency] ? b.currency : 'NGN';
    const amount = AMOUNTS[currency];
    const card = b.card || {};
    if (!card.number || !card.expiryMonth || !card.expiryYear || !card.cvv) {
      return res.status(400).json({ error: 'Card details are incomplete.' });
    }

    const customerId = await ensureFlwCustomer(db, user);

    // Encrypt the card fields (server-side — see the note in _flw.js).
    const nonce = genNonce();
    const pmRes = await flwFetch('/payment-methods', {
      method: 'POST',
      body: {
        type: 'card',
        card: {
          encrypted_card_number: encryptField(card.number, nonce),
          encrypted_expiry_month: encryptField(card.expiryMonth, nonce),
          encrypted_expiry_year: encryptField(card.expiryYear, nonce),
          encrypted_cvv: encryptField(card.cvv, nonce),
          nonce,
        },
      },
    });
    const paymentMethodId = pmRes.data?.data?.id;
    if (!pmRes.ok || !paymentMethodId) {
      console.error('Flutterwave payment-method creation failed', pmRes.data);
      return res.status(502).json({ error: 'Card could not be processed.' });
    }

    const reference = `WYPRO-${user.id}-${crypto.randomUUID()}`;
    const { error: insertError } = await db.from('subscriptions').insert({
      user_id: user.id, provider: 'flutterwave', status: 'pending', reference, amount, currency,
    });
    if (insertError) throw insertError;

    const chargeRes = await flwFetch('/charges', {
      method: 'POST',
      body: {
        reference,
        currency,
        amount,
        customer_id: customerId,
        payment_method_id: paymentMethodId,
        redirect_url: appBaseUrl,
      },
    });
    const chargeId = chargeRes.data?.data?.id;
    if (!chargeRes.ok || !chargeId) {
      console.error('Flutterwave charge creation failed', chargeRes.data);
      await db.from('subscriptions').update({ status: 'failed' }).eq('reference', reference).catch(() => {});
      return res.status(502).json({ error: 'Unable to start the payment.' });
    }

    await db.from('subscriptions').update({ transaction_id: chargeId }).eq('reference', reference).catch(() => {});

    return res.status(200).json({
      reference,
      chargeId,
      status: chargeRes.data.data.status,
      nextAction: chargeRes.data.data.next_action || null,
    });
  } catch (e) {
    console.error(e);
    return res.status(503).json({ error: e.message || 'Unable to start payment.' });
  }
};
