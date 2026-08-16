// Vercel serverless function: /api/ai
// Environment variables required:
// GEMINI_API_KEY
// GROQ_API_KEY
// FLUX_API_KEY (optional; only needed for future creative image generation)
// FIREBASE_SERVICE_ACCOUNT_JSON (to verify who's calling and enforce quota)
//
// Keep all provider keys on Vercel. Do NOT put them in index.html.
//
// This route now requires a signed-in Firebase user (Authorization: Bearer
// <idToken>) and enforces a daily analysis quota per account, so it can't be
// called anonymously to burn through paid AI provider quota/cost.

import { getAdmin, requireUser } from "./_lib/firebaseAdmin.js";

const FREE_DAILY_LIMIT = 5;
const PRO_DAILY_LIMIT = 50;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const decoded = await requireUser(req);
    const uid = decoded.uid;

    const admin = getAdmin();
    const db = admin.firestore();
    const userSnap = await db.collection("users").doc(uid).get();
    const isPro = !!(userSnap.exists && userSnap.data().pro);
    const limit = isPro ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;

    const today = new Date().toISOString().slice(0, 10);
    const usageRef = db.collection("aiUsage").doc(`${uid}_${today}`);
    const allowed = await db.runTransaction(async (tx) => {
      const snap = await tx.get(usageRef);
      const count = snap.exists ? snap.data().count || 0 : 0;
      if (count >= limit) return false;
      tx.set(usageRef, { uid, date: today, count: count + 1 }, { merge: true });
      return true;
    });

    if (!allowed) {
      return res.status(429).json({
        error: `Daily AI analysis limit reached (${limit}/day on your plan).${isPro ? "" : " Upgrade to Pro for a higher limit."}`
      });
    }

    const { provider = "gemini", image, context = {} } = req.body || {};
    if (!image || typeof image !== "string") {
      return res.status(400).json({ error: "Screenshot image is required." });
    }

    if (provider === "gemini") {
      const key = process.env.GEMINI_API_KEY;
      if (!key) return res.status(500).json({ error: "GEMINI_API_KEY is not configured in Vercel." });

      const clean = image.replace(/^data:image\/[^;]+;base64,/, "");
      const mime = (image.match(/^data:(image\/[^;]+);base64,/) || [,"image/png"])[1];

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
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.6
            }
          })
        }
      );

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({
          error: data?.error?.message || "Gemini request failed."
        });
      }

      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!raw) return res.status(502).json({ error: "Gemini returned no analysis." });

      let suggestions;
      try { suggestions = JSON.parse(raw); }
      catch {
        const cleaned = raw.replace(/^```json\s*/i,"").replace(/```$/,"").trim();
        suggestions = JSON.parse(cleaned);
      }

      return res.status(200).json({ ok: true, provider: "gemini", suggestions });
    }

    if (provider === "groq") {
      const key = process.env.GROQ_API_KEY;
      if (!key) return res.status(500).json({ error: "GROQ_API_KEY is not configured in Vercel." });
      return res.status(501).json({
        error: "Groq is configured as an optional fallback, but this vision route is currently optimized for Gemini. Use Gemini for screenshot analysis."
      });
    }

    if (provider === "flux") {
      const key = process.env.FLUX_API_KEY;
      if (!key) return res.status(500).json({ error: "FLUX_API_KEY is not configured in Vercel." });
      return res.status(501).json({
        error: "FLUX is reserved for optional creative image generation. WYTE AI uses the user's real screenshot for store accuracy."
      });
    }

    return res.status(400).json({ error: "Unsupported AI provider." });
  } catch (error) {
    console.error("WYTE AI error:", error);
    return res.status(error.status || 500).json({ error: error.status ? error.message : "AI service failed. Check the Vercel function logs." });
  }
}
