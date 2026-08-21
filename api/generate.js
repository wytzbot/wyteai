const { serverClient, verifyUser } = require('./_utils');
const { generateImage } = require('./ai-provider');
const { persistRemoteImage } = require('./supabase-storage');
function cost(mode){ return ['hd','advanced-edit','character'].includes(mode)?2:mode==='batch4'?4:1; }
module.exports=async(req,res)=>{
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const db=serverClient(); let user=null, job=null, reserved=0, consumed=false;
  try{
    user=await verifyUser(req); const b=req.body||{};
    const prompt=String(b.prompt||'').trim(), model=b.model||'auto', mode=b.mode||'standard', aspectRatio=b.aspectRatio||'1:1';
    if(prompt.length<3) return res.status(400).json({error:'Prompt is required'});
    if(prompt.length>4000) return res.status(400).json({error:'Prompt is too long'});
    reserved=cost(mode);
    const {data:consume,error:ce}=await db.rpc('consume_credits',{p_user_id:user.id,p_cost:reserved});
    if(ce) {
      const msg=String(ce.message||'');
      if(msg.includes('PRO_REQUIRED')) return res.status(403).json({error:'Pro is required for this feature.'});
      if(msg.includes('CREDITS_EXHAUSTED')) return res.status(402).json({error:'No credits remaining.'});
      throw ce;
    }
    consumed=true;
    const {data:j,error:je}=await db.from('generation_jobs').insert({user_id:user.id,prompt,model,mode,aspect_ratio:aspectRatio,credits_used:reserved,status:'processing'}).select().single();
    if(je) throw je; job=j;
    const ai=await generateImage({prompt,model,aspectRatio,mode,imageUrl:b.imageUrl});
    const media=await persistRemoteImage(ai.sourceUrl,user.id,job.id);
    const {error:ue}=await db.from('generation_jobs').update({status:'completed',model:ai.model,provider:ai.provider,image_url:media.url,storage_path:media.path,completed_at:new Date().toISOString()}).eq('id',job.id);
    if(ue) throw ue;
    return res.json({jobId:job.id,status:'completed',imageUrl:media.url,model:ai.model,creditsUsed:reserved,creditsRemaining:consume?.credits});
  }catch(e){
    if(consumed && user){
      // refund_credits already atomically restores the free-tier counter or paid
      // balance server-side; do not also patch profiles manually here, or the
      // user is refunded twice for a single failed generation.
      await db.rpc('refund_credits',{p_user_id:user.id,p_cost:reserved}).catch(()=>{});
      if(job) await db.from('generation_jobs').update({status:'failed',error:String(e.message||e)}).eq('id',job.id).catch(()=>{});
    }
    console.error(e);
    const msg=String(e.message||e);
    if(msg==='FAL_KEY_NOT_CONFIGURED') return res.status(503).json({error:'AI provider is not configured.'});
    if(msg==='IMAGE_DOWNLOAD_FAILED') return res.status(502).json({error:'Could not save the generated image.'});
    return res.status(500).json({error:'Generation failed.'});
  }
};
