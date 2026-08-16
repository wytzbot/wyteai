// Vercel serverless function: /api/ai
// Environment variables required:
// GEMINI_API_KEY   — screenshot vision analysis (all signed-in users, quota-limited)
// GROQ_API_KEY     — fast copy-variation rewrites (Pro only)
// FAL_KEY          — fal.ai FLUX background generation (Pro only)
// FIREBASE_SERVICE_ACCOUNT_JSON (to verify who's calling and enforce quota)
//
// Keep all provider keys on Vercel. Do NOT put them in index.html.
//
// This route requires a signed-in Firebase user (Authorization: Bearer
// <idToken>). Groq and fal are gated to Pro accounts server-side (never
// trust a client-side "isPro" flag) and every provider has its own daily
// quota bucket, so this can't be hit anonymously or spammed to burn cost.

import { getAdmin, requireUser } from "./_lib/firebaseAdmin.js";

const LIMITS = {
  gemini: { free: 5, pro: 50, proOnly: false },
  groq: { free: 0, pro: 30, proOnly: true },
  fal: { free: 0, pro: 10, proOnly: true }
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const decoded = await requireUser(req);
    const uid = decoded.uid;

    const { provider = "gemini", image, context = {} } = req.body || {};
    const config = LIMITS[provider];
    if (!config) return res.status(400).json({ error: "Unsupported AI provider." });

    const admin = getAdmin();
    const db = admin.firestore();
    const userSnap = await db.collection("users").doc(uid).get();
    const isPro = !!(userSnap.exists && userSnap.data().pro);

    if (config.proOnly && !isPro) {
      return res.status(402).json({ error: "This feature is available on WYTE AI Pro. Upgrade to use it." });
    }

    const limit = isPro ? config.pro : config.free;
    const today = new Date().toISOString().slice(0, 10);
    const usageRef = db.collection("aiUsage").doc(`${uid}_${today}_${provider}`);
    const allowed = await db.runTransaction(async (tx) => {
      const snap = await tx.get(usageRef);
      const count = snap.exists ? snap.data().count || 0 : 0;
      if (count >= limit) return false;
      tx.set(usageRef, { uid, date: today, provider, count: count + 1 }, { merge: true });
      return true;
    });

    if (!allowed) {
      return res.status(429).json({
        error: `Daily limit reached for this feature (${limit}/day on your plan).${isPro ? "" : " Upgrade to Pro for access."}`
      });
    }

    if (provider === "gemini") {
      if (!image || typeof image !== "string") {
        return res.status(400).json({ error: "Screenshot image is required." });
      }
      return await runGemini(res, image, context);
    }

    if (provider === "groq") {
      return await runGroq(res, context);
    }

    if (provider === "fal") {
      return await runFal(res, context);
    }

    return res.status(400).json({ error: "Unsupported AI provider." });
  } catch (error) {
    console.error("WYTE AI error:", error);
    return res.status(error.status || 500).json({ error: error.status ? error.message : "AI service failed. Check the Vercel function logs." });
  }
}

async function runGemini(res, image, context) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: "GEMINI_API_KEY is not configured in Vercel." });

  const clean = image.replace(/^data:image\/[^;]+;base64,/, "");
  const mime = (image.match(/^data:(image\/[^;]+);base64,/) || [, "image/png"])[1];

  const prompt = `You are an expert App Store and Google Play screenshot designer.
Analyze the uploaded mobile-app screenshot. Do not invent features that are not visible.
Return ONLY valid JSON with:
{
 "headline": "short marketing headline, max 50 chars",
 "subtitle": "supporting subtitle, max 90 chars",
 "template": "minimal|dark|gradient|bold",
 "background": "#RRGGBB",
 "textColor": "#RRGGBB",
 "category": "likely app category",
 "audience": "likely target audience",
 "asoTip": "one practical ASO screenshot tip"
}
Make the headline benefit-focused, credible and suitable for a store listing.
Current context: ${JSON.stringify(context)}`;

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(key),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mime, data: clean } }
          ]
        }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.6 }
      })
    }
  );

  const data = await response.json();
  if (!response.ok) {
    return res.status(response.status).json({ error: data?.error?.message || "Gemini request failed." });
  }

  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return res.status(502).json({ error: "Gemini returned no analysis." });

  let suggestions;
  try { suggestions = JSON.parse(raw); }
  catch {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    suggestions = JSON.parse(cleaned);
  }

  return res.status(200).json({ ok: true, provider: "gemini", suggestions });
}

async function runGroq(res, context) {
  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(500).json({ error: "GROQ_API_KEY is not configured in Vercel." });

  const prompt = `You write short, benefit-focused App Store / Google Play screenshot copy.
Current headline: ${JSON.stringify(context.currentHeadline || "")}
Current subtitle: ${JSON.stringify(context.currentSubtitle || "")}
Template style: ${JSON.stringify(context.template || "")}
Write 3 distinct alternate headline+subtitle pairs. Headlines max 50 characters, subtitles max 90 characters. Do not invent app features not implied by the current copy.
Return ONLY valid JSON: {"variations":[{"headline":"...","subtitle":"..."},{"headline":"...","subtitle":"..."},{"headline":"...","subtitle":"..."}]}`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.8
    })
  });

  const data = await response.json();
  if (!response.ok) {
    return res.status(response.status).json({ error: data?.error?.message || "Groq request failed." });
  }

  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) return res.status(502).json({ error: "Groq returned no suggestions." });

  let parsed;
  try { parsed = JSON.parse(raw); }
  catch { return res.status(502).json({ error: "Groq returned an unexpected format." }); }

  const variations = Array.isArray(parsed.variations) ? parsed.variations.slice(0, 3) : [];
  return res.status(200).json({ ok: true, provider: "groq", variations });
}

async function runFal(res, context) {
  const key = process.env.FAL_KEY;
  if (!key) return res.status(500).json({ error: "FAL_KEY is not configured in Vercel." });

  const styleHint = {
    minimal: "clean minimalist, soft neutral gradient, lots of negative space",
    dark: "premium dark mode, deep navy/black gradient, subtle glow",
    gradient: "vibrant purple-to-blue gradient, energetic",
    bold: "bold saturated startup color block, confident"
  }[context.template] || "clean modern gradient";

  const prompt = `Abstract app-store marketing background, ${styleHint}, colors harmonizing with ${context.bg || "#f5f5f7"} and accents of ${context.fg || "#111827"}. Smooth, softly blurred, no text, no logos, no people, no UI elements, empty central negative space suitable for a phone screenshot mockup to sit on top of. High resolution, professional, not busy.`;

  const response = await fetch("https://fal.run/fal-ai/flux/schnell", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Key ${key}` },
    body: JSON.stringify({
      prompt,
      image_size: "portrait_16_9",
      num_images: 1
    })
  });

  const data = await response.json();
  if (!response.ok) {
    return res.status(response.status).json({ error: data?.detail || data?.error || "fal request failed." });
  }

  const imageUrl = data?.images?.[0]?.url;
  if (!imageUrl) return res.status(502).json({ error: "fal returned no image." });

  return res.status(200).json({ ok: true, provider: "fal", imageUrl });
}
