const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Flutterwave v4 (OAuth2 client-credentials + orchestrator/general flow).
// Replaces the old v3 static-secret-key Standard Checkout integration.
// ---------------------------------------------------------------------------

const IDP_URL = 'https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token';

let cachedToken = null; // { access_token, expiresAt } — reused across warm invocations

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 15000) return cachedToken.access_token;
  const clientId = process.env.FLW_CLIENT_ID;
  const clientSecret = process.env.FLW_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('FLW_CLIENT_ID/FLW_CLIENT_SECRET are not configured.');
  const r = await fetch(IDP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) throw new Error('FLW_AUTH_FAILED');
  cachedToken = { access_token: d.access_token, expiresAt: Date.now() + (Number(d.expires_in || 600) * 1000) };
  return cachedToken.access_token;
}

// Every request to Flutterwave's v4 API needs a fresh Bearer token, a unique
// X-Trace-Id, and (for anything non-idempotent-by-nature) a unique
// X-Idempotency-Key.
async function flwFetch(path, { method = 'GET', body } = {}) {
  const base = process.env.FLW_API_BASE;
  if (!base) throw new Error('FLW_API_BASE is not configured.');
  const token = await getAccessToken();
  const r = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Trace-Id': crypto.randomUUID(),
      'X-Idempotency-Key': crypto.randomUUID(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}

// A random 12-character nonce, required by Flutterwave alongside every
// encrypted field so they can validate the encryption on their end.
function genNonce() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 12; i++) s += chars[crypto.randomInt(chars.length)];
  return s;
}

// AES-256-GCM, matching Flutterwave's documented browser Web Crypto example
// byte-for-byte: key = base64-decoded encryption key, iv = the 12-char nonce
// (as raw UTF-8 bytes), output = base64(ciphertext || authTag).
//
// SECURITY NOTE: this runs SERVER-SIDE, deliberately. Flutterwave's own docs
// show this function running in the browser with the encryption key passed
// in as a plain argument — but that key is a static, symmetric account
// secret, and shipping it in client-side JS would expose it to anyone who
// opens dev tools (this exact mistake has been publicly exploited against
// other apps that hardcoded it in shipped frontend/APK code). Card details
// are sent from the browser to this server over HTTPS and encrypted here,
// immediately before being forwarded to Flutterwave; they are never logged
// or persisted in plaintext. This does mean the card number transits your
// own server in the clear for a moment, which carries real PCI-DSS
// implications — see AUTH_AND_DATA_SETUP.md before going live.
function encryptField(value, nonce) {
  const key = process.env.FLW_ENCRYPTION_KEY;
  if (!key) throw new Error('FLW_ENCRYPTION_KEY is not configured.');
  const keyBytes = Buffer.from(key, 'base64');
  const iv = Buffer.from(nonce, 'utf8');
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBytes, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([encrypted, authTag]).toString('base64');
}

// Looks up (or creates, on first use) this user's Flutterwave customer_id,
// caching it on their Supabase profile row so we don't recreate it every
// checkout attempt.
async function ensureFlwCustomer(db, user) {
  const { data: profile, error } = await db.from('profiles').select('flw_customer_id').eq('id', user.id).single();
  if (error) throw error;
  if (profile.flw_customer_id) return profile.flw_customer_id;

  const parts = String(user.name || user.email || 'Wyte User').trim().split(/\s+/);
  const res = await flwFetch('/customers', {
    method: 'POST',
    body: { email: user.email, name: { first: parts[0] || 'Wyte', last: parts.slice(1).join(' ') || 'User' } },
  });
  const customerId = res.data?.data?.id;
  if (!res.ok || !customerId) throw new Error('FLW_CUSTOMER_CREATE_FAILED');

  const { error: updateError } = await db.from('profiles').update({ flw_customer_id: customerId }).eq('id', user.id);
  if (updateError) throw updateError;
  return customerId;
}

module.exports = { flwFetch, genNonce, encryptField, ensureFlwCustomer };
