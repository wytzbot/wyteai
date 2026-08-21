const { serverClient, verifyUser } = require("./_utils");

module.exports = async (req,res)=>{
  if(req.method!=="GET") return res.status(405).json({error:"Method not allowed"});
  try {
    const user=await verifyUser(req);
    const db=serverClient();
    const {data,error}=await db.from("profiles").select("plan,credits,daily_free_used,daily_free_date").eq("id",user.id).single();
    if(error) throw error;
    return res.json({uid:user.id,plan:data.plan,credits:data.credits,dailyFreeLimit:5,monthlyProCredits:500});
  } catch(e) { return res.status(401).json({error:"Unauthorized"}); }
};
