const { serverClient } = require("./_utils");

async function persistRemoteImage(sourceUrl,userId,jobId){
  const response=await fetch(sourceUrl);
  if(!response.ok) throw new Error("IMAGE_DOWNLOAD_FAILED");
  const bytes=Buffer.from(await response.arrayBuffer());
  const path=`${userId}/${jobId}.png`;
  const db=serverClient();
  const {error}=await db.storage.from("generated").upload(path,bytes,{
    contentType:"image/png",upsert:false
  });
  if(error) throw error;
  const {data,error:signError}=await db.storage.from("generated").createSignedUrl(path,60*60*24*30);
  if(signError) throw signError;
  return {url:data.signedUrl,path};
}
module.exports={persistRemoteImage};
