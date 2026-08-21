const { serverClient, verifyUser } = require('./_utils');
module.exports = async (req,res)=>{
  if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
  try{
    const user=await verifyUser(req); const id=String(req.query?.id||'');
    if(!id) return res.status(400).json({error:'Job id is required'});
    const {data,error}=await serverClient().from('generation_jobs').select('*').eq('id',id).eq('user_id',user.id).single();
    if(error || !data) return res.status(404).json({error:'Job not found'});
    return res.json(data);
  }catch(e){return res.status(401).json({error:'Unauthorized'});}
};
