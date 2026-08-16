// Vercel serverless function: /api/backup-project
//
// Replaces the old client-side flow that wrote straight to Firestore and
// Firebase Storage. Two reasons this moved server-side:
//  1. Firebase Storage now requires the paid Blaze plan just to enable it.
//     Vercel Blob has a real free tier and lives on the platform this app
//     is already deployed on, so screenshots go there instead.
//  2. The old flow trusted the client's local `proStatus` variable before
//     writing — anyone could've called the Firestore write directly from
//     devtools. This route re-checks Pro from Firestore itself.
//
// Backed-up projects expire after 20 days; /api/cleanup-cloud deletes both
// the Firestore metadata and the Blob file once expired. Nothing is kept
// indefinitely.
//
// Required env vars: FIREBASE_SERVICE_ACCOUNT_JSON, BLOB_READ_WRITE_TOKEN
// (BLOB_READ_WRITE_TOKEN is added automatically once you connect a Blob
// store to this project in the Vercel dashboard.)

import { put } from "@vercel/blob";
import { getAdmin, requireUser } from "./_lib/firebaseAdmin.js";

const TTL_DAYS = 20;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB safety cap

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const decoded = await requireUser(req);
    const uid = decoded.uid;
    const { project } = req.body || {};
    if (!project || typeof project !== "object" || project.id == null) {
      return res.status(400).json({ error: "A project is required." });
    }

    const admin = getAdmin();
    const db = admin.firestore();

    const userSnap = await db.collection("users").doc(uid).get();
    const isPro = !!(userSnap.exists && userSnap.data().pro);
    if (!isPro) return res.status(402).json({ error: "Cloud backup is a Pro feature." });

    const projectId = String(project.id);
    const expiresAt = new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000);

    let blobUrl = null;
    let blobPath = null;

    if (project.image && typeof project.image === "string") {
      const match = project.image.match(/^data:(image\/[^;]+);base64,(.+)$/);
      if (!match) return res.status(400).json({ error: "Screenshot image must be a base64 data URL." });
      const [, mime, b64] = match;
      const buffer = Buffer.from(b64, "base64");
      if (buffer.length > MAX_IMAGE_BYTES) {
        return res.status(413).json({ error: "Screenshot is too large to back up (8MB limit)." });
      }
      const ext = mime.split("/")[1] || "png";
      blobPath = `users/${uid}/projects/${projectId}/screenshot.${ext}`;
      const blob = await put(blobPath, buffer, {
        access: "public",
        contentType: mime,
        addRandomSuffix: false,
        allowOverwrite: true
      });
      blobUrl = blob.url;
    }

    const meta = {
      uid,
      projectId,
      name: project.name || "Untitled project",
      template: project.template,
      headline: project.headline,
      subtitle: project.subtitle,
      bg: project.bg,
      fg: project.fg,
      frame: project.frame,
      size: project.size,
      createdAt: project.createdAt || Date.now(),
      updatedAt: Date.now(),
      expiresAt: expiresAt.toISOString(),
      blobUrl,
      blobPath
    };

    await db.collection("users").doc(uid).collection("projects").doc(projectId).set(meta);

    return res.status(200).json({ ok: true, expiresAt: meta.expiresAt, blobUrl });
  } catch (e) {
    console.error("backup-project error:", e);
    return res.status(e.status || 500).json({ error: e.message || "Backup failed." });
  }
}
