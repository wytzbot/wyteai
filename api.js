// ---------------------------------------------------------------------------
// API client — mirrors lib/services.dart (CreditService) and
// lib/payments.dart (FlutterwavePayment). Talks to the same /api/* Vercel
// functions the Flutter app used; nothing on the backend changed.
// ---------------------------------------------------------------------------
import { supabase } from "./supabase-client.js";

const API_BASE = window.WYTE_CONFIG.API_BASE_URL || "";

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) throw new Error("Please sign in first.");
  return { Authorization: `Bearer ${session.access_token}` };
}

async function parseJson(res) {
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

export async function getCredits() {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/api/credits`, { headers });
  if (!res.ok) throw new Error("Unable to load credits.");
  return parseJson(res);
}

export async function generate({ prompt, model = "auto", mode = "standard", aspectRatio = "1:1" }) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ prompt, model, mode, aspectRatio }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.error || "Generation failed.");
  return data;
}

export async function startCheckout() {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/api/flutterwave-create`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ plan: "pro_monthly" }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.error || "Unable to start checkout.");
  const url = data.checkoutUrl;
  if (!url) throw new Error("Flutterwave did not return a checkout URL.");
  window.location.href = url;
}
