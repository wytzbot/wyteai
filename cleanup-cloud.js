// Vercel cron endpoint: /api/cleanup-cloud
// Add a Vercel Cron entry for this endpoint (e.g. daily) — already set up
// in vercel.json.
// Required server env vars:
// FIREBASE_SERVICE_ACCOUNT_JSON, BLOB_READ_WRITE_TOKEN
//
// Deletes expired WYTE AI project metadata (Firestore) and screenshot
// files (Vercel Blob). Backups expire 20 days after they're made — nothing
// is kept indefinitely. This is server-side enforcement; browser timers
// are not trusted.

import { del } from "@vercel/blob";
import { getAdmin } from "./_lib/firebaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  // Vercel cron requests carry this header automatically; reject anything
  // else so this deletion endpoint can't be triggered by random visitors.
  if (process.env.CRON_SECRET && req.headers["x-vercel-cron"] === undefined && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const admin = getAdmin();
    const db = admin.firestore();
    const snap = await db.collectionGroup("projects").get();
    let deleted = 0;
    for (const d of snap.docs) {
      const data = d.data();
      const expires = Date.parse(data.expiresAt || "");
      if (!expires || expires > Date.now()) continue;
      if (data.blobUrl) {
        try { await del(data.blobUrl); } catch (e) { /* already gone is fine */ }
      }
      await d.ref.delete();
      deleted++;
    }
    return res.status(200).json({ ok: true, deleted });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Cleanup failed" });
  }
}
