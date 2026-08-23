const { verifyUser } = require("./_utils");
const { MODELS } = require("./ai-provider");

module.exports = async (req, res) => {
  if (req.method !== "GET") return res.status(405).json({error:"Method not allowed"});
  try {
    await verifyUser(req);
    return res.json({
      models: [
        {id:"auto", name:"Wyte Auto", tier:"free", description:"Automatically chooses a model for the prompt."},
        ...Object.values(MODELS).map(m => ({
          id:m.id, name:m.name, tier:m.tier, provider:m.provider, endpoint:m.endpoint
        }))
      ]
    });
  } catch(e) { return res.status(401).json({error:"Unauthorized"}); }
};
