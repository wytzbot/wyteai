// Vercel serverless function: /api/delete-cloud-project
// Deletes a user's own cloud-backed-up project: the Firestore metadata doc
// and, if present, its Vercel Blob screenshot file.
//
// Required env vars: FIREBASE_SERVICE_ACCOUNT_JSON, BLOB_READ_WRITE_TOKEN

import { del } from "@vercel/blob";
import { getAdmin, requireUser } from "./_lib/firebaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const decoded = await requireUser(req);
    const uid = decoded.uid;
    const { projectId } = req.body || {};
    if (!projectId) return res.status(400).json({ error: "A projectId is required." });

    const admin = getAdmin();
    const db = admin.firestore();
    const ref = db.collection("users").doc(uid).collection("projects").doc(String(projectId));
    const snap = await ref.get();

    if (snap.exists) {
      const data = snap.data();
      if (data.blobUrl) {
        try { await del(data.blobUrl); } catch (e) { /* already gone is fine */ }
      }
      await ref.delete();
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("delete-cloud-project error:", e);
    return res.status(e.status || 500).json({ error: e.message || "Delete failed." });
  }
}
