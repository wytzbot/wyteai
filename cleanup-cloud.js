// Vercel cron endpoint: /api/cleanup-cloud
// Add a Vercel Cron entry for this endpoint (e.g. daily).
// Required server env vars:
// FIREBASE_SERVICE_ACCOUNT_JSON = Firebase service account JSON
//
// Deletes expired WYTE AI temporary project metadata and screenshot files.
// This is server-side enforcement; browser timers are not trusted.

import { getAdmin } from "./_lib/firebaseAdmin.js";

export default async function handler(req,res){
  if(req.method!=="GET" && req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  // Vercel cron requests carry this header automatically; reject anything
  // else so this deletion endpoint can't be triggered by random visitors.
  if(process.env.CRON_SECRET && req.headers["x-vercel-cron"]===undefined && req.headers.authorization!==`Bearer ${process.env.CRON_SECRET}`){
    return res.status(401).json({error:"Unauthorized"});
  }
  try{
    const admin=getAdmin();
    const db=admin.firestore();
    const bucket=admin.storage().bucket();
    const snap=await db.collectionGroup("projects").get();
    let deleted=0;
    for(const d of snap.docs){
      const data=d.data();
      const expires=Date.parse(data.expiresAt||"");
      if(!expires || expires>Date.now())continue;
      const uid=data.uid;
      const projectId=data.projectId||d.id;
      try{await bucket.file(`users/${uid}/projects/${projectId}/screenshot`).delete({ignoreNotFound:true})}catch(e){}
      await d.ref.delete();
      deleted++;
    }
    return res.status(200).json({ok:true,deleted});
  }catch(e){
    console.error(e);
    return res.status(500).json({error:e.message||"Cleanup failed"});
  }
}
